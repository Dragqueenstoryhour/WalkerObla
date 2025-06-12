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
import useAudioRecording from "@/hooks/useAudioRecording";
import { AuthButtons } from "@/components/AuthButtons";
import { AudioPlaybackButton } from "@/components/AudioPlaybackButton";

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
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [letterModalType, setLetterModalType] = useState<'begin' | 'include'>('begin');

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

  // Use audio recording hook for consistent recording management
  const {
    isRecording,
    recordingDuration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecording({
    onRecordingComplete: (blob) => {
      if (currentWordIndex >= 0) {
        processWordRecording(blob, currentWordIndex);
      }
    },
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
    },
  });

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

      const newWords: ProcessedWord[] = result.phrases.map(
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

      // Update the word status to recording
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
        ),
      );

      // Start recording using the hook
      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording word: "${word.text}"`,
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
    stopRecording();
  };

  // Process word recording with Azure
  const processWordRecording = async (audioBlob: Blob, wordIndex: number) => {
    setIsProcessingRecording(true);

    try {
      const word = processedWords[wordIndex];

      // Validate word data
      if (!word || !word.text || word.text.trim() === '') {
        console.error('Invalid word data:', word);
        throw new Error('No word text available for assessment');
      }

      console.log('Processing word:', word.text);

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
      formData.append("text", word.text.trim());
      formData.append("itemType", "word");
      formData.append("source", "words");

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
    // Cancel recording using the hook
    cancelRecording();
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
    const textToSpeak = word.text;

    // Construct the SSML string with Azure AI Speech native voice
    let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
    ssmlText += `<voice name="en-US-AvaNeural">`;

    if (isSlowPlayback) {
      // Use SSML prosody rate to slow down - Azure uses "slow" or decimal values
      ssmlText += `<prosody rate="0.6">`;
      ssmlText += textToSpeak;
      ssmlText += `</prosody>`;
    } else {
      ssmlText += textToSpeak;
    }
    ssmlText += `</voice>`;
    ssmlText += `</speak>`;

    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          ssml: ssmlText,
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

      loadingToast.dismiss?.();

      // Enhanced audio element for mobile Safari compatibility
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

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

  // Toggle slow playback for a word
  const toggleSlowPlayback = (wordId: string) => {
    setSlowPlaybackWords(prev => ({
      ...prev,
      [wordId]: !prev[wordId]
    }));
  };

  // Save a word to user's collection
  const saveWordToCollection = async (wordIndex: number) => {
    if (!isAuthenticated) {
      setPendingSaveIndex(wordIndex);
      setShowSignInDialog(true);
      return;
    }

    const word = processedWords[wordIndex];
    if (!word) return;

    try {
      const response = await fetch("/api/saved-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: word.text,
          difficulty: word.difficulty || "beginner",
          source: "words"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save word");
      }

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

  // Auto-load common words when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicWords("Commonly Used Words");
    }
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
        if (!data.collection || !data.collection.words) {
          throw new Error("Invalid shared words data");
        }

        const sharedWords: ProcessedWord[] = data.collection.words.map((text: string, index: number) => ({
          id: `shared-word-${index}`,
          text,
          status: "idle" as const,
        }));

        setProcessedWords(sharedWords);
        setShowSharedDialog(true);
        scrollToPracticeSection();
      } catch (error) {
        console.error("Error loading shared words:", error);
        toast({
          title: "Loading Error",
          description: "Could not load shared words. Please check the link.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    loadSharedWords();
  }, [shareId]);

  // Handle successful authentication and save pending word
  useEffect(() => {
    if (isAuthenticated && pendingSaveIndex !== null) {
      saveWordToCollection(pendingSaveIndex);
      setPendingSaveIndex(null);
    }
  }, [isAuthenticated, pendingSaveIndex]);

  // Auto-advance carousel when words are completed
  useEffect(() => {
    if (currentCarouselIndex < processedWords.length - 1) {
      const currentWord = processedWords[currentCarouselIndex];
      if (currentWord?.status === "complete") {
        // Auto-advance after 2 seconds
        const timer = setTimeout(() => {
          goToNext();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [processedWords, currentCarouselIndex]);

  // Check if all words are complete to show summary
  useEffect(() => {
    if (processedWords.length > 0) {
      const completedCount = processedWords.filter(w => w.status === "complete").length;
      if (completedCount === processedWords.length && !showSummary) {
        setTimeout(() => {
          handleFinishPractice();
        }, 1000);
      }
    }
  }, [processedWords, showSummary]);

  const topicOptions = [
    "Commonly Used Words",
    "Animals",
    "Colors",
    "Food and Drinks",
    "Body Parts",
    "Family Members",
    "Weather",
    "Numbers",
    "Actions/Verbs",
    "Emotions",
    "Home and Furniture",
    "Transportation"
  ];

  return (
    <div className="container mx-auto px-4 py-6 bg-green-50 min-h-screen">
      {/* Shared words notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shared Words Loaded</DialogTitle>
            <DialogDescription>
              Someone shared these words with you. You can practice them below!
            </DialogDescription>
          </DialogHeader>
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
          <AuthButtons />
        </DialogContent>
      </Dialog>

      {/* Generation controls */}
      <Card className="mb-6 bg-white shadow-lg border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-[#2a5e2a] flex items-center gap-2">
            <Mic className="h-6 w-6" />
            Speech Practice - Words
          </CardTitle>
          <CardDescription className="text-[#264653]">
            Generate and practice words to improve your speech clarity and pronunciation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium text-[#264653]">
                Choose Topic
              </Label>
              <select 
                id="topic"
                value={aiGenerateTopic}
                onChange={(e) => setAiGenerateTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#57cc99] focus:border-transparent"
              >
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#264653]">
                Difficulty Level
              </Label>
              <DifficultyDropdown />
            </div>
            <Button
              onClick={() => handleGenerateTopicWords(aiGenerateTopic)}
              disabled={isProcessing}
              className="bg-[#57cc99] hover:bg-[#4ade80] text-white h-10"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Generate Words
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Practice section */}
      {processedWords.length > 0 && (
        <div id="practice-words-section" className="space-y-6">
          {/* Progress indicator */}
          <div className="bg-white rounded-lg p-4 shadow-lg border-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
              <span className="text-sm text-[#264653]">
                {currentCarouselIndex + 1} of {processedWords.length + (showSummary ? 1 : 0)}
              </span>
            </div>
            <Progress 
              value={((currentCarouselIndex + 1) / (processedWords.length + (showSummary ? 1 : 0))) * 100} 
              className="h-2"
            />
          </div>

          {/* Carousel */}
          <div className="embla" ref={emblaRef}>
            <div className="embla__container flex">
              {processedWords.map((word, index) => (
                <div key={word.id} className="embla__slide flex-[0_0_100%] px-2">
                  <Card className="bg-white shadow-lg border-0 h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-[#2a5e2a]">
                          Word {index + 1}
                        </CardTitle>
                        <Badge 
                          variant={
                            word.status === "complete" ? "default" :
                            word.status === "recording" ? "secondary" :
                            word.status === "assessing" ? "outline" : "outline"
                          }
                          className={
                            word.status === "complete" ? "bg-green-100 text-green-800" :
                            word.status === "recording" ? "bg-red-100 text-red-800" :
                            word.status === "assessing" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {word.status === "complete" ? "Complete" :
                           word.status === "recording" ? "Recording" :
                           word.status === "assessing" ? "Analyzing" : "Ready"}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Word text */}
                      <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4">
                        <p className="text-3xl font-bold text-[#0c4a6e] text-center leading-relaxed">
                          {word.text}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          onClick={() => handleTextToSpeech(index)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Volume2 className="h-4 w-4" />
                          Listen
                        </Button>
                        
                        <Button
                          onClick={() => toggleSlowPlayback(word.id)}
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-2 ${slowPlaybackWords[word.id] ? 'bg-blue-50 border-blue-300' : ''}`}
                        >
                          <Snail className="h-4 w-4" />
                          {slowPlaybackWords[word.id] ? 'Normal' : 'Slow'}
                        </Button>

                        <Button
                          onClick={() => saveWordToCollection(index)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Star className="h-4 w-4" />
                          Save
                        </Button>
                      </div>

                      {/* Recording section */}
                      <div className="space-y-3">
                        {word.status === "idle" && (
                          <Button
                            onClick={() => startWordPractice(index)}
                            className="w-full bg-[#57cc99] hover:bg-[#4ade80] text-white py-3"
                            disabled={isRecording || isProcessingRecording}
                          >
                            <Mic className="h-5 w-5 mr-2" />
                            Start Recording
                          </Button>
                        )}

                        {word.status === "recording" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-600">
                                  Recording... {Math.floor(recordingDuration)}s
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={stopWordPractice}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                              >
                                <StopCircleIcon className="h-5 w-5 mr-2" />
                                Stop Recording
                              </Button>
                              <Button
                                onClick={() => cancelWordPractice(index)}
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {word.status === "assessing" && (
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center space-x-2">
                              <RotateCw className="h-5 w-5 animate-spin text-[#57cc99]" />
                              <span className="text-sm font-medium text-[#264653]">
                                Analyzing pronunciation...
                              </span>
                            </div>
                          </div>
                        )}

                        {word.status === "complete" && word.assessmentResult && (
                          <div className="space-y-3">
                            {/* Assessment results */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="text-center space-y-2">
                                <div className="flex items-center justify-center space-x-2">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="font-semibold text-green-800">Assessment Complete</span>
                                </div>
                                
                                <div className="text-2xl font-bold text-green-700">
                                  {Math.round(word.assessmentResult.pronunciationScore)}%
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-600">Accuracy</div>
                                    <div className="font-bold text-gray-800">
                                      {Math.round(word.assessmentResult.accuracyScore)}%
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-600">Fluency</div>
                                    <div className="font-bold text-gray-800">
                                      {Math.round(word.assessmentResult.fluencyScore)}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Playback recording section */}
                            {word.recordingUrl && (
                              <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
                                <div className="text-sm font-medium text-[#264653]">
                                  Listen to your recording:
                                </div>
                                <AudioPlaybackButton
                                  audioUrl={word.recordingUrl}
                                  buttonText="Listen to me"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full p-2 shadow-md"
                                  icon={<Volume2 className="h-5 w-5" />}
                                />
                              </div>
                            )}

                            {/* Try again button */}
                            <Button
                              onClick={() => {
                                setProcessedWords(words =>
                                  words.map((w, idx) =>
                                    idx === index ? { ...w, status: "idle", assessmentResult: undefined, recordingUrl: undefined } : w
                                  )
                                );
                                setWordAssessmentResult(null);
                              }}
                              variant="outline"
                              className="w-full"
                            >
                              <RotateCw className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {/* Summary card */}
              {showSummary && (
                <div className="embla__slide flex-[0_0_100%] px-2">
                  <Card className="bg-white shadow-lg border-0 h-full">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-[#2a5e2a] text-center">
                        Practice Complete!
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <p className="text-lg text-[#264653] mb-4">
                          Great job completing your word practice session!
                        </p>
                        <Button
                          onClick={handleRestartPractice}
                          className="bg-[#57cc99] hover:bg-[#4ade80] text-white"
                        >
                          <RotateCw className="h-4 w-4 mr-2" />
                          Practice Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={goToPrevious}
              disabled={currentCarouselIndex === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <Button
              onClick={goToNext}
              disabled={currentCarouselIndex >= processedWords.length + (showSummary ? 1 : 0) - 1}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}