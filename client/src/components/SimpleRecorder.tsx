import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicIcon, StopCircleIcon, PlayIcon, CheckCircle, Mic, RotateCw, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
import { PronunciationAssessmentResult } from '@/lib/types';
import { getAuthHeaders } from '@/lib/supabaseClient';

interface SimpleRecorderProps {
  referenceText: string;
  contentId?: number;
  onTranscriptReceived?: (transcript: string) => void;
  onAssessmentReceived?: (assessment: PronunciationAssessmentResult) => void;
}

export function SimpleRecorder({
  referenceText,
  contentId,
  onTranscriptReceived,
  onAssessmentReceived
}: SimpleRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<PronunciationAssessmentResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setTranscript('');
      setAudioUrl(null);
      setRecordingTime(0);
      setAssessmentResults(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Media recorder stopped');

        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => {
            console.log(`Stopping track: ${track.kind}`);
            track.stop();
          });
          streamRef.current = null;
        }

        try {
          const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log(`Created audio blob: ${originalBlob.size} bytes, type: ${originalBlob.type}`);

          const url = URL.createObjectURL(originalBlob);
          setAudioUrl(url);

          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await originalBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const wavBlob = await convertToWav(audioBuffer, audioContext);
            console.log(`Converted to WAV format: ${wavBlob.size} bytes`);

            await processRecording(wavBlob);
          } catch (conversionError) {
            console.warn('Audio conversion failed, trying with original format:', conversionError);
            await processRecording(originalBlob);
          }
        } catch (error) {
          console.error('Error processing recording:', error);
        }

        setIsRecording(false);
      };

      console.log('Starting media recorder');
      mediaRecorder.start(100);
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your speech.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Calling stop() on media recorder');
      mediaRecorderRef.current.stop();
    } else {
      console.log('Media recorder was not active');
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Validate reference text
      if (!referenceText || referenceText.trim() === '') {
        console.error('Invalid reference text:', referenceText);
        throw new Error('No text available for assessment');
      }

      console.log(`Processing recording with text: "${referenceText}"`);



      // Send to Azure Speech for assessment using the same pattern as phrases
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", referenceText.trim());
      formData.append("itemType", "word");  // Changed from "reading" to "word" for assignment practice
      formData.append("source", "assignment");  // Changed from "reader" to "assignment"
      if (contentId) {
        formData.append("contentId", contentId.toString());
      }

      console.log(`🎯 Sending assessment request:`, {
        text: referenceText.trim(),
        itemType: "word",
        source: "assignment",
        contentId
      });

      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const responseData = await response.json();
      console.log('📊 Raw API response:', responseData);

      // Handle both direct response and wrapped response formats
      let results = responseData;
      if (responseData.data && typeof responseData.data === 'object') {
        results = responseData.data;
        console.log('📊 Extracted results from .data:', results);
      }

      console.log('📊 Final assessment results:', results);

      // Validate the result has expected properties
      if (typeof results.pronunciationScore !== "number") {
        console.error('❌ Assessment validation failed:', {
          receivedType: typeof results.pronunciationScore,
          receivedValue: results.pronunciationScore,
          fullResults: results
        });
        throw new Error(`Invalid assessment result format - pronunciationScore is ${typeof results.pronunciationScore}, expected number`);
      }

      setAssessmentResults(results);

      if (onAssessmentReceived) {
        onAssessmentReceived(results);
      }

      toast({
        title: "Analysis Complete",
        description: `Pronunciation: ${results.pronunciationScore.toFixed(1)}%`,
      });

    } catch (error) {
      console.error('Error assessing pronunciation:', error);
      toast({
        title: "Assessment Failed",
        description: "Failed to process your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const convertToWav = async (audioBuffer: AudioBuffer, audioContext: AudioContext): Promise<Blob> => {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2;
    const bitsPerSample = bytesPerSample * 8;

    const pcmData = audioBuffer.getChannelData(0);

    const blockAlign = numOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonStatus = isRecording ? 'listening' : isProcessing ? 'processing' : 'idle';

  return (
      <CardContent className="p-6 pt-0">

        <div className="flex flex-col items-center space-y-4 mb-4">
          {!isRecording && !assessmentResults ? (
            <Button
              onClick={startRecording}
              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 start-recording-button"
              disabled={isProcessing}
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          ) : isRecording ? (
            <Button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white border-0"
            >
              <StopCircleIcon className="h-5 w-5" />
              Stop Recording
            </Button>
          ) : null}

          {assessmentResults && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAssessmentResults(null);
                  setAudioUrl(null);
                  startRecording();
                }}
                className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
              >
                <RotateCw className="h-5 w-5" />
                Try Again
              </Button>
              {audioUrl && (
                <Button
                  onClick={async () => {
                    try {
                      const audioPlayer = new Audio(audioUrl);
                      audioPlayer.onerror = (e) => {
                        console.error('Audio playback error:', e);
                      };
                      await audioPlayer.play();
                    } catch (error) {
                      console.error('Error playing audio:', error);
                    }
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                >
                  <Volume2 className="h-4 w-4" />
                  Listen to Me
                </Button>
              )}
            </div>
          )}
        </div>

        {assessmentResults && (
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h4 className="font-semibold mb-4">Speech Assessment Results:</h4>
            <div className="text-4xl font-bold text-center mb-4" style={{ color: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' }}>
              {Math.round(assessmentResults.pronunciationScore)}%
            </div>
            <p className="text-center text-gray-600 mb-4">
              {assessmentResults.pronunciationScore >= 80
                ? "Great job! Your pronunciation is very clear."
                : "Good effort! Try again to improve your score."}
            </p>

            <div className="space-y-3 mb-5">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">Pronunciation</span>
                  <span className="text-white">{Math.round(assessmentResults.pronunciationScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(assessmentResults.pronunciationScore)}%`,
                      backgroundColor: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' :
                                       assessmentResults.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">Fluency</span>
                  <span className="text-white">{Math.round(assessmentResults.fluencyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(assessmentResults.fluencyScore)}%`,
                      backgroundColor: assessmentResults.fluencyScore >= 80 ? '#2a9d8f' :
                                      assessmentResults.fluencyScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">Completeness</span>
                  <span className="text-white">{Math.round(assessmentResults.completenessScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(assessmentResults.completenessScore)}%`,
                      backgroundColor: assessmentResults.completenessScore >= 80 ? '#2a9d8f' :
                                      assessmentResults.completenessScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">Accuracy</span>
                  <span className="text-white">{Math.round(assessmentResults.accuracyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(assessmentResults.accuracyScore)}%`,
                      backgroundColor: assessmentResults.accuracyScore >= 80 ? '#2a9d8f' :
                                      assessmentResults.accuracyScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {assessmentResults.wordLevelResults && assessmentResults.wordLevelResults.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Word-by-word analysis:</p>
                <div className="bg-muted/30 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                  {assessmentResults.wordLevelResults.map((word: any, i: number) => (
                    <span
                      key={i}
                      className={`inline-block mr-2 mb-1 px-1 rounded ${
                        word.accuracyScore > 80
                          ? 'bg-green-100 text-green-800'
                          : word.accuracyScore > 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {word.word} ({word.accuracyScore.toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Processing assessment...</span>
          </div>
        )}
      </CardContent>
  );
}

const styles = `
@keyframes pulse {
  0% {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
  50% {
    transform: scale(1.2);
    text-shadow: 0 0 40px rgba(59, 130, 246, 1);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
}

@keyframes wave {
  0% {
    transform: scale(0.5);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes flash {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default SimpleRecorder;