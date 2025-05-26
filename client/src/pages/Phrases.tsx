import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import useAudioRecording from "@/hooks/useAudioRecording";
import { PronunciationAssessmentResult } from "@/lib/types";
import {
  MicIcon,
  StopCircleIcon,
  VolumeIcon,
  RotateCw,
  Upload,
  CheckCircle,
  FileText,
  Image,
  AlertTriangle,
  Camera,
  Mic,
  Star,
  Volume2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { Turtle } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';

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

export default function Phrases() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const shareId = params.shareId;
  const { difficulty, setDifficulty } = useDifficulty();

  // State variables
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualEntryText, setManualEntryText] = useState("");
  const [imageUploadText, setImageUploadText] = useState("");
  const [aiGenerateTopic, setAiGenerateTopic] = useState("Common Phrases");
  const [customTopic, setCustomTopic] = useState("");
  const [isRecordingTopic, setIsRecordingTopic] = useState(false);
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [slowPlaybackPhrases, setSlowPlaybackPhrases] = useState<{ [key: string]: boolean }>({});
  const [shareableLink, setShareableLink] = useState("");
  const [savedPhraseId, setSavedPhraseId] = useState<string | null>(null);

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  // Progress tracking
  const [completedPhrasesCount, setCompletedPhrasesCount] = useState(0);
  const [showFinalProgress, setShowFinalProgress] = useState(false);
  const [lowScorePhrases, setLowScorePhrases] = useState<ProcessedPhrase[]>([]);

  // Refs for media recording
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio recording hook
  const {
    recordingDuration,
    audioUrl, // This audioUrl might be from the hook's internal state
    startRecording: startMainRecording,
    stopRecording: stopMainRecording,
    audioBlob,
    isRecording: isMicRecording,
  } = useAudioRecording({
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions. If this persists, try refreshing the page.",
        variant: "destructive",
      });
    },
  });

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedPhrases.length - 1) {
      emblaApi.scrollNext();
      setCurrentPhraseIndex(emblaApi.selectedScrollSnap() + 1); // Update current phrase index after carousel moves
    }
  };

  const goToPrevious = () => {
    if (emblaApi && currentCarouselIndex > 0) {
      emblaApi.scrollPrev();
      setCurrentPhraseIndex(emblaApi.selectedScrollSnap() - 1); // Update current phrase index after carousel moves
    }
  };

  const goToSlide = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setCurrentPhraseIndex(index); // Update current phrase index
    }
  };

  // Update carousel index and current phrase index when slide changes
  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        const newIndex = emblaApi.selectedScrollSnap();
        setCurrentCarouselIndex(newIndex);
        setCurrentPhraseIndex(newIndex); // Keep currentPhraseIndex in sync with carousel
      };
      emblaApi.on('select', onSelect);
      // Initial sync
      onSelect(); 
      return () => {
        emblaApi.off('select', onSelect);
      };
    }
  }, [emblaApi]);

  // Effect to manage audioRef.current.src for playback
  useEffect(() => {
    if (audioRef.current && currentPhraseIndex !== -1 && processedPhrases[currentPhraseIndex]) {
      const currentPhrase = processedPhrases[currentPhraseIndex];
      if (currentPhrase.recordingUrl && audioRef.current.src !== currentPhrase.recordingUrl) {
        audioRef.current.src = currentPhrase.recordingUrl;
        console.log(`Audio source set to: ${currentPhrase.recordingUrl}`);
      } else if (!currentPhrase.recordingUrl && audioRef.current.src !== "") {
        audioRef.current.src = ""; // Clear source if no recording for current phrase
        console.log("Audio source cleared (no recording for current phrase).");
      }
    }
  }, [currentPhraseIndex, processedPhrases]);

  // Auto-scroll to practice section after phrases are generated
  const scrollToPracticeSection = () => {
    setTimeout(() => {
      const practiceSection = document.getElementById('practice-phrases-section');
      if (practiceSection) {
        practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  };

  // Generate topic-based phrases
  const handleGenerateTopicPhrases = async (topic: string, targetDifficulty?: string) => {
    setIsGenerating(true);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-topic-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty: targetDifficulty || difficulty,
          generationType: "phrases",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate phrases");
      }

      const data = await response.json();
      const newPhrases: ProcessedPhrase[] = data.phrases.map((phrase: string, index: number) => ({
        id: `phrase-${Date.now()}-${index}`,
        text: phrase,
        status: "idle",
      }));

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0);
      setCompletedPhrasesCount(0);
      setShowFinalProgress(false);
      setLowScorePhrases([]);

      // Ensure carousel is reset to the first slide
      if (emblaApi) {
        emblaApi.scrollTo(0);
      }

      scrollToPracticeSection();
    } catch (error) {
      console.error("Error generating phrases:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsProcessing(false);
    }
  };

  // Handle manual text processing
  const handleProcessManualText = async () => {
    if (!manualEntryText.trim()) {
      toast({
        title: "No Text Provided",
        description: "Please enter phrases to process.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const lines = manualEntryText
        .split("\n")
        .filter((line) => line.trim().length > 0);

      const response = await fetch("/api/content/process-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrases: lines }),
      });

      if (!response.ok) {
        throw new Error("Failed to process phrases");
      }

      const processedData = await response.json();
      const newPhrases: ProcessedPhrase[] = processedData.phrases.map(
        (phrase: any, index: number) => ({
          id: `phrase-${Date.now()}-${index}`,
          text: phrase.text,
          phonetic: phrase.phonetic,
          difficulty: phrase.difficulty,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0);
      setCompletedPhrasesCount(0);
      setShowFinalProgress(false);
      setLowScorePhrases([]);

      toast({
        title: "Processing Complete",
        description: `${newPhrases.length} phrases are ready for practice.`,
      });

      if (emblaApi) {
        emblaApi.scrollTo(0);
      }

      scrollToPracticeSection();
    } catch (error) {
      console.error("Error processing phrases:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload and OCR
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/") || 
                   file.name.toLowerCase().endsWith(".heic") || 
                   file.name.toLowerCase().endsWith(".heif");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image (JPG, PNG, HEIC, etc.) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process file");
      }

      const result = await response.json();
      if (result.text) {
        setImageUploadText(result.text);
        toast({
          title: "Text Extracted",
          description: "Text successfully extracted from file. You can now process it.",
        });
      } else {
        throw new Error("No text found in the file");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Error",
        description: "Failed to extract text from file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process extracted image text
  const handleProcessImageText = async () => {
    if (!imageUploadText.trim()) {
      toast({
        title: "No Text Available",
        description: "Please upload an image or PDF first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const lines = imageUploadText
        .split("\n")
        .filter((line) => line.trim().length > 0);

      const response = await fetch("/api/content/process-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrases: lines }),
      });

      if (!response.ok) {
        throw new Error("Failed to process phrases");
      }

      const processedData = await response.json();
      const newPhrases: ProcessedPhrase[] = processedData.phrases.map(
        (phrase: any, index: number) => ({
          id: `phrase-${Date.now()}-${index}`,
          text: phrase.text,
          phonetic: phrase.phonetic,
          difficulty: phrase.difficulty,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0);
      setCompletedPhrasesCount(0);
      setShowFinalProgress(false);
      setLowScorePhrases([]);

      toast({
        title: "Processing Complete",
        description: `${newPhrases.length} phrases are ready for practice.`,
      });

      if (emblaApi) {
        emblaApi.scrollTo(0);
      }

      scrollToPracticeSection();
    } catch (error) {
      console.error("Error processing phrases:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start phrase practice
  const startPhrasePractice = async (phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) return;

    const phrase = processedPhrases[phraseIndex];
    setCurrentlyPracticing(phrase.id);

    try {
      // Clear the audioRef source before starting a new recording
      if (audioRef.current) {
        audioRef.current.src = "";
        audioRef.current.load(); // Reload the audio element to clear any old buffers
      }

      await startMainRecording();

      setProcessedPhrases(prev => prev.map((p, idx) => 
        idx === phraseIndex ? { ...p, status: "recording" } : p
      ));
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop phrase practice
  const stopPhrasePractice = async () => {
    try {
      await stopMainRecording();

      const currentPhrase = processedPhrases.find(p => p.status === "recording");
      if (!currentPhrase) {
        console.warn("No phrase found with status 'recording' when stopPhrasePractice was called.");
        return;
      }

      setProcessedPhrases(prev => prev.map(p => 
        p.id === currentPhrase.id ? { ...p, status: "assessing" } : p
      ));

      // Process the recording
      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("referenceText", currentPhrase.text);

        const response = await fetch("/api/pronunciation/assess", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to assess pronunciation");
        }

        const assessmentResult = await response.json();
        console.log("Received assessment results:", assessmentResult);

        // Revoke the old URL if it exists to free up memory
        const oldRecordingUrl = currentPhrase.recordingUrl;
        if (oldRecordingUrl) {
          URL.revokeObjectURL(oldRecordingUrl);
        }

        const newRecordingUrl = URL.createObjectURL(audioBlob);

        setProcessedPhrases(prev => prev.map(p => 
          p.id === currentPhrase.id 
            ? { 
                ...p, 
                status: "complete", 
                assessmentResult,
                recordingBlob: audioBlob,
                recordingUrl: newRecordingUrl // Use the newly created URL
              } 
            : p
        ));

        // Track completed phrases and low scores
        setCompletedPhrasesCount(prev => {
          const newCount = prev + 1;
          if (newCount === processedPhrases.length) { // Check against total phrases
            setShowFinalProgress(true);
          }
          return newCount;
        });

        if (assessmentResult.pronunciationScore < 80) {
          setLowScorePhrases(prev => [...prev, { ...currentPhrase, assessmentResult, recordingBlob: audioBlob, recordingUrl: newRecordingUrl }]);
        }
      } else {
        // If audioBlob is null, it means recording failed to produce audio
        toast({
          title: "Recording Failed",
          description: "No audio was captured. Please try again. Ensure microphone permissions are granted.",
          variant: "destructive",
        });
        setProcessedPhrases(prev => prev.map(p => p.id === currentPhrase.id ? { ...p, status: "idle" } : p ));
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });
      const currentPhrase = processedPhrases.find(p => p.status === "assessing");
      if (currentPhrase) {
        setProcessedPhrases(prev => prev.map(p => p.id === currentPhrase.id ? { ...p, status: "idle" } : p ));
      }
    }
  };

  // Handle recorded audio playback
  const handlePlayRecording = useCallback((phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (phrase && phrase.recordingUrl && audioRef.current) {
      // Set the audio source and play
      audioRef.current.src = phrase.recordingUrl;
      audioRef.current.play();
    } else {
      toast({
        title: "No Recording Available",
        description: "No recording found for this phrase. Please record it first.",
        variant: "info",
      });
    }
  }, [processedPhrases]); // Depend on processedPhrases so it re-renders when recordings are updated

  // Handle text-to-speech
  const handleTextToSpeech = (phraseIndex: number, rate: number = 1) => {
    const phrase = processedPhrases[phraseIndex];
    if (!phrase) return;
    // Stop any ongoing recorded audio playback before TTS
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const utterance = new SpeechSynthesisUtterance(phrase.text);
    utterance.rate = rate; // Use the passed rate
    speechSynthesis.speak(utterance);
  };

  // Save phrase to collection
  const handleSavePhrase = async (phraseIndex: number) => {
    if (!isAuthenticated) {
      setPendingSaveIndex(phraseIndex);
      setShowSignInDialog(true);
      return;
    }
    const phrase = processedPhrases[phraseIndex];
    if (!phrase) return;
    try {
      const response = await fetch("/api/phrases/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: phrase.text,
          phonetic: phrase.phonetic || null,
          difficulty: phrase.difficulty || null,
          assessmentResults: phrase.assessmentResult ? JSON.stringify(phrase.assessmentResult) : null,
          source: "phrases",
          sourceId: shareId || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save phrase");
      }
      setSavedPhraseId(phrase.id);
      setTimeout(() => setSavedPhraseId(null), 2000);
    } catch (error) {
      console.error("Error saving phrase:", error);
      toast({
        title: "Save Error",
        description: "Failed to save phrase. Please try again.",
        variant: "destructive",
      });
    }
  };

  // New state and ref for topic recording
  const [topicAudioBlob, setTopicAudioBlob] = useState<Blob | null>(null);
  const topicMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const topicStreamRef = useRef<MediaStream | null>(null);
  const topicChunksRef = useRef<Blob[]>([]);

  // Function to start topic speech-to-text recording
  const startTopicRecording = async () => {
    setIsRecordingTopic(true);
    topicChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      topicStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      topicMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        topicChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(topicChunksRef.current, { type: "audio/webm" });
        setTopicAudioBlob(audioBlob);
        setIsRecordingTopic(false);
        if (topicStreamRef.current) {
          topicStreamRef.current.getTracks().forEach(track => track.stop());
        }
        await processTopicAudio(audioBlob);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting topic recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone for topic recording. Please check your browser permissions.",
        variant: "destructive",
      });
      setIsRecordingTopic(false);
    }
  };

  // Function to stop topic speech-to-text recording
  const stopTopicRecording = () => {
    if (topicMediaRecorderRef.current && topicMediaRecorderRef.current.state === "recording") {
      topicMediaRecorderRef.current.stop();
    }
  };

  // Function to process topic audio
  const processTopicAudio = async (audioBlob: Blob) => {
    if (!audioBlob) {
      toast({
        title: "No Audio Captured",
        description: "Could not capture audio for topic recognition.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to recognize speech");
      }

      const result = await response.json();
      if (result.text) {
        setCustomTopic(result.text);
        toast({
          title: "Topic Recognized",
          description: `Recognized topic: "${result.text}"`,
        });
      } else {
        toast({
          title: "No Speech Recognized",
          description: "Could not recognize any speech. Please try again.",
          variant: "info",
        });
      }
    } catch (error) {
      console.error("Error processing topic audio:", error);
      toast({
        title: "Speech Recognition Error",
        description: "Failed to recognize speech for topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render a single phrase card
  const renderPhraseCard = (phrase: ProcessedPhrase, index: number) => {
    const isCurrent = index === currentCarouselIndex;
    const showScore = phrase.status === "complete" && phrase.assessmentResult;
    const isLowScore = showScore && phrase.assessmentResult!.pronunciationScore < 80;

    return (
      <Card
        key={phrase.id}
        className={`embla__slide p-6 border-2 transition-all duration-300 ${
          isCurrent ? "border-blue-500 shadow-lg" : "border-gray-200"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <p className="text-3xl font-bold text-center mb-4">
            {phrase.text}
          </p>
          {phrase.phonetic && (
            <p className="text-lg text-gray-500 font-mono">
              {phrase.phonetic}
            </p>
          )}

          {showScore && (
            <div className="flex flex-col items-center space-y-2">
              <Badge
                variant={isLowScore ? "destructive" : "default"}
                className="text-lg p-2"
              >
                Score: {phrase.assessmentResult!.pronunciationScore.toFixed(1)}%
              </Badge>
              {isLowScore && (
                <div className="text-red-500 text-sm flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Needs practice
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-4">
            {/* Play button for TTS */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleTextToSpeech(index)}
              disabled={isProcessing || isGenerating || isMicRecording}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
            {/* Play button for recorded audio */}
            {phrase.recordingUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePlayRecording(index)}
                disabled={isProcessing || isGenerating || isMicRecording}
              >
                <VolumeIcon className="h-5 w-5 text-purple-600" />
              </Button>
            )}

            {phrase.status === "idle" && (
              <Button
                size="lg"
                onClick={() => startPhrasePractice(index)}
                disabled={isProcessing || isGenerating || isMicRecording}
              >
                <MicIcon className="mr-2 h-5 w-5" /> Record
              </Button>
            )}

            {phrase.status === "recording" && (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopPhrasePractice}
                disabled={!isMicRecording}
              >
                <StopCircleIcon className="mr-2 h-5 w-5" /> Stop
              </Button>
            )}

            {phrase.status === "assessing" && (
              <Button size="lg" disabled>
                <RotateCw className="mr-2 h-5 w-5 animate-spin" /> Assessing...
              </Button>
            )}

            {phrase.status === "complete" && (
              <>
                <Button
                  size="lg"
                  onClick={() => startPhrasePractice(index)}
                  disabled={isProcessing || isGenerating || isMicRecording}
                >
                  <RotateCw className="mr-2 h-5 w-5" /> Re-record
                </Button>
                <Button
                  size="lg"
                  variant={savedPhraseId === phrase.id ? "success" : "default"}
                  onClick={() => handleSavePhrase(index)}
                  disabled={!isAuthenticated || savedPhraseId === phrase.id}
                >
                  <Star className="mr-2 h-5 w-5" />{" "}
                  {savedPhraseId === phrase.id ? "Saved!" : "Save"}
                </Button>
              </>
            )}
          </div>
          {/* Hidden audio element for playback */}
          <audio ref={audioRef} controls className="hidden"></audio>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center text-gray-900 dark:text-gray-100 mb-6">
        Practice Phrases
      </h1>

      {shareId && (
        <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Shared Phrases</DialogTitle>
              <DialogDescription>
                You're practicing phrases shared with you!
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center space-y-4">
              <Button
                variant="default"
                size="lg"
                onClick={() => setShowSharedDialog(false)}
              >
                Start Practicing
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Input Methods */}
      <Tabs defaultValue="ai-generate" className="w-full mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-generate">AI Generate</TabsTrigger>
          <TabsTrigger value="manual-entry">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload-file">Upload File</TabsTrigger>
        </TabsList>

        {/* AI Generate Tab */}
        <TabsContent value="ai-generate" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-grow w-full">
                  <Label htmlFor="ai-topic">Topic</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="ai-topic"
                      placeholder="e.g., Common Phrases, Travel, Food"
                      value={customTopic || aiGenerateTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      disabled={isRecordingTopic}
                    />
                    <Button
                      type="button"
                      onClick={isRecordingTopic ? stopTopicRecording : startTopicRecording}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled={isProcessing || isGenerating}
                    >
                      {isRecordingTopic ? <StopCircleIcon className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <DifficultyDropdown />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleGenerateTopicPhrases(customTopic || aiGenerateTopic)}
                disabled={isGenerating || isProcessing}
              >
                {isGenerating ? "Generating..." : "Generate Phrases"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual-entry" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Textarea
                placeholder="Enter phrases, one per line (e.g., 'Hello world', 'How are you?')"
                value={manualEntryText}
                onChange={(e) => setManualEntryText(e.target.value)}
                rows={6}
                disabled={isProcessing}
              />
              <Button
                className="w-full"
                onClick={handleProcessManualText}
                disabled={isProcessing || !manualEntryText.trim()}
              >
                {isProcessing ? "Processing..." : "Process Phrases"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload File Tab */}
        <TabsContent value="upload-file" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Image or PDF
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*, application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isProcessing}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
              {imageUploadText && (
                <Textarea
                  placeholder="Extracted text will appear here..."
                  value={imageUploadText}
                  onChange={(e) => setImageUploadText(e.target.value)}
                  rows={6}
                  readOnly
                  className="mt-4 bg-gray-50 dark:bg-gray-800"
                />
              )}
              <Button
                className="w-full"
                onClick={handleProcessImageText}
                disabled={isProcessing || !imageUploadText.trim()}
              >
                {isProcessing ? "Processing..." : "Process Extracted Text"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Practice Section */}
      {processedPhrases.length > 0 && (
        <div id="practice-phrases-section" className="mt-8">
          <h2 className="text-3xl font-bold text-center mb-6">
            Practice Your Phrases
          </h2>

          <div className="relative">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container">
                {processedPhrases.map(renderPhraseCard)}
              </div>
            </div>
            {processedPhrases.length > 1 && (
              <>
                <Button
                  onClick={goToPrevious}
                  disabled={!emblaApi || currentCarouselIndex === 0 || isProcessing || isGenerating || isMicRecording}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg"
                  variant="outline"
                  size="icon"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={!emblaApi || currentCarouselIndex === processedPhrases.length - 1 || isProcessing || isGenerating || isMicRecording}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg"
                  variant="outline"
                  size="icon"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-center items-center mt-4 space-x-2">
            {processedPhrases.map((_, index) => (
              <Button
                key={index}
                variant={index === currentCarouselIndex ? "default" : "outline"}
                size="icon"
                onClick={() => goToSlide(index)}
                className="w-8 h-8 rounded-full"
                disabled={isProcessing || isGenerating || isMicRecording}
              >
                {index + 1}
              </Button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Progress value={(completedPhrasesCount / processedPhrases.length) * 100} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">
              {completedPhrasesCount} of {processedPhrases.length} phrases completed
            </p>
          </div>

          {showFinalProgress && lowScorePhrases.length > 0 && (
            <Card className="mt-8 p-6">
              <h3 className="text-2xl font-bold text-center mb-4">
                Phrases to Re-practice
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowScorePhrases.map((phrase) => (
                  <div
                    key={phrase.id}
                    className="flex items-center justify-between p-4 border rounded-lg shadow-sm"
                  >
                    <span className="font-medium">{phrase.text}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive" className="text-md">
                        Score: {phrase.assessmentResult!.pronunciationScore.toFixed(1)}%
                      </Badge>
                      <Button
                        size="icon"
                        onClick={() => {
                          const originalIndex = processedPhrases.findIndex(p => p.id === phrase.id);
                          if (originalIndex !== -1) {
                            goToSlide(originalIndex);
                          }
                        }}
                        disabled={isProcessing || isGenerating || isMicRecording}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Try new topic button */}
          <div className="text-center mt-8">
            <Button
              size="lg"
              onClick={() => {
                setShowFinalProgress(false);
                setCompletedPhrasesCount(0);
                setLowScorePhrases([]);
                handleGenerateTopicPhrases("Common Phrases");
              }}
              disabled={isProcessing || isGenerating || isMicRecording}
            >
              Practice New Phrases
            </Button>
          </div>
        </div>
      )}

      {/* Sign in dialog for saving phrases */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign in to Save Phrases</DialogTitle>
            <DialogDescription>
              Sign in to save this phrase to your collection and practice it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center space-y-4">
            <Button 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              variant="default"
              size="lg"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign in to Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}