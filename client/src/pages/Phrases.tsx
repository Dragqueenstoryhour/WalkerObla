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
import { AuthButtons } from "@/components/AuthButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PronunciationAssessmentResult } from "@/lib/types";
import {
  MicIcon,
  StopCircleIcon,
  VolumeIcon,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Share2,
  Award,
  Users,
  Mic,
  Star,
  Volume2,
  Gauge,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Snail,
  Flag,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { SummaryCard } from "@/components/SummaryCard";
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
  const [aiGenerateTopic, setAiGenerateTopic] = useState("Common Phrases");
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedPhraseId, setSavedPhraseId] = useState<string | null>(null);
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [phraseAssessmentResult, setPhraseAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackPhrases, setSlowPlaybackPhrases] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1
  });

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Handle finishing practice and showing summary
  const handleFinishPractice = () => {
    setShowSummary(true);
    // Add summary card to the carousel by scrolling to the last position
    setTimeout(() => {
      if (emblaApi) {
        emblaApi.scrollTo(processedPhrases.length);
      }
    }, 100);
  };

  // Reset practice session
  const handleRestartPractice = () => {
    setShowSummary(false);
    setProcessedPhrases([]);
    setCurrentCarouselIndex(0);
    setCurrentlyPracticing(null);
    setPhraseAssessmentResult(null);
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
  const handleGenerateTopicPhrases = async (topic: string, customDifficulty?: string) => {
    if (!topic.trim()) {
      toast({
        title: "No Topic Provided",
        description: "Please enter a topic to generate phrases.",
        variant: "destructive",
      });
      return;
    }

    const difficultyToUse = customDifficulty || difficulty;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-topic-phrases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          topic, 
          difficulty: difficultyToUse,
          type: "phrases"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate phrases");
      }

      const result = await response.json();

      const newPhrases: ProcessedPhrase[] = result.phrases.map(
        (text: string, index: number) => ({
          id: `phrase-${Date.now()}-topic-${index}`,
          text,
          status: "idle",
        }),
      );

      setProcessedPhrases(newPhrases);
      setCurrentPhraseIndex(0);
      scrollToPracticeSection();
    } catch (error) {
      console.error("Error generating phrases:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate phrases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording for an individual phrase practice
  const startPhrasePractice = async (phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) return;

    try {
      const phrase = processedPhrases[phraseIndex];
      setCurrentlyPracticing(phrase.id);
      setCurrentPhraseIndex(phraseIndex);
      setPhraseAssessmentResult(null);
      chunksRef.current = [];

      // Update the phrase status to recording
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "recording" } : p,
        ),
      );

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
          tracks.forEach((track) => track.stop());
          streamRef.current = null;
        }

        try {
          // Create audio blob
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          // Process the phrase recording
          await processPhraseRecording(audioBlob, phraseIndex);
        } catch (error) {
          console.error("Error processing phrase recording:", error);
          toast({
            title: "Recording Error",
            description: "Could not process the recording. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          setIsProcessingRecording(false);

          // Reset phrase status
          setProcessedPhrases((phrases) =>
            phrases.map((p, idx) =>
              idx === phraseIndex ? { ...p, status: "idle" } : p,
            ),
          );
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);

      // Reset phrase status
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "idle" } : p,
        ),
      );
    }
  };

  // Stop recording the phrase
  const stopPhrasePractice = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Process phrase recording with Azure
  const processPhraseRecording = async (audioBlob: Blob, phraseIndex: number) => {
    setIsProcessingRecording(true);

    try {
      const phrase = processedPhrases[phraseIndex];

      // Validate phrase data
      if (!phrase || !phrase.text || phrase.text.trim() === '') {
        console.error('Invalid phrase data:', phrase);
        throw new Error('No phrase text available for assessment');
      }

      console.log('Processing phrase:', phrase.text);

      // Update status to assessing
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "assessing" } : p,
        ),
      );

      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", phrase.text.trim());
      formData.append("itemType", "phrase");
      formData.append("source", "phrases");

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
      setPhraseAssessmentResult(result);

      // Update in the phrases array
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex
            ? {
                ...p,
                status: "complete",
                assessmentResult: result,
                recordingBlob: audioBlob,
                recordingUrl,
              }
            : p,
        ),
      );


    } catch (error) {
      console.error("Error assessing phrase pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "idle" } : p,
        ),
      );
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Cancel phrase practice
  const cancelPhrasePractice = (phraseIndex: number) => {
    // Stop any ongoing recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Make sure we clean up streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setCurrentlyPracticing(null);

    // Reset phrase status
    setProcessedPhrases((phrases) =>
      phrases.map((p, idx) =>
        idx === phraseIndex ? { ...p, status: "idle" } : p,
      ),
    );

    toast({
      title: "Practice Cancelled",
      description: "Recording stopped",
    });
  };

  // Handle text-to-speech
  const handleTextToSpeech = async (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (!phrase?.text) {
      toast({
        title: "No Text",
        description: "No text available for this phrase.",
        variant: "destructive",
      });
      return;
    }

    const loadingToast = toast({
      title: "Loading Audio",
      description: "Preparing text-to-speech...",
    });

    const isSlowPlayback = slowPlaybackPhrases[phrase.id] || false;
    const speed = isSlowPlayback ? 0.6 : 1.0; // Snail mode at 60% speed

    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: phrase.text,
          voice: "alloy",
          speed: speed
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to synthesize speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Received empty audio data");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = () => {
        toast({
          title: "Playback Error",
          description: "Could not play the audio. Please try again.",
          variant: "destructive",
        });
        URL.revokeObjectURL(audioUrl);
      };

      audio.oncanplaythrough = () => {
        loadingToast.dismiss?.();
        audio.play().then(() => {
          toast({
            title: isSlowPlayback ? "Playing Slowly" : "Playing",
            description: `Playing: "${phrase.text.substring(0, 20)}${phrase.text.length > 20 ? "..." : ""}"`,
          });
        }).catch((error) => {
          toast({
            title: "Playback Error",
            description: "Could not play the audio. Please try again.",
            variant: "destructive",
          });
          URL.revokeObjectURL(audioUrl);
        });
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.src = audioUrl;
    } catch (error) {
      loadingToast.dismiss?.();
      toast({
        title: "TTS Error",
        description: error instanceof Error ? error.message : "Could not generate audio.",
        variant: "destructive",
      });
    }
  };

  // Play back user's recording
  const playUserRecording = (phraseIndex: number) => {
    const phrase = processedPhrases[phraseIndex];
    if (!phrase?.recordingUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = new Audio(phrase.recordingUrl);
    audioRef.current.play().catch(error => {
      console.error("Error playing recording:", error);
      toast({
        title: "Playback Error",
        description: "Could not play your recording.",
        variant: "destructive",
      });
    });
  };

  // Toggle slow playback
  const toggleSlowPlayback = (phraseId: string) => {
    setSlowPlaybackPhrases(prev => ({
      ...prev,
      [phraseId]: !prev[phraseId]
    }));
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

      toast({
        title: "Phrase Saved",
        description: "Added to your collection",
      });
    } catch (error) {
      console.error("Error saving phrase:", error);
      toast({
        title: "Save Error",
        description: "Failed to save phrase. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-load common phrases when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicPhrases("Common Phrases");
    }

    // Cleanup function
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Load shared phrases if shareId is present
  useEffect(() => {
    const loadSharedPhrases = async () => {
      if (!shareId) return;

      setIsProcessing(true);

      try {
        const response = await fetch(`/api/share/${shareId}`);

        if (!response.ok) {
          throw new Error("Failed to load shared phrases");
        }

        const data = await response.json();
        if (!data.collection || !data.collection.phrases) {
          throw new Error("Invalid shared phrases data");
        }

        let phrasesData;
        try {
          phrasesData =
            typeof data.collection.phrases === "string"
              ? JSON.parse(data.collection.phrases)
              : data.collection.phrases;

          if (!Array.isArray(phrasesData)) {
            phrasesData = [phrasesData];
          }
        } catch (parseError) {
          console.error("Error parsing phrases data:", parseError);
          throw new Error("Invalid shared phrases format");
        }

        const newPhrases: ProcessedPhrase[] = phrasesData.map(
          (phrase: any, index: number) => ({
            id: `shared-${Date.now()}-${index}`,
            text: phrase.text || "",
            phonetic: phrase.phonetic || undefined,
            difficulty: phrase.difficulty || undefined,
            status: "idle",
          }),
        );

        if (newPhrases.length > 0) {
          console.log("Loaded shared phrases:", newPhrases);
          setProcessedPhrases(newPhrases);
          setCurrentPhraseIndex(0);
          setShowSharedDialog(true);

          toast({
            title: "Shared Phrases Loaded",
            description: `Loaded ${newPhrases.length} shared phrases for practice.`,
          });
        } else {
          throw new Error("No phrases found in this shared collection");
        }
      } catch (error) {
        console.error("Error loading shared phrases:", error);
        toast({
          title: "Error Loading Shared Phrases",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load shared phrases",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    loadSharedPhrases();
  }, [shareId, toast]);

  // Auto-load commonly used phrases when the page opens
  useEffect(() => {
    // Only if we're not loading shared phrases
    if (!shareId) {
      handleGenerateTopicPhrases("Common Phrases");
    }

    // Cleanup function to handle any lingering recording sessions
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array to run once on mount

  const topicOptions = [
    "Common Phrases",
    "Greetings",
    "Polite Expressions",
    "Daily Conversations",
    "Questions",
    "Emotional Expressions",
    "Time and Dates",
    "Directions",
    "Shopping",
    "Healthcare",
    "Work and School",
    "Social Situations"
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Shared phrases notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              You've been sent these phrases for practice
            </DialogTitle>
            <DialogDescription>
              Someone has shared a set of phrases with you to practice your
              pronunciation. These phrases have been loaded and are ready for
              you to start practicing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSharedDialog(false)}>
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign in dialog */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to save phrases to your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <AuthButtons />
            <Button
              variant="outline"
              onClick={() => {
                setShowSignInDialog(false);
                setPendingSaveIndex(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">Practice Phrases</h1>
        <DifficultyDropdown onConfirm={async (newDifficulty) => {
          setDifficulty(newDifficulty as any);
          await handleGenerateTopicPhrases(aiGenerateTopic, newDifficulty);
        }} />
      </div>

      {/* Topic Selection */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Choose a Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topicOptions.map((topic) => (
            <Card
              key={topic}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                aiGenerateTopic === topic 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md' 
                  : 'hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                setAiGenerateTopic(topic);
                handleGenerateTopicPhrases(topic);
              }}
            >
              <CardContent className="p-6 text-center">
                <p className="font-semibold text-gray-800">{topic}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom Topic Input */}
        <div className="mt-6">
          <Label htmlFor="custom-topic" className="text-base font-medium">
            Or enter a custom topic:
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="custom-topic"
              value={aiGenerateTopic}
              onChange={(e) => setAiGenerateTopic(e.target.value)}
              placeholder="Type any topic (e.g., 'Restaurant conversations', 'Medical appointments')"
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={() => handleGenerateTopicPhrases(aiGenerateTopic)}
              disabled={isProcessing || !aiGenerateTopic.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2 transition-all duration-300 hover:scale-105"
            >
              {isProcessing ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Practice Section */}
      {processedPhrases.length > 0 && (
        <div id="practice-phrases-section" className="mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Practice Phrases</h2>
          
          {/* Carousel for phrases */}
          <div className="embla overflow-hidden w-full" ref={emblaRef}>
            <div className="embla__container flex">
              {processedPhrases.map((phrase, idx) => (
                <div key={phrase.id} className="embla__slide flex-shrink-0 w-80 md:w-96 mx-2">
                  <Card className="h-full">
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl font-bold">{phrase.text}</CardTitle>
                      {phrase.phonetic && (
                        <CardDescription className="text-lg text-muted-foreground">
                          {phrase.phonetic}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Recording Controls */}
                      <div className="flex justify-center gap-2">
                        {phrase.status === "idle" && (
                          <Button
                            onClick={() => startPhrasePractice(idx)}
                            className="flex items-center gap-2"
                            disabled={isRecording || isProcessingRecording}
                          >
                            <MicIcon className="h-4 w-4" />
                            Start Recording
                          </Button>
                        )}
                        
                        {phrase.status === "recording" && (
                          <Button
                            onClick={() => stopPhrasePractice()}
                            variant="destructive"
                            className="flex items-center gap-2"
                          >
                            <StopCircleIcon className="h-4 w-4" />
                            Stop Recording
                          </Button>
                        )}
                        
                        {phrase.status === "assessing" && (
                          <Button disabled className="flex items-center gap-2">
                            <RotateCw className="h-4 w-4 animate-spin" />
                            Analyzing...
                          </Button>
                        )}
                        
                        {phrase.status === "complete" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => startPhrasePractice(idx)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <RotateCw className="h-4 w-4" />
                              Try Again
                            </Button>
                            <Button
                              onClick={() => playUserRecording(idx)}
                              variant="outline"
                              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                            >
                              <VolumeIcon className="h-4 w-4" />
                              Hear me
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Text-to-Speech */}
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleTextToSpeech(idx)}
                          variant="outline"
                          className="h-10 px-4 bg-green-700 hover:bg-green-600 text-white border-green-700"
                        >
                          Listen
                        </Button>
                        <button
                          onClick={() => toggleSlowPlayback(phrase.id)}
                          className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            slowPlaybackPhrases[phrase.id] ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={slowPlaybackPhrases[phrase.id]}
                          aria-label="Toggle slow playback"
                        >
                          <span
                            className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                              slowPlaybackPhrases[phrase.id] ? 'translate-x-8' : 'translate-x-1'
                            }`}
                          >
                            <Snail className="w-3 h-3 text-gray-600" />
                          </span>
                        </button>
                      </div>

                      {/* Assessment Results */}
                      {phrase.assessmentResult && (
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <Gauge className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold">
                              {phrase.assessmentResult.pronunciationScore.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  phrase.assessmentResult && star <= Math.round(phrase.assessmentResult.pronunciationScore / 20)
                                    ? "text-yellow-500 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex justify-center">
                      <Button
                        onClick={() => handleSavePhrase(idx)}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={savedPhraseId === phrase.id}
                      >
                        {savedPhraseId === phrase.id ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                        {savedPhraseId === phrase.id ? "Saved!" : "Save Phrase"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              ))}
              
              {/* Summary Card */}
              {showSummary && (
                <div className="embla__slide flex-shrink-0 w-full mx-2 flex justify-center">
                  <SummaryCard
                    assessmentResults={processedPhrases.map(phrase => phrase.assessmentResult).filter(Boolean)}
                    type="phrases"
                    onRestart={handleRestartPractice}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Carousel Navigation */}
          {processedPhrases.length > 1 && (
            <div className="flex justify-center gap-4 mt-4">
              <Button
                onClick={goToPrevious}
                variant="outline"
                disabled={currentCarouselIndex === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 transition-all duration-300 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg">
                <span className="font-semibold text-gray-700">{showSummary ? processedPhrases.length + 1 : currentCarouselIndex + 1}</span>
                <span className="text-gray-500">of</span>
                <span className="font-semibold text-gray-700">{showSummary ? processedPhrases.length + 1 : processedPhrases.length}</span>
              </span>
              {/* Show Finish button on 8th card, Next button otherwise */}
              {currentCarouselIndex === processedPhrases.length - 1 && processedPhrases.length === 8 && !showSummary ? (
                <Button
                  onClick={handleFinishPractice}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-300 hover:scale-105 font-semibold"
                >
                  <Flag className="h-4 w-4" />
                  Finish
                </Button>
              ) : (
                <Button
                  onClick={goToNext}
                  variant="outline"
                  disabled={currentCarouselIndex === processedPhrases.length - 1 || showSummary}
                  className={`transition-all duration-300 hover:scale-105 ${
                    currentCarouselIndex === processedPhrases.length - 1 || showSummary
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0'
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}