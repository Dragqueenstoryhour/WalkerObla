import React, { useState, useRef, useEffect } from "react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio recording hook
  const {
    recordingDuration,
    audioUrl,
    startRecording: startMainRecording,
    stopRecording: stopMainRecording,
    audioBlob,
  } = useAudioRecording({
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    },
  });

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedPhrases.length - 1) {
      emblaApi.scrollNext();
    }
  };

  const goToPrevious = () => {
    if (emblaApi && currentCarouselIndex > 0) {
      emblaApi.scrollPrev();
    }
  };

  const goToSlide = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
    }
  };

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

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

      // Removed toast notification

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
      await startMainRecording();

      setProcessedPhrases(prev => prev.map((p, idx) => 
        idx === phraseIndex ? { ...p, status: "recording" } : p
      ));
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Stop phrase practice
  const stopPhrasePractice = async () => {
    try {
      await stopMainRecording();

      const currentPhrase = processedPhrases.find(p => p.status === "recording");
      if (!currentPhrase) return;

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

        setProcessedPhrases(prev => prev.map(p => 
          p.id === currentPhrase.id 
            ? { 
                ...p, 
                status: "complete", 
                assessmentResult,
                recordingBlob: audioBlob,
                recordingUrl: URL.createObjectURL(audioBlob)
              } 
            : p
        ));

        // Track completed phrases and low scores
        setCompletedPhrasesCount(prev => {
          const newCount = prev + 1;
          if (newCount === 8) {
            setShowFinalProgress(true);
          }
          return newCount;
        });

        if (assessmentResult.pronunciationScore < 80) {
          setLowScorePhrases(prev => [...prev, {
            ...currentPhrase,
            assessmentResult,
            recordingBlob: audioBlob,
            recordingUrl: URL.createObjectURL(audioBlob)
          }]);
        }
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle text-to-speech - MODIFIED
  const handleTextToSpeech = (phraseIndex: number, rate: number = 1) => {
    const phrase = processedPhrases[phraseIndex];
    if (!phrase) return;

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

      // Removed toast notification
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
        const audioBlob = new Blob(topicChunksRef.current, { type: 'audio/webm' });
        setTopicAudioBlob(audioBlob);
        setIsRecordingTopic(false);
        // Automatically process after stopping
        if (audioBlob) {
          await processTopicAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      // Stop recording after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);

    } catch (error) {
      console.error("Error starting topic recording:", error);
      toast({
        title: "Microphone Access Error",
        description: "Please grant microphone access to record your topic.",
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
    if (topicStreamRef.current) {
      topicStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecordingTopic(false);
  };

  // Function to process topic audio
  const processTopicAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/speech-to-text", { // Assuming this API endpoint exists
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe topic");
      }

      const result = await response.json();
      if (result.text) {
        setCustomTopic(result.text);
        setAiGenerateTopic(result.text);
        toast({
          title: "Topic Transcribed",
          description: "Your spoken topic has been converted to text.",
        });
        // Optionally generate phrases immediately after transcription
        handleGenerateTopicPhrases(result.text);
      } else {
        throw new Error("No text found in topic audio");
      }
    } catch (error) {
      console.error("Error processing topic audio:", error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe your topic. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false); // Ensure processing state is reset on error
    } finally {
      setIsProcessing(false);
    }
  };

  // Centralized function for topic speech-to-text, toggling between start and stop
  const handleTopicSpeechToText = () => {
    if (isRecordingTopic) {
      stopTopicRecording();
    } else {
      startTopicRecording();
    }
  };

  // Auto-load common phrases when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicPhrases("Common Phrases");
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Practice Phrases</h1>
        <DifficultyDropdown onConfirm={async (newDifficulty) => {
          setDifficulty(newDifficulty as any);
          await handleGenerateTopicPhrases(aiGenerateTopic, newDifficulty);
        }} />
      </div>

      {/* Input Methods */}
      <Tabs defaultValue="topic" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="topic">Example Topics</TabsTrigger>
          <TabsTrigger value="manual">Enter Text</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
        </TabsList>

        {/* Topic Selection */}
        <TabsContent value="topic" className="space-y-4">
          <div>
            <Label htmlFor="topic-input" className="text-base font-medium">
              Choose a topic or enter your own:
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="topic-input"
                value={customTopic || aiGenerateTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setAiGenerateTopic(e.target.value);
                }}
                placeholder="Enter a topic..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && (customTopic || aiGenerateTopic).trim()) {
                    handleGenerateTopicPhrases(customTopic || aiGenerateTopic);
                  }
                }}
              />
              <Button
                onClick={() => handleGenerateTopicPhrases(customTopic || aiGenerateTopic)}
                disabled={isGenerating || !(customTopic || aiGenerateTopic).trim()}
              >
                {isGenerating ? (
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={handleTopicSpeechToText} // This is where the function is called
                disabled={isRecordingTopic || isGenerating}
                className="px-3"
              >
                {isRecordingTopic ? (
                  <StopCircleIcon className="h-4 w-4" />
                ) : (
                  <MicIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isRecordingTopic && (
              <p className="text-sm text-muted-foreground mt-2">Recording... Speak your topic now (up to 5 seconds)</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Example Topics:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                "Common Phrases",
                "Restaurant Phrases",
                "Travel Phrases",
                "Business Phrases",
                "Medical Phrases",
                "Shopping Phrases",
                "Greeting Phrases",
                "Emergency Phrases",
                "School Phrases",
                "Technology Phrases",
                "Weather Phrases",
                "Time Expressions"
              ].map((topic) => (
                <Badge
                  key={topic}
                  className="cursor-pointer"
                  variant="outline"
                  onClick={() => {
                    setAiGenerateTopic(topic);
                    handleGenerateTopicPhrases(topic);
                  }}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Manual Text Entry */}
        <TabsContent value="manual" className="space-y-4">
          <div>
            <Label htmlFor="manual-text" className="text-base font-medium">
              Enter phrases (one per line):
            </Label>
            <Textarea
              id="manual-text"
              value={manualEntryText}
              onChange={(e) => setManualEntryText(e.target.value)}
              placeholder="Enter phrases here, one per line..."
              className="mt-2 min-h-[120px]"
            />
            <Button
              onClick={handleProcessManualText}
              disabled={isProcessing || !manualEntryText.trim()}
              className="mt-2"
            >
              {isProcessing ? (
                <RotateCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Process Phrases
            </Button>
          </div>
        </TabsContent>

        {/* File Upload */}
        <TabsContent value="upload" className="space-y-4">
          <div>
            <Label className="text-base font-medium">Upload Image or PDF:</Label>
            <div className="mt-2 space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {imageUploadText && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Extracted Text:</Label>
                  <Textarea
                    value={imageUploadText}
                    onChange={(e) => setImageUploadText(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <Button
                    onClick={handleProcessImageText}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <RotateCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Process Extracted Text
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Progress Indicator */}
      {processedPhrases.length > 0 && !showFinalProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm">{completedPhrasesCount}/8 phrases completed</span>
          </div>
          <Progress value={(completedPhrasesCount / 8) * 100} className="h-3" />
        </div>
      )}

      {/* Practice Phrases Section with Carousel */}
      {processedPhrases.length > 0 && !showFinalProgress && (
        <div id="practice-phrases-section" className="w-full max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Practice Phrases</h2>

          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {processedPhrases.map((phrase, idx) => (
                  <div key={phrase.id} className="flex-[0_0_100%] min-w-0">
                    <Card className="mx-4 transition-all">
                      <CardContent className="p-6">
                        {/* Idle state - show phrase and practice button */}
                        {phrase.status === "idle" && (
                          <div className="text-center space-y-6">
                            <div className="flex justify-between items-center mb-4">
                              <Button
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={goToNext}
                                disabled={currentCarouselIndex >= processedPhrases.length - 1}
                              >
                                Next <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                              <Button
                                className="bg-primary text-primary-foreground px-8 py-3"
                                onClick={() => startPhrasePractice(idx)}
                              >
                                <Mic className="h-5 w-5 mr-2" />
                                Practice
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-3xl font-bold text-center">{phrase.text}</h3>

                              {/* Audio controls - MODIFIED */}
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setSlowPlaybackPhrases(prev => ({ ...prev, [phrase.id]: false }));
                                    handleTextToSpeech(idx, 1); // Pass 1 for normal speed
                                  }}
                                >
                                  <Volume2 className="h-4 w-4 mr-1" />
                                  Normal
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setSlowPlaybackPhrases(prev => ({ ...prev, [phrase.id]: true }));
                                    handleTextToSpeech(idx, 0.6); // Pass 0.6 for 60% speed
                                  }}
                                >
                                  <Turtle className="h-4 w-4 mr-1" />
                                  Slow
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`border-yellow-500 text-yellow-600 hover:bg-yellow-50 ${
                                    savedPhraseId === phrase.id ? 'bg-yellow-100' : ''
                                  }`}
                                  onClick={() => handleSavePhrase(idx)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recording state */}
                        {phrase.status === "recording" && (
                          <div className="text-center space-y-6">
                            <h3 className="text-3xl font-bold">{phrase.text}</h3>
                            <div className="relative w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                              <Mic className="h-12 w-12 text-red-500" />
                            </div>
                            <p className="text-lg">Recording...</p>
                            <Button
                              className="bg-red-500 text-white hover:bg-red-600"
                              onClick={stopPhrasePractice}
                            >
                              <StopCircleIcon className="h-5 w-5 mr-2" />
                              Stop Recording
                            </Button>
                          </div>
                        )}

                        {/* Assessing state */}
                        {phrase.status === "assessing" && (
                          <div className="text-center space-y-6">
                            <h3 className="text-3xl font-bold">{phrase.text}</h3>
                            <div className="relative w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                              <RotateCw className="h-12 w-12 text-blue-500 animate-spin" />
                            </div>
                            <p className="text-lg">Analyzing your pronunciation...</p>
                          </div>
                        )}

                        {/* Complete state with results */}
                        {phrase.status === "complete" && phrase.assessmentResult && currentlyPracticing === phrase.id && (
                          <div className="space-y-6">
                            <h3 className="text-4xl font-bold text-center">{phrase.text}</h3>

                            {/* Audio controls - MODIFIED */}
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  handleTextToSpeech(idx, 1); // Pass 1 for normal speed
                                }}
                              >
                                <Volume2 className="h-4 w-4 mr-1" />
                                Normal
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  handleTextToSpeech(idx, 0.6); // Pass 0.6 for slow speed
                                }}
                              >
                                <Turtle className="h-4 w-4 mr-1" />
                                Slow
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                onClick={() => handleSavePhrase(idx)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Assessment Results */}
                            <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-6">
                              <h4 className="text-xl font-bold text-center text-[#264653] mb-4">
                                Your Performance
                              </h4>
                              <div
                                className="text-6xl font-bold text-center mb-4"
                                style={{
                                  color: phrase.assessmentResult.pronunciationScore >= 80 ? "#2a9d8f" : "#e76f51",
                                }}
                              >
                                {Math.round(phrase.assessmentResult.pronunciationScore)}%
                              </div>

                              {/* Detailed scores */}
                              <div className="space-y-3">
                                {[
                                  { label: "Pronunciation", score: phrase.assessmentResult.pronunciationScore },
                                  { label: "Fluency", score: phrase.assessmentResult.fluencyScore },
                                  { label: "Completeness", score: phrase.assessmentResult.completenessScore },
                                  { label: "Accuracy", score: phrase.assessmentResult.accuracyScore },
                                ].map(({ label, score }) => (
                                  <div key={label} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{label}</span>
                                      <span>{Math.round(score)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div
                                        className="h-2.5 rounded-full"
                                        style={{
                                          width: `${Math.round(score)}%`,
                                          backgroundColor: score >= 80 ? "#2a9d8f" : score >= 60 ? "#e9c46a" : "#e76f51",
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Recording playback */}
                              {phrase.recordingBlob && (
                                <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mt-4 flex items-center justify-between">
                                  <div className="text-sm font-medium text-[#264653]">
                                    Listen to your recording:
                                  </div>
                                  <button
                                    className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                                    onClick={() => {
                                      if (phrase.recordingBlob) {
                                        const audio = new Audio(URL.createObjectURL(phrase.recordingBlob));
                                        audio.play();
                                      }
                                    }}
                                  >
                                    <Volume2 className="h-5 w-5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-center gap-3">
                              <Button
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => startPhrasePractice(idx)}
                              >
                                Try Again
                              </Button>
                              <Button
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setCurrentlyPracticing(null);
                                  goToNext();
                                }}
                              >
                                Next <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentCarouselIndex === 0}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNext}
                disabled={currentCarouselIndex >= processedPhrases.length - 1}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Carousel dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {processedPhrases.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentCarouselIndex ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final Progress Summary */}
      {showFinalProgress && (
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">🎉 Fantastic Work!</h2>
            <p className="text-lg text-gray-600">You've completed all 8 practice phrases!</p>
          </div>

          {/* Progress Chart */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Your Progress</h3>
            <div className="space-y-4">
              {processedPhrases
                .filter(phrase => phrase.assessmentResult)
                .map((phrase, index) => (
                  <div key={phrase.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{phrase.text}</span>
                      <span>{Math.round(phrase.assessmentResult!.pronunciationScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.round(phrase.assessmentResult!.pronunciationScore)}%`,
                          backgroundColor: phrase.assessmentResult!.pronunciationScore >= 80 ? "#2a9d8f" : "#e76f51",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Phrases needing more practice */}
          {lowScorePhrases.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-center">Phrases to Practice More</h3>
              <p className="text-center text-gray-600 mb-4">
                These phrases scored less than 80% - give them another try!
              </p>
              <div className="grid grid-cols-1 gap-4">
                {lowScorePhrases.map((phrase, index) => (
                  <div key={`low-${index}`} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold">{phrase.text}</h4>
                      <span className="text-red-600 font-bold">
                        {Math.round(phrase.assessmentResult!.pronunciationScore)}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground"
                        onClick={() => {
                          const phraseIndex = processedPhrases.findIndex(p => p.text === phrase.text);
                          if (phraseIndex !== -1) {
                            goToSlide(phraseIndex);
                            setShowFinalProgress(false);
                            startPhrasePractice(phraseIndex);
                          }
                        }}
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        Practice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleSavePhrase(processedPhrases.findIndex(p => p.text === phrase.text))}
                      >
                        <Star className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Try new topic button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => {
                setShowFinalProgress(false);
                setCompletedPhrasesCount(0);
                setLowScorePhrases([]);
                handleGenerateTopicPhrases("Common Phrases");
              }}
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