import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MicIcon, StopCircleIcon, Volume2, Star, BookmarkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PronunciationAssessmentResult } from '@/lib/types';

interface PracticeSpeakingCardProps {
  text: string;
  onAssessmentReceived?: (assessment: PronunciationAssessmentResult) => void;
}

interface ProcessedPhrase {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: "idle" | "recording" | "assessing" | "complete";
}

export default function PracticeSpeakingCard({ text, onAssessmentReceived }: PracticeSpeakingCardProps) {
  const { toast } = useToast();
  const [phrase, setPhrase] = useState<ProcessedPhrase>({
    id: `practice-${Date.now()}`,
    text,
    status: "idle"
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start recording the phrase
  const startPhrasePractice = async () => {
    try {
      setPhrase(prev => ({ ...prev, status: "recording" }));
      chunksRef.current = [];

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Handle recording complete
      mediaRecorder.onstop = async () => {
        // Clean up the stream properly
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => track.stop());
          streamRef.current = null;
        }

        try {
          // Create audio blob
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

          // Process with Azure
          await processPhraseRecording(audioBlob);
        } catch (error) {
          console.error('Error processing phrase recording:', error);
          toast({
            title: 'Recording Error',
            description: 'Could not process the recording. Please try again.',
            variant: 'destructive'
          });
          setIsRecording(false);
          setIsProcessingRecording(false);
          setPhrase(prev => ({ ...prev, status: "idle" }));
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      toast({
        title: 'Recording Started',
        description: 'Say the text clearly',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access the microphone. Please check permissions.',
        variant: 'destructive'
      });
      setPhrase(prev => ({ ...prev, status: "idle" }));
    }
  };

  // Stop recording the phrase
  const stopPhrasePractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Process phrase recording with Azure
  const processPhraseRecording = async (audioBlob: Blob) => {
    setIsProcessingRecording(true);

    try {
      // Update status to assessing
      setPhrase(prev => ({ ...prev, status: "assessing" }));

      toast({
        title: "Processing Recording",
        description: "Analyzing your pronunciation...",
      });

      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", phrase.text);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      console.log("Received assessment results:", result);

      // Validate the result has expected properties
      if (typeof result.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      // Update with results
      setPhrase(prev => ({
        ...prev,
        status: "complete",
        assessmentResult: result,
        recordingBlob: audioBlob,
        recordingUrl,
      }));

      // Notify parent component
      if (onAssessmentReceived) {
        onAssessmentReceived(result);
      }

      toast({
        title: "Analysis Complete",
        description: `Pronunciation: ${result.pronunciationScore.toFixed(1)}%`,
      });
    } catch (error) {
      console.error("Error assessing pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      setPhrase(prev => ({ ...prev, status: "idle" }));
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">{phrase.text}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center gap-2">
          {phrase.status === "idle" && (
            <Button
              onClick={startPhrasePractice}
              className="flex items-center gap-2"
            >
              <MicIcon className="w-4 h-4" />
              Start Recording
            </Button>
          )}

          {phrase.status === "recording" && (
            <Button
              onClick={stopPhrasePractice}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <StopCircleIcon className="w-4 h-4" />
              Stop Recording
            </Button>
          )}

          {phrase.status === "assessing" && (
            <div className="flex items-center gap-2 text-yellow-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              Analyzing...
            </div>
          )}
        </div>

        {/* Assessment Results */}
        {phrase.status === "complete" && phrase.assessmentResult && (
          <div className="space-y-4">
            {/* Star Rating */}
            <div className="text-center">
              <div className="flex justify-center items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const scoreThreshold = star * 20;
                  const isFilled = phrase.assessmentResult!.pronunciationScore >= scoreThreshold;
                  return (
                    <Star
                      key={star}
                      className={`w-6 h-6 mx-1 ${
                        isFilled 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <div 
                className="text-4xl font-bold text-center mb-4" 
                style={{ 
                  color: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' 
                }}
              >
                {Math.round(phrase.assessmentResult.pronunciationScore)}%
              </div>
              <p className="text-center text-gray-600 mb-4">
                {phrase.assessmentResult.pronunciationScore >= 80
                  ? "Great job! Your pronunciation is very clear."
                  : "Good effort! Try again to improve your score."}
              </p>
            </div>

            {/* Detailed Scores */}
            <div className="space-y-3 mb-5">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Pronunciation</span>
                  <span>{Math.round(phrase.assessmentResult.pronunciationScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(phrase.assessmentResult.pronunciationScore)}%`,
                      backgroundColor: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' :
                                       phrase.assessmentResult.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fluency</span>
                  <span>{Math.round(phrase.assessmentResult.fluencyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(phrase.assessmentResult.fluencyScore)}%`,
                      backgroundColor: phrase.assessmentResult.fluencyScore >= 80 ? '#2a9d8f' :
                                      phrase.assessmentResult.fluencyScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Completeness</span>
                  <span>{Math.round(phrase.assessmentResult.completenessScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(phrase.assessmentResult.completenessScore)}%`,
                      backgroundColor: phrase.assessmentResult.completenessScore >= 80 ? '#2a9d8f' :
                                      phrase.assessmentResult.completenessScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Accuracy</span>
                  <span>{Math.round(phrase.assessmentResult.accuracyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.round(phrase.assessmentResult.accuracyScore)}%`,
                      backgroundColor: phrase.assessmentResult.accuracyScore >= 80 ? '#2a9d8f' :
                                      phrase.assessmentResult.accuracyScore >= 60 ? '#e9c46a' : '#e76f51'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-2">
              <Button 
                onClick={startPhrasePractice}
                size="sm"
              >
                <MicIcon className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            </div>

            {/* Playback recording section */}
            {phrase.recordingUrl && (
              <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
                <div className="text-sm font-medium text-[#264653]">
                  Listen to your recording:
                </div>
                <button
                  className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                  onClick={() => {
                    const audio = new Audio(phrase.recordingUrl as string);
                    audio.play();
                  }}
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}