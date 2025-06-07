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
  Ear,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { SaveWordButton } from "@/components/SaveWordButton";
import { SummaryCard } from "@/components/SummaryCard";
import useEmblaCarousel from 'embla-carousel-react';

interface ProcessedWord {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: "idle" | "recording" | "assessing" | "complete";
}

export default function Words() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const shareId = params.shareId;
  const { difficulty, setDifficulty } = useDifficulty();

  // State variables
  const [aiGenerateTopic, setAiGenerateTopic] = useState("Commonly Used Words");
  const [processedWords, setProcessedWords] = useState<ProcessedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedWordId, setSavedWordId] = useState<string | null>(null);
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    skipSnaps: false,
    inViewThreshold: 0.7
  });

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedWords.length - 1) {
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
        emblaApi.scrollTo(processedWords.length);
      }
    }, 100);
  };

  // Reset practice session
  const handleRestartPractice = () => {
    setShowSummary(false);
    setProcessedWords([]);
    setCurrentCarouselIndex(0);
    setCurrentlyPracticing(null);
    setWordAssessmentResult(null);
  };

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Auto-scroll to practice section after words are generated
  const scrollToPracticeSection = () => {
    setTimeout(() => {
      const practiceSection = document.getElementById('practice-words-section');
      if (practiceSection) {
        practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  };

  // Generate topic-based words
  const handleGenerateTopicWords = async (topic: string, customDifficulty?: string) => {
    if (!topic.trim()) {
      toast({
        title: "No Topic Provided",
        description: "Please enter a topic to generate words.",
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
          type: "words"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate words");
      }

      const result = await response.json();

      // Process results to ensure we only have single words
      let processedItems = result.phrases.map((item: string) => {
        const words = item.trim().split(/\s+/);
        return words[0] || item;
      });
      
      // Filter out articles and very short words
      const articlesAndPrepositions = ['a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'to', 'from'];
      processedItems = processedItems.filter((word: string) => 
        !articlesAndPrepositions.includes(word.toLowerCase()) && 
        word.length > 1
      );
      
      // Remove duplicates
      const uniqueWords: string[] = [];
      processedItems = processedItems.filter((word: string) => {
        const wordLower = word.toLowerCase();
        if (!uniqueWords.includes(wordLower)) {
          uniqueWords.push(wordLower);
          return true;
        }
        return false;
      });

      const newWords: ProcessedWord[] = processedItems.map(
        (text: string, index: number) => ({
          id: `word-${Date.now()}-topic-${index}`,
          text,
          status: "idle",
        }),
      );

      setProcessedWords(newWords);
      setCurrentWordIndex(0);
      scrollToPracticeSection();
    } catch (error) {
      console.error("Error generating words:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate words. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording for an individual word practice
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= processedWords.length) return;

    try {
      const word = processedWords[wordIndex];
      setCurrentlyPracticing(word.id);
      setCurrentWordIndex(wordIndex);
      setWordAssessmentResult(null);
      chunksRef.current = [];

      // Update the word status to recording
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
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

          // Process the word recording
          await processWordRecording(audioBlob, wordIndex);
        } catch (error) {
          console.error("Error processing word recording:", error);
          toast({
            title: "Recording Error",
            description: "Could not process the recording. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          setIsProcessingRecording(false);

          // Reset word status
          setProcessedWords((words) =>
            words.map((w, idx) =>
              idx === wordIndex ? { ...w, status: "idle" } : w,
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

      // Reset word status
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    }
  };

  // Stop recording the word
  const stopWordPractice = () => {
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

  // Process word recording with Azure
  const processWordRecording = async (audioBlob: Blob, wordIndex: number) => {
    setIsProcessingRecording(true);

    try {
      const word = processedWords[wordIndex];

      // Update status to assessing
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "assessing" } : w,
        ),
      );



      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", word.text);

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
      setWordAssessmentResult(result);

      // Update in the words array
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                assessmentResult: result,
                recordingBlob: audioBlob,
                recordingUrl,
              }
            : w,
        ),
      );


    } catch (error) {
      console.error("Error assessing word pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Cancel word practice
  const cancelWordPractice = (wordIndex: number) => {
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

    // Reset word status
    setProcessedWords((words) =>
      words.map((w, idx) =>
        idx === wordIndex ? { ...w, status: "idle" } : w,
      ),
    );

    toast({
      title: "Practice Cancelled",
      description: "Recording stopped",
    });
  };

  // Handle text-to-speech
  const handleTextToSpeech = async (wordIndex: number) => {
    const word = processedWords[wordIndex];
    if (!word?.text) {
      toast({
        title: "No Text",
        description: "No text available for this word.",
        variant: "destructive",
      });
      return;
    }

    const loadingToast = toast({
      title: "Loading Audio",
      description: "Preparing text-to-speech...",
    });

    const isSlowPlayback = slowPlaybackWords[word.id] || false;
    const speed = isSlowPlayback ? 0.75 : 1.0; // Snail mode at 70% speed

    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: word.text,
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
            description: `Playing: "${word.text}"`,
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
  const playUserRecording = (wordIndex: number) => {
    const word = processedWords[wordIndex];
    if (!word?.recordingUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = new Audio(word.recordingUrl);
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
  const toggleSlowPlayback = (wordId: string) => {
    setSlowPlaybackWords(prev => ({
      ...prev,
      [wordId]: !prev[wordId]
    }));
  };

  // Save word to collection
  const handleSaveWord = async (wordIndex: number) => {
    if (!isAuthenticated) {
      setPendingSaveIndex(wordIndex);
      setShowSignInDialog(true);
      return;
    }

    const word = processedWords[wordIndex];
    if (!word) return;

    try {
      const response = await fetch("/api/phrases/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: word.text,
          phonetic: word.phonetic || null,
          difficulty: word.difficulty || null,
          assessmentResults: word.assessmentResult ? JSON.stringify(word.assessmentResult) : null,
          source: "words",
          sourceId: shareId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save word");
      }

      setSavedWordId(word.id);
      setTimeout(() => setSavedWordId(null), 2000);

      toast({
        title: "Word Saved",
        description: "Added to your collection",
      });
    } catch (error) {
      console.error("Error saving word:", error);
      toast({
        title: "Save Error",
        description: "Failed to save word. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-load commonly used words when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicWords("Commonly Used Words");
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

  // Load shared words if shareId is present
  useEffect(() => {
    const loadSharedWords = async () => {
      if (!shareId) return;

      setIsProcessing(true);

      try {
        const response = await fetch(`/api/share/${shareId}`);

        if (!response.ok) {
          throw new Error("Failed to load shared words");
        }

        const data = await response.json();
        if (!data.collection || !data.collection.phrases) {
          throw new Error("Invalid shared words data");
        }

        let wordsData;
        try {
          wordsData =
            typeof data.collection.phrases === "string"
              ? JSON.parse(data.collection.phrases)
              : data.collection.phrases;

          if (!Array.isArray(wordsData)) {
            wordsData = [wordsData];
          }
        } catch (parseError) {
          console.error("Error parsing words data:", parseError);
          throw new Error("Invalid shared words format");
        }

        const newWords: ProcessedWord[] = wordsData.map(
          (word: any, index: number) => ({
            id: `shared-${Date.now()}-${index}`,
            text: word.text || "",
            phonetic: word.phonetic || undefined,
            difficulty: word.difficulty || undefined,
            status: "idle",
          }),
        );

        if (newWords.length > 0) {
          console.log("Loaded shared words:", newWords);
          setProcessedWords(newWords);
          setCurrentWordIndex(0);
          setShowSharedDialog(true);

          toast({
            title: "Shared Words Loaded",
            description: `Loaded ${newWords.length} shared words for practice.`,
          });
        } else {
          throw new Error("No words found in this shared collection");
        }
      } catch (error) {
        console.error("Error loading shared words:", error);
        toast({
          title: "Error Loading Shared Words",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load shared words",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    loadSharedWords();
  }, [shareId, toast]);

  // Auto-load commonly used words when the page opens
  useEffect(() => {
    // Only if we're not loading shared words
    if (!shareId) {
      handleGenerateTopicWords("Commonly Used Words");
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
    "Commonly Used Words",
    "Household Items",
    "Food and Drinks",
    "Family Members",
    "Body Parts",
    "Colors",
    "Numbers",
    "Weather",
    "Transportation",
    "Animals",
    "Emotions",
    "Actions"
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Shared words notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              You've been sent these words for practice
            </DialogTitle>
            <DialogDescription>
              Someone has shared a set of words with you to practice your
              pronunciation. These words have been loaded and are ready for
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
              Please sign in to save words to your collection.
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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">Practice Words</h1>
        <DifficultyDropdown onConfirm={async (newDifficulty) => {
          setDifficulty(newDifficulty as any);
          await handleGenerateTopicWords(aiGenerateTopic, newDifficulty);
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
                  ? 'ring-2 ring-blue-500 shadow-md' 
                  : 'hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ backgroundColor: '#FF89BB' }}
              onClick={() => {
                setAiGenerateTopic(topic);
                handleGenerateTopicWords(topic);
              }}
            >
              <CardContent className="p-4 text-center">
                <p className="font-semibold text-white">{topic}</p>
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
              placeholder="Type any topic (e.g., 'Kitchen utensils', 'Sports equipment')"
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={() => handleGenerateTopicWords(aiGenerateTopic)}
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
      {processedWords.length > 0 && (
        <div id="practice-words-section" className="mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Practice Words</h2>
          
          {/* Carousel for words */}
          <div className="embla overflow-hidden w-full max-w-7xl mx-auto" ref={emblaRef}>
            <div className="embla__container flex">
              {processedWords.map((word, idx) => (
                <div key={word.id} className={`embla__slide flex-shrink-0 w-full sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] 2xl:w-[50%] px-4 sm:px-6 md:px-8 ${idx === currentCarouselIndex ? 'is-in-view' : ''}`}>
                  <Card className="h-full card-content" style={{ backgroundColor: '#1947E5' }}>
                    <CardHeader className="text-center">
                      <CardTitle className="text-3xl font-bold text-white">{word.text}</CardTitle>
                      {word.phonetic && (
                        <CardDescription className="text-lg text-muted-foreground">
                          {word.phonetic}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Recording Controls */}
                      <div className="flex justify-center gap-2">
                        {word.status === "idle" && (
                          <Button
                            onClick={() => startWordPractice(idx)}
                            className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 font-bold text-base h-12 px-6"
                            disabled={isRecording || isProcessingRecording}
                          >
                            <MicIcon className="h-5 w-5" />
                            Start Recording
                          </Button>
                        )}
                        
                        {word.status === "recording" && (
                          <Button
                            onClick={() => stopWordPractice()}
                            variant="destructive"
                            className="flex items-center gap-2"
                          >
                            <StopCircleIcon className="h-4 w-4" />
                            Stop Recording
                          </Button>
                        )}
                        
                        {word.status === "assessing" && (
                          <Button disabled className="flex items-center gap-2">
                            <RotateCw className="h-4 w-4 animate-spin" />
                            Analyzing...
                          </Button>
                        )}
                        
                        {word.status === "complete" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => startWordPractice(idx)}
                              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 font-bold text-base h-12 px-6"
                            >
                              <RotateCw className="h-5 w-5" />
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

                      {/* Text-to-Speech and Slow Switch */}
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleTextToSpeech(idx)}
                          variant="outline"
                          className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-white hover:bg-[#FF7F7C] h-10 px-4 py-2 flex items-center gap-2 bg-[#FF9692] border-0"
                        >
                          <Ear className="h-4 w-4" />
                          Hear
                        </Button>
                        <button
                          onClick={() => toggleSlowPlayback(word.id)}
                          className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            slowPlaybackWords[word.id] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={slowPlaybackWords[word.id]}
                          aria-label="Toggle slow playback"
                        >
                          <span
                            className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                              slowPlaybackWords[word.id] ? 'translate-x-8' : 'translate-x-1'
                            }`}
                          >
                            <Snail className="w-3 h-3 text-gray-600" />
                          </span>
                        </button>
                      </div>

                      {/* Save Button Row */}
                      <div className="flex justify-center">
                        <SaveWordButton 
                          word={word.text}
                          variant="outline"
                          size="default"
                        />
                      </div>

                      {/* Assessment Results */}
                      {word.assessmentResult && (
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <Gauge className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold">
                              {word.assessmentResult.pronunciationScore.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  word.assessmentResult && star <= Math.round(word.assessmentResult.pronunciationScore / 20)
                                    ? "text-yellow-500 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
              
              {/* Summary Card */}
              {showSummary && (
                <div className="embla__slide flex-shrink-0 w-full mx-2 flex justify-center">
                  <SummaryCard
                    assessmentResults={processedWords.map(word => word.assessmentResult).filter(Boolean)}
                    type="words"
                    onRestart={handleRestartPractice}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Carousel Navigation */}
          {processedWords.length > 1 && (
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
                <span className="font-semibold text-gray-700">{showSummary ? processedWords.length + 1 : currentCarouselIndex + 1}</span>
                <span className="text-gray-500">of</span>
                <span className="font-semibold text-gray-700">{showSummary ? processedWords.length + 1 : processedWords.length}</span>
              </span>
              {/* Show Finish button on 8th card, Next button otherwise */}
              {currentCarouselIndex === processedWords.length - 1 && processedWords.length === 8 && !showSummary ? (
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
                  disabled={currentCarouselIndex === processedWords.length - 1 || showSummary}
                  className={`transition-all duration-300 hover:scale-105 ${
                    currentCarouselIndex === processedWords.length - 1 || showSummary
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