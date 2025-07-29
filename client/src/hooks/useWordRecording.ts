import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { prepareAudioForSubmission } from '@/lib/audioUtils';
import { getApiUrl } from '@/lib/utils';

interface UseWordRecordingResult {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: (word: string, itemType: string) => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  audioBlob: Blob | null;
  recordingUrl: string | null;
  assessmentResult: any | null;
  error: Error | null;
}

const useWordRecording = (): UseWordRecordingResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [currentItemType, setCurrentItemType] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const processRecording = useCallback(async (recordedBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    if (!currentWord || !currentItemType) {
      setError(new Error('Word and item type not set for assessment.'));
      setIsProcessing(false);
      return;
    }

    try {
      // Prepare audio for submission (e.g., convert to WAV for server)
      const preparedAudioBlob = await prepareAudioForSubmission(recordedBlob);

      const formData = new FormData();
      formData.append("audio", preparedAudioBlob);
      formData.append("text", currentWord.trim());
      formData.append("itemType", currentItemType);
      formData.append("source", "feedback_panel"); // Or other relevant source

      const response = await fetch(getApiUrl("/api/pronunciation/assess"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assess pronunciation");
      }

      const result = await response.json();
      setAssessmentResult(result);
      toast({
        title: "Assessment Complete",
        description: `Score for "${currentWord}": ${Math.round(result.pronunciationScore)}%`,
      });
    } catch (err: any) {
      console.error("Error during assessment:", err);
      setError(err);
      toast({
        title: "Assessment Error",
        description: err.message || "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentWord, currentItemType, toast]);

  const startRecording = useCallback(async (word: string, itemType: string) => {
    setError(null);
    setAudioBlob(null);
    setRecordingUrl(null);
    setAssessmentResult(null);
    setCurrentWord(word);
    setCurrentItemType(itemType);
    chunksRef.current = [];

    try {
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        const recordedBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(recordedBlob);
        setAudioBlob(recordedBlob);
        setRecordingUrl(url);
        await processRecording(recordedBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: `Recording word: "${word}"`,
      });
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError(err);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [processRecording, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    setAudioBlob(null);
    setRecordingUrl(null);
    setAssessmentResult(null);
    setCurrentWord(null);
    setCurrentItemType(null);
    chunksRef.current = [];
    setError(null);
    toast({
      title: "Practice Cancelled",
      description: "Recording stopped",
    });
  }, [toast]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    audioBlob,
    recordingUrl,
    assessmentResult,
    error,
  };
};

export default useWordRecording;
