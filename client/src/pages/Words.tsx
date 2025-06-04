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
  Turtle,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
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

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

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

      toast({
        title: "Recording Started",
        description: "Say the word clearly",
      });
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

      toast({
        title: "Processing Recording",
        description: "Analyzing your pronunciation...",
      });

      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("referenceText", word.text);

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

      toast({
        title: "Analysis Complete",
        description: `Pronunciation: ${result.pronunciationScore.toFixed(1)}%`,
      });
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
  const handleTextToSpeech = (wordIndex: number) => {
    const word = processedWords[wordIndex];
    if (!word) return;

    const utterance = new SpeechSynthesisUtterance(word.text);
    utterance.rate = slowPlaybackWords[word.id] ? 0.6 : 1;
    speechSynthesis.speak(utterance);
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
        <h1 className="text-3xl font-bold">Practice Words</h1>
        <DifficultyDropdown onConfirm={async (newDifficulty) => {
          setDifficulty(newDifficulty as any);
          await handleGenerateTopicWords(aiGenerateTopic, newDifficulty);
        }} />
      </div>

      {/* Topic Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose a Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topicOptions.map((topic) => (
            <Card
              key={topic}
              className={`cursor-pointer transition-all hover:shadow-md ${
                aiGenerateTopic === topic ? 'ring-2 ring-primary' : ''
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                setAiGenerateTopic(topic);
                handleGenerateTopicWords(topic);
              }}
            >
              <CardContent className="p-4 text-center">
                <p className="font-medium">{topic}</p>
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
          <h2 className="text-xl font-semibold mb-4">Practice Words</h2>
          
          {/* Carousel for words */}
          <div className="embla" ref={emblaRef}>
            <div className="embla__container flex">
              {processedWords.map((word, idx) => (
                <div key={word.id} className="embla__slide flex-none w-full md:w-1/2 lg:w-1/3 px-2">
                  <Card className="h-full">
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl font-bold">{word.text}</CardTitle>
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
                            className="flex items-center gap-2"
                            disabled={isRecording || isProcessingRecording}
                          >
                            <MicIcon className="h-4 w-4" />
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
                          <Button
                            onClick={() => startWordPractice(idx)}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RotateCw className="h-4 w-4" />
                            Try Again
                          </Button>
                        )}
                      </div>

                      {/* Text-to-Speech */}
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleTextToSpeech(idx)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Volume2 className="h-4 w-4" />
                          Listen
                        </Button>
                        <Button
                          onClick={() => toggleSlowPlayback(word.id)}
                          variant={slowPlaybackWords[word.id] ? "default" : "outline"}
                          className="flex items-center gap-2"
                        >
                          <Turtle className="h-4 w-4" />
                          Slow
                        </Button>
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

                    <CardFooter className="flex justify-center">
                      <Button
                        onClick={() => handleSaveWord(idx)}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={savedWordId === word.id}
                      >
                        {savedWordId === word.id ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                        {savedWordId === word.id ? "Saved!" : "Save Word"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Navigation */}
          {processedWords.length > 1 && (
            <div className="flex justify-center gap-4 mt-4">
              <Button
                onClick={goToPrevious}
                variant="outline"
                disabled={currentCarouselIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center gap-2">
                {currentCarouselIndex + 1} of {processedWords.length}
              </span>
              <Button
                onClick={goToNext}
                variant="outline"
                disabled={currentCarouselIndex === processedWords.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}