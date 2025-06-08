import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicIcon, StopCircleIcon, PlayIcon, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
import { PronunciationAssessmentResult } from '@/lib/types';

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
      formData.append("itemType", "reading");
      formData.append("source", "reader");
      if (contentId) {
        formData.append("contentId", contentId.toString());
      }

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const results = await response.json();
      console.log('Received assessment results:', results);

      // Validate the result has expected properties
      if (typeof results.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
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
      <CardContent className="p-6 pt-0"> {/* Removed top padding here to let content align */}
        {/* Title and "Record your speech..." line, aligned left at the top */}
        <h3 className="text-lg font-medium text-left mt-6 -ml-6 mb-2">Practice Speaking</h3> {/* Added negative left margin and margin-bottom */}
        <div className="flex items-center text-success text-left -ml-6 mb-4"> {/* Added negative left margin */}
          <CheckCircle className="w-5 h-5 mr-1" />
          <span>Record your speech to receive feedback</span>
        </div>

        <div className="bg-muted/40 rounded-lg p-4 mb-4">
          <p className="font-medium mb-2">Text to read:</p>
          <p className="text-lg">{referenceText}</p>
        </div>

        <div className="flex flex-col items-center space-y-4 mb-4">
          {!isRecording ? (
             <button
                onClick={startRecording}
                className={`relative flex items-center justify-center w-20 h-20 rounded-md p-4 cursor-pointer hover:bg-opacity-90 transition-all
                  ${buttonStatus === 'listening' ? 'bg-red-500' : buttonStatus === 'processing' ? 'bg-yellow-500' : 'bg-[#00C6AE]'}
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={
                  buttonStatus === 'listening'
                    ? 'Stop listening'
                    : buttonStatus === 'processing'
                    ? 'Processing'
                    : 'Start listening'
                }
                disabled={isProcessing}
              >
                <div className="relative w-full h-full">
                  {buttonStatus === 'processing' ? (
                    <span className="absolute inset-0 flex items-center justify-center text-4xl text-white animate-[flash_1s_infinite_ease-in-out]">
                      <MicIcon className="w-10 h-10" />
                    </span>
                  ) : (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center text-4xl text-white animate-[pulse_1.5s_infinite_ease-in-out] [text-shadow:0_0_20px_rgba(59,130,246,0.8)]">
                        <MicIcon className="w-10 h-10" />
                      </span>
                      {buttonStatus === 'listening' && (
                        <>
                          <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] opacity-0" />
                          <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:0.5s] opacity-0" />
                          <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:1s] opacity-0" />
                        </>
                      )}
                    </>
                  )}
                </div>
              </button>
          ) : (
            <button
              onClick={stopRecording}
              className="relative flex items-center justify-center w-20 h-20 rounded-md p-4 cursor-pointer hover:bg-opacity-90 transition-all bg-red-500"
              aria-label="Stop recording"
            >
              <div className="relative w-full h-full">
                <span className="absolute inset-0 flex items-center justify-center text-4xl text-white">
                  <StopCircleIcon className="w-10 h-10" />
                </span>
                <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-[wave_2s_infinite_ease-out] opacity-0" />
                <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:0.5s] opacity-0" />
                <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:1s] opacity-0" />
              </div>
            </button>
          )}

          {audioUrl && (
            <Button
              variant="outline"
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
              disabled={isRecording || isProcessing}
              className="flex-1 w-full"
            >
              <PlayIcon className="mr-2 h-4 w-4" />
              Play Recording
            </Button>
          )}
        </div>

        {assessmentResults && (
          <div className="bg-primary/10 rounded-lg p-4">
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