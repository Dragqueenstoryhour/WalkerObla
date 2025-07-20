import React, { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
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
import { getAuthHeaders } from "@/lib/supabaseClient";
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
  Flag,
  X,
  ArrowRight,
  Snail,
  Lightbulb,
  Ear,
  Eye,
  Play,
  Square,
} from "lucide-react";

// Import viseme images
import viseme0 from "@/assets/Visemes/viseme-id-0.jpg";
import viseme1 from "@/assets/Visemes/viseme-id-1.jpg";
import viseme2 from "@/assets/Visemes/viseme-id-2.jpg";
import viseme3 from "@/assets/Visemes/viseme-id-3.jpg";
import viseme4 from "@/assets/Visemes/viseme-id-4.jpg";
import viseme5 from "@/assets/Visemes/viseme-id-5.jpg";
import viseme6 from "@/assets/Visemes/viseme-id-6.jpg";
import viseme7 from "@/assets/Visemes/viseme-id-7.jpg";
import viseme8 from "@/assets/Visemes/viseme-id-8.jpg";
import viseme9 from "@/assets/Visemes/viseme-id-9.jpg";
import viseme10 from "@/assets/Visemes/viseme-id-10.jpg";
import viseme11 from "@/assets/Visemes/viseme-id-11.jpg";
import viseme12 from "@/assets/Visemes/viseme-id-12.jpg";
import viseme13 from "@/assets/Visemes/viseme-id-13.jpg";
import viseme14 from "@/assets/Visemes/viseme-id-14.jpg";
import viseme15 from "@/assets/Visemes/viseme-id-15.jpg";
import viseme16 from "@/assets/Visemes/viseme-id-16.jpg";
import viseme17 from "@/assets/Visemes/viseme-id-17.jpg";
import viseme18 from "@/assets/Visemes/viseme-id-18.jpg";
import viseme19 from "@/assets/Visemes/viseme-id-19.jpg";
import viseme20 from "@/assets/Visemes/viseme-id-20.jpg";
import viseme21 from "@/assets/Visemes/viseme-id-21.jpg";

const visemeImages = {
  0: viseme0,
  1: viseme1,
  2: viseme2,
  3: viseme3,
  4: viseme4,
  5: viseme5,
  6: viseme6,
  7: viseme7,
  8: viseme8,
  9: viseme9,
  10: viseme10,
  11: viseme11,
  12: viseme12,
  13: viseme13,
  14: viseme14,
  15: viseme15,
  16: viseme16,
  17: viseme17,
  18: viseme18,
  19: viseme19,
  20: viseme20,
  21: viseme21,
};
import { useDifficulty, DifficultyLevel } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { SummaryCard } from "@/components/SummaryCard";
import useEmblaCarousel from 'embla-carousel-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming you have these components


interface ProcessedWord {
  id: string;
  text: string;
  syllabication?: string;
  phoneticBreakdown?: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  status: "idle" | "recording" | "assessing" | "complete";
}

interface VisemeData {
  visemeId: number;
  audioOffset: number;
  animation?: string;
}

interface VisemeResponse {
  visemes: VisemeData[];
  audioBuffer: string; // base64 encoded audio data
  duration: number;
}

interface PronunciationFeedback {
  suggestions: string[];
  practicePrompt?: {
    question: string;
    problemSound: string;
  };
}

// Helper function to get syllable color based on accuracy score
const getSyllableColor = (accuracyScore: number): string => {
  const threshold = 70; // Define accuracy threshold
  if (accuracyScore >= threshold) {
    return '#2a9d8f'; // Green for correct pronunciation
  } else {
    return '#e76f51'; // Red for incorrect pronunciation
  }
};

// Helper function to map syllables from assessment results to phonetic breakdown display
const mapSyllablesToDisplay = (phoneticBreakdown: string, syllables: any[], overallScore?: number): Array<{text: string, color: string}> => {
  const displaySyllables = phoneticBreakdown.split(/\s*[·•-]\s*/).map(s => s.trim());
  
  if (!syllables || syllables.length === 0) {
    // No syllable data available - use overall score for all segments
    const fallbackColor = overallScore ? getSyllableColor(overallScore) : '#ffffff';
    return displaySyllables.map(syllable => ({
      text: syllable,
      color: fallbackColor
    }));
  }

  // Create a smart mapping system that ensures 100% coverage
  const resultSyllables = displaySyllables.map((displaySyllable, index) => {
    // Try direct matching first
    let matchingSyllable = syllables.find(s => 
      s.syllable && s.grapheme &&
      (s.syllable.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      s.grapheme.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      displaySyllable.toLowerCase().includes(s.syllable.toLowerCase()) ||
      displaySyllable.toLowerCase().includes(s.grapheme.toLowerCase()))
    );

    // If no direct match, use positional mapping (map by index)
    if (!matchingSyllable && index < syllables.length) {
      matchingSyllable = syllables[index];
    }

    // If still no match, use the closest syllable or overall word score
    if (!matchingSyllable) {
      if (syllables.length > 0) {
        // Use the last available syllable score
        matchingSyllable = syllables[syllables.length - 1];
      } else if (overallScore) {
        // Fallback to overall word score
        return {
          text: displaySyllable,
          color: getSyllableColor(overallScore)
        };
      }
    }

    if (matchingSyllable) {
      return {
        text: displaySyllable,
        color: getSyllableColor(matchingSyllable.accuracyScore)
      };
    } else {
      // Final fallback - use overall score or reasonable default
      const fallbackColor = overallScore ? getSyllableColor(overallScore) : getSyllableColor(75); // Default to good score
      return {
        text: displaySyllable,
        color: fallbackColor
      };
    }
  });

  return resultSyllables;
};

export default function Words() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const shareId = params.shareId;
  const { difficulty, setDifficulty, setCurrentMode } = useDifficulty();

  // Get focus parameter from URL for targeted practice
  const urlParams = new URLSearchParams(window.location.search);
  const focusSound = urlParams.get('focus');

  // State variables
  const [aiGenerateTopic, setAiGenerateTopic] = useState("Commonly Used Words");
  const [processedWords, setProcessedWords] = useState<ProcessedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedWordId, setSavedWordId] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<PronunciationFeedback | null>(null);
  const [showFeedbackInSummary, setShowFeedbackInSummary] = useState(true);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // Topic pagination state
  const [topicPage, setTopicPage] = useState(0);

  // Tutorial state
  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [manualAdvance, setManualAdvance] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Letter selection dialog states
  const [showLetterDialog, setShowLetterDialog] = useState(false);
  const [selectedTopicType, setSelectedTopicType] = useState<'start' | 'contain' | 'end' | null>(null);
  const [selectedLetterTab, setSelectedLetterTab] = useState<"letters" | "otherSounds">("letters");


  // Letter and consonant group options
  const letterOptionsAlphabet = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ];

  const letterOptionsStartSounds = [
    'AR', 'BL', 'BR', 'CH', 'CL', 'CR', 'FR', 'GR', 'GL', 'KR', 'PL', 'PR', 'SK', 'SH', 'SHR', 'SL', 'SM', 'SN', 'ST', 'STR', 'TH', 'TR',
  ];

  const letterOptionsContainSounds = [
    'AR', 'BL', 'BR', 'CH', 'CL', 'CR', 'FR', 'GR', 'GL', 'KR', 'PL', 'PR', 'SK', 'SH', 'SHR', 'SL', 'SM', 'SN', 'ST', 'STR', 'TH', 'TR',
    'GR', 'RT', 'RS', 'RD*N', 'RT*N'
  ];

  const letterOptionsEndSounds = [
    '-AR', '-CH', '-SK', '-SH', '-ST', '-TH', '-CIAL', '-CIOUS', '-ED', '-ES', '-EST', '-GEOUS', '-ING', '-IST', '-IZE', '-KLS', '-LOGY', '-METRY', '-PS', '-SIAN', '-SH', '-ESD', '-SION', '-ST', '-TIAL', '-TION',
  ];


  // Enhanced Viseme animation state with comprehensive readiness tracking
  const [showVisemeDialog, setShowVisemeDialog] = useState(false);
  const [isGeneratingVisemes, setIsGeneratingVisemes] = useState(false);
  const [isPlayingVisemes, setIsPlayingVisemes] = useState(false);
  const [currentVisemeId, setCurrentVisemeId] = useState(0);
  const [visemeData, setVisemeData] = useState<VisemeData[]>([]);
  const [visemeAudioUrl, setVisemeAudioUrl] = useState<string>("");
  const [currentVisemeWord, setCurrentVisemeWord] = useState<string>("");
  const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [animationReady, setAnimationReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ images: 0, audio: 0 });
  const [canPlay, setCanPlay] = useState(false);
  const [nextVisemeIndex, setNextVisemeIndex] = useState(0);


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

  // Carousel navigation functions
  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Update carousel navigation state
  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on('select', updateScrollButtons);
    emblaApi.on('reInit', updateScrollButtons);
    updateScrollButtons();

    return () => {
      emblaApi.off('select', updateScrollButtons);
      emblaApi.off('reInit', updateScrollButtons);
    };
  }, [emblaApi]);

  // 4. Optimized useEffect Dependencies and Cleanup with consolidated cleanup logic
  useEffect(() => {
    return () => {
      // Clear all timeouts
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];

      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Execute all stored cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];

      // Clean up audio event listeners
      if (visemeAudioRef.current) {
        const audio = visemeAudioRef.current;

        if (currentEventListenersRef.current.timeupdate) {
          audio.removeEventListener("timeupdate", currentEventListenersRef.current.timeupdate);
        }
        if (currentEventListenersRef.current.ended) {
          audio.removeEventListener("ended", currentEventListenersRef.current.ended);
        }
        if (currentEventListenersRef.current.error) {
          audio.removeEventListener("error", currentEventListenersRef.current.error);
        }
      }

      // Clean up any blob URLs to prevent memory leaks
      if (visemeAudioUrl) {
        URL.revokeObjectURL(visemeAudioUrl);
      }
    };
  }, [visemeAudioUrl]); // Correct dependencies specification

  // Effect to update canPlay state when all assets are ready
  useEffect(() => {
    const allReady = animationReady && imagesReady && audioReady;
    if (allReady !== canPlay) {
      setCanPlay(allReady);
      console.log("Animation readiness state updated:", { animationReady, imagesReady, audioReady, canPlay: allReady });
    }
  }, [animationReady, imagesReady, audioReady, canPlay]);

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
      // Use a ref to get the current word index to avoid stale closure
      const currentIndex = currentWordIndexRef.current;
      if (currentIndex >= 0 && currentIndex < processedWords.length) {
        processWordRecording(blob, currentIndex);
      } else {
        console.warn("Invalid word index when recording completed:", currentIndex);
        setIsProcessingRecording(false);
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
      setIsProcessingRecording(false);
    },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visemeAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentWordIndexRef = useRef<number>(-1);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentEventListenersRef = useRef<{
    timeupdate?: () => void;
    ended?: () => void;
    error?: (e: Event) => void;
  }>({});
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Predefined word topics
  const wordTopics = [
    "Words that Start with..",
    "Words that Contain..",
    "Words that End with..",
    "Alphabet",
    "Commonly Used Words",
    "Animals",
    "Colors",
    "Body Parts",
    "Family Members",
    "Weather",
    "Numbers",
    "Food and Drinks",
    "Transportation",
    "Sports",
    "Nature",
    "Technology",
    "Home Items",
    "Clothing",
    "School",
    "Work",
    "Emotions",
    "Health",
    "Travel",
    "Hobbies",
  ];

  // Pagination constants and logic
  const topicsPerPage = 6;
  const totalTopicPages = Math.ceil(wordTopics.length / topicsPerPage);
  
  const displayTopics = wordTopics.slice(
    topicPage * topicsPerPage,
    (topicPage + 1) * topicsPerPage
  );

  // Tutorial steps definition
  const tutorialSteps = [
    {
      target: '.topic-selection-area',
      content: 'Welcome to Obla Words! You can start by selecting a topic from this list to generate words. Practice specific sounds by selecting one the four buttons at the bottom.',
      disableBeacon: true,
      placement: 'bottom' as const,
    },
    {
      target: '.custom-topic-input',
      content: 'Have another topic you want to brush up on? Enter it here and press Generate to get words specific to that subject!',
      disableBeacon: true,
      placement: 'top' as const, // Changed to top
    },
    {
      target: '.embla__viewport',
      content: 'Here are your practice cards, each displaying a word to practice speaking.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.start-recording-button',
      content: 'When you\'re ready, you can click the Start Recording button to record.',
      disableBeacon: true,
      placement: 'top' as const,
      spotlightClicks: true,
    },
    {
      target: '.stop-recording-button',
      content: 'Once you have finished saying the work, you can Click the \'Stop Recording\' button to see your pronunciation results.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.hear-button',
      content: 'If you want to hear the word said, you can click \'Hear\' to listen to the word pronunciation.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.slow-toggle',
      content: 'Toggle the \'Slow\' switch to slow down the word being said.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.see-button',
      content: 'Click \'See\' for an articulation animation that shows how to pronounce the word.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.next-button',
      content: 'Once you\'ve practiced a word, you can click the \'Next\' button to move to the next word.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.previous-button',
      content: 'You can also go back with the \'Previous\' button.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.save-button',
      content: 'If you find a word you want to practice again later, simply click the Save button to add it to your My Journey list. You can access this in the top right once you have logged in.',
      disableBeacon: true,
      placement: 'top' as const,
    },
    {
      target: '.words-level-button',
      content: 'To change the difficulty of the words presented, select the Words Level button and use the slider to adjust your preference.',
      disableBeacon: true,
      placement: 'bottom' as const, // Keep as bottom
    },
  ];

  // 1. Robust Image Preloading and Readiness Check using counter-based system with Promise.all
  const preloadAllVisemeImages = React.useCallback(async (): Promise<{ [key: number]: HTMLImageElement }> => {
    // console.log("Preloading all viseme images for optimal performance...");
    const allVisemeIds = Array.from({ length: 22 }, (_, i) => i); // Visemes 0-21
    let loadedCount = 0;

    setLoadingProgress(prev => ({ ...prev, images: 0 }));

    const loadPromises = allVisemeIds.map((id) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        // Check if image is already loaded and cached with proper validation
        if (preloadedImages[id] && preloadedImages[id].complete && preloadedImages[id].naturalHeight > 0) {
          // console.log(`Viseme image ${id} already preloaded and cached`);
          loadedCount++;
          setLoadingProgress(prev => ({ ...prev, images: Math.round((loadedCount / allVisemeIds.length) * 100) }));
          resolve(preloadedImages[id]);
          return;
        }

        const img = new Image();

        img.onload = () => {
          loadedCount++;
          const progress = Math.round((loadedCount / allVisemeIds.length) * 100);
          setLoadingProgress(prev => ({ ...prev, images: progress }));
          // console.log(`Successfully preloaded viseme image ${id} (${progress}%)`);
          resolve(img);
        };

        img.onerror = (e) => {
          console.error(`Failed to preload viseme image ${id}:`, e);
          reject(new Error(`Failed to load viseme image ${id}`));
        };

        // Set crossOrigin and src for proper loading
        img.crossOrigin = "anonymous";
        img.src = visemeImages[id as keyof typeof visemeImages];

        // Timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete) {
            console.warn(`Timeout loading viseme image ${id}`);
            reject(new Error(`Timeout loading viseme image ${id}`));
          }
        }, 10000);
      });
    });

    try {
      const loadedImages = await Promise.all(loadPromises);

      // Store all preloaded images with direct HTMLImageElement access
      const imageMap: { [key: number]: HTMLImageElement } = {};
      allVisemeIds.forEach((id, index) => {
        imageMap[id] = loadedImages[index];
      });

      setLoadingProgress(prev => ({ ...prev, images: 100 }));
      // console.log("All viseme images preloaded successfully");
      return imageMap;
    } catch (error) {
      console.error("Error preloading viseme images:", error);
      // Return partial results instead of failing completely
      const partialImageMap: { [key: number]: HTMLImageElement } = {};
      allVisemeIds.forEach((id) => {
        if (preloadedImages[id] && preloadedImages[id].complete) {
          partialImageMap[id] = preloadedImages[id];
        }
      });
      return partialImageMap;
    }
  }, [preloadedImages]);

  // Preload all viseme images on component mount
  // useEffect(() => {
  //   console.log("Preloading all viseme images for optimal performance...");
  //   preloadAllVisemeImages().then((imageMap) => {
  //     setPreloadedImages(imageMap);
  //     console.log("All viseme images preloaded on component mount");
  //   });
  // }, [preloadAllVisemeImages]);

  // Clear animation timeouts when component unmounts
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Listen for tutorial trigger from welcome dialog
  useEffect(() => {
    const handleStartTutorial = () => {
      setRunTutorial(true);
    };

    window.addEventListener('startTutorial', handleStartTutorial);
    return () => {
      window.removeEventListener('startTutorial', handleStartTutorial);
    };
  }, []);

  // Text-to-speech for tutorial instructions
  const speakTutorialInstruction = async (text: string) => {
    try {
      // Prevent overlapping TTS
      if (isSpeaking) {
        return;
      }

      setIsSpeaking(true);

      // Stop any existing tutorial audio
      if (tutorialAudioRef.current) {
        tutorialAudioRef.current.pause();
        tutorialAudioRef.current.currentTime = 0;
      }

      // Use the same SSML approach as the working "Hear" button
      let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
      ssmlText += `<voice name="en-US-AvaNeural">`;
      ssmlText += text;
      ssmlText += `</voice>`;
      ssmlText += `</speak>`;

      const response = await fetch("/api/pronunciation/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          ssml: ssmlText,
        }),
      });

      if (!response.ok) {
        setIsSpeaking(false);
        throw new Error(`Failed to synthesize speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      tutorialAudioRef.current = audio;

      // Add event listeners for better error handling
      audio.addEventListener('loadeddata', () => {
        audio.play().catch(error => {
          console.error('Error playing tutorial audio:', error);
          setIsSpeaking(false);
        });
      });

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);

        // Auto-advance to next step after TTS finishes if not manually advanced
        if (!manualAdvance && stepIndex < tutorialSteps.length - 1) {
          setTimeout(() => {
            setStepIndex(prev => prev + 1);
          }, 1000);
        }
        // Reset manual advance flag after TTS ends
        setManualAdvance(false);
      });

      audio.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
      });

      audio.load();
    } catch (error) {
      console.error('Error in tutorial TTS:', error);
      setIsSpeaking(false);
    }
  };

  // Joyride callback function
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    // If tutorial finishes, skips, or the close button is clicked, reset tutorial state
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status) || action === ACTIONS.CLOSE) {
      setRunTutorial(false);
      setStepIndex(0);
      setManualAdvance(false);
      if (tutorialAudioRef.current) {
        tutorialAudioRef.current.pause(); // Stop any ongoing speech
      }
      setIsSpeaking(false);

      // Play completion message when finished
      if (status === STATUS.FINISHED) {
        setTimeout(() => {
          speakTutorialInstruction("Way to go! You're ready to get started");
        }, 500);
      }
    } else if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);

      // Set manual advance flag when user clicks Next
      if (action === ACTIONS.NEXT) {
        setManualAdvance(true);

        // Stop current TTS before speaking next step
        if (tutorialAudioRef.current) {
          tutorialAudioRef.current.pause();
          tutorialAudioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
      }
    }
  };

  // Handle TTS for tutorial steps based on stepIndex changes
  useEffect(() => {
    if (!runTutorial || !tutorialSteps[stepIndex]) return;

    // Delay TTS to allow Joyride to render the step
    const timer = setTimeout(() => {
      speakTutorialInstruction(tutorialSteps[stepIndex].content);
    }, 1000);

    return () => clearTimeout(timer);
  }, [stepIndex, runTutorial]);

  // Setup carousel event listeners to fix Previous button
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Set initial index

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Set current mode to words - separate effect to ensure it always runs
  useEffect(() => {
    setCurrentMode('words');
  }, [setCurrentMode]);

  // Generate words containing specific sounds for targeted practice
  const handleGenerateWordsWithSound = async (targetSound: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-words-with-sound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          targetSound,
          difficulty,
          count: 8
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate words with sound");
      }

      const result = await response.json();

            const newWords: ProcessedWord[] = (result.data?.phrases || result.phrases || []).map(
        (item: any, index: number) => ({
          id: `word-${Date.now()}-sound-${index}`,
          text: item.text,
          syllabication: item.syllabication,
          status: "idle",
        })
      );

      // Fetch phonetic breakdown for all words
      try {
        const words = newWords.map(word => word.text);
        const phoneticResponse = await fetch('/api/pronunciation/phonetic-breakdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ words }),
        });

        if (phoneticResponse.ok) {
          const phoneticData = await phoneticResponse.json();
          
          // Update words with phonetic breakdown
          const wordsWithPhonetics = newWords.map(word => {
            const phoneticResult = phoneticData.results?.find((result: any) => result.word === word.text);
            return {
              ...word,
              phoneticBreakdown: phoneticResult?.phoneticBreakdown || word.text.toLowerCase()
            };
          });

          setProcessedWords(wordsWithPhonetics);
        } else {
          // If phonetic breakdown fails, just use the words without it
          setProcessedWords(newWords);
        }
      } catch (phoneticError) {
        console.error('Error fetching phonetic breakdown:', phoneticError);
        // If phonetic breakdown fails, just use the words without it
        setProcessedWords(newWords);
      }
      setCurrentWordIndex(0);
      setCurrentCarouselIndex(0);
      if (emblaApi) {
        emblaApi.scrollTo(0);
      }

      // Update topic to show focused practice
      setAiGenerateTopic(`Words that include "${targetSound}"`);

      scrollToPracticeSection();

      // Show success message
      toast({
        title: "Focused Practice Ready",
        description: `Generated words containing "${targetSound}" for targeted practice`,
      });
    } catch (error) {
      console.error("Error generating words with sound:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate focused practice words. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle finish practice and add summary card to carousel
  const handleFinishPractice = async () => {
    // Prevent duplicate finish cards
    if (processedWords.some(word => word.id === 'summary-card')) {
      return;
    }

    const wordsWithScores = processedWords.filter(word => 
      word.assessmentResult && word.assessmentResult.pronunciationScore !== null
    );

    // Add summary card immediately with loading state
    const summaryWord: ProcessedWord = {
      id: 'summary-card',
      text: 'Practice Session Complete!',
      status: 'complete'
    };

    setProcessedWords(prev => [...prev, summaryWord]);
    setShowSummary(true);
    setIsGeneratingFeedback(true);

    // Navigate to the summary card
    setTimeout(() => {
      if (emblaApi) {
        emblaApi.scrollTo(processedWords.length); // Go to the new summary card
      }
    }, 100);

    // Generate AI feedback asynchronously
    if (wordsWithScores.length > 0) {
      try {
        const sessionData = wordsWithScores.map(word => ({
          activityType: 'word_practice',
          itemPracticed: word.text,
          score: word.assessmentResult?.pronunciationScore || 0,
          accuracy: word.assessmentResult?.accuracyScore || 0,
          fluency: word.assessmentResult?.fluencyScore || 0,
          completeness: word.assessmentResult?.completenessScore || 0,
          difficulty: difficulty,
          metadata: word.assessmentResult,
          createdAt: new Date().toISOString()
        }));

        const response = await fetch('/api/user/pronunciation-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ sessionActivities: sessionData })
        });

        if (response.ok) {
          const feedback = await response.json();
          setSummaryFeedback(feedback);
        }
      } catch (error) {
        console.error('Error generating session feedback:', error);
      } finally {
        setIsGeneratingFeedback(false);
      }
    } else {
      setIsGeneratingFeedback(false);
    }
  };

  // Handle practice more words from summary
  const handlePracticeMoreWords = () => {
    // Select a random topic from available topics
    const topics = [
      "Commonly Used Words",
      "Family and Relationships", 
      "Home and Daily Life",
      "Food and Cooking",
      "Work and Career",
      "Health and Wellness",
      "Travel and Transportation",
      "Education and Learning",
      "Technology and Innovation",
      "Entertainment and Hobbies"
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    // Reset session and generate new words
    setShowSummary(false);
    setSummaryFeedback(null);
    setShowFeedbackInSummary(true);
    setProcessedWords([]);
    setCurrentCarouselIndex(0);
    // Reset topic selection to null to use topic-based generation
    setSelectedTopicType(null);

    // Generate new words for the random topic
    handleGenerateTopicWords(randomTopic);
  };

  // Handle feedback practice prompt in summary
  const handleSummaryPracticePrompt = (problemSound: string) => {
    // Reset session and handle different types of practice suggestions
    setShowSummary(false);
    setSummaryFeedback(null);
    setShowFeedbackInSummary(true);
    setProcessedWords([]);
    setCurrentCarouselIndex(0);

    // Handle different types of practice suggestions
    if (problemSound === "difficulty_increase") {
      // For high performers, increase difficulty and generate new topic words
      const currentDifficultyNum = parseInt(difficulty, 10);
      const newDifficultyNum = Math.min(currentDifficultyNum + 1, 8);
      const newDifficulty = newDifficultyNum.toString() as DifficultyLevel;
      setDifficulty(newDifficulty);

      // Generate words with increased difficulty from random topic
      const randomTopics = [
        "Animals", "Food", "Travel", "Sports", "Music", "Nature", "Technology", "Science",
        "Arts", "Business", "Health", "Education", "Entertainment", "Fashion", "Weather",
        "Family", "Friends", "Work", "Home", "Shopping", "Transportation", "Hobbies",
        "Books", "Movies", "Games", "Cooking", "Gardening", "Photography", "Exercise",
        "Medicine", "History", "Geography", "Culture", "Language", "Literature", "Architecture",
        "Mathematics", "Physics", "Chemistry", "Biology", "Environment", "Politics", "Economy",
        "Philosophy", "Psychology", "Sociology", "Religion", "Astronomy", "Agriculture", "Engineering"
      ];
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
      setAiGenerateTopic(randomTopic);
      handleGenerateTopicWords(randomTopic);
    } else if (problemSound === "new_topic") {
      // Generate words from a random new topic
      const randomTopics = [
        "Animals", "Food", "Travel", "Sports", "Music", "Nature", "Technology", "Science",
        "Arts", "Business", "Health", "Education", "Entertainment", "Fashion", "Weather",
        "Family", "Friends", "Work", "Home", "Shopping", "Transportation", "Hobbies",
        "Books", "Movies", "Games", "Cooking", "Gardening", "Photography", "Exercise",
        "Medicine", "History", "Geography", "Culture", "Language", "Literature", "Architecture",
        "Mathematics", "Physics", "Chemistry", "Biology", "Environment", "Politics", "Economy",
        "Philosophy", "Psychology", "Sociology", "Religion", "Astronomy", "Agriculture", "Engineering"
      ];
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
      setAiGenerateTopic(randomTopic);
      handleGenerateTopicWords(randomTopic);
    } else if (problemSound.length <= 3) {
      // Handle specific sound practice (single letters or short sounds)
      setSelectedTopicType("contain");
      handleGenerateWordsWithSound(problemSound);
    } else {
      // For any other feedback, check if problemSound is already a clean topic name or extract from quotes
      let extractedTopic = null;

      // First check if problemSound is already a clean topic name (direct from AI feedback)
      if (problemSound && problemSound.length <= 30 && !problemSound.includes('.') && 
          !problemSound.includes('?') && !problemSound.includes('!') && 
          !problemSound.toLowerCase().includes('sound') && !problemSound.toLowerCase().includes('letter')) {
        // Use the problemSound directly as the topic
        console.log(`Using direct topic from feedback: "${problemSound}"`);
        setAiGenerateTopic(problemSound);
        handleGenerateTopicWords(problemSound);
      } else {
        // Try to extract text from quotes
        const quotedTopicMatch = problemSound.match(/"([^"]+)"|'([^']+)'/);
        if (quotedTopicMatch) {
          extractedTopic = quotedTopicMatch[1] || quotedTopicMatch[2];
          // Only use if it's a reasonable topic name (short and clean)
          if (extractedTopic && extractedTopic.length <= 30 && !extractedTopic.includes('.') && 
              !extractedTopic.includes('?') && !extractedTopic.includes('!')) {
            console.log(`Extracted topic from feedback: "${extractedTopic}"`);
            setAiGenerateTopic(extractedTopic);
            handleGenerateTopicWords(extractedTopic);
          } else {
            // Fall back to random topic
            const randomTopics = [
              "Animals", "Food", "Travel", "Sports", "Music", "Nature", "Technology", "Science",
              "Arts", "Business", "Health", "Education", "Entertainment", "Fashion", "Weather",
              "Family", "Friends", "Work", "Home", "Shopping", "Transportation", "Hobbies",
              "Books", "Movies", "Games", "Cooking", "Gardening", "Photography", "Exercise",
              "Medicine", "History", "Geography", "Culture", "Language", "Literature", "Architecture",
              "Mathematics", "Physics", "Chemistry", "Biology", "Environment", "Politics", "Economy",
              "Philosophy", "Psychology", "Sociology", "Religion", "Astronomy", "Agriculture", "Engineering"
            ];
            const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
            setAiGenerateTopic(randomTopic);
            handleGenerateTopicWords(randomTopic);
          }
        } else {
          // No quotes found, use random topic
          const randomTopics = [
            "Animals", "Food", "Travel", "Sports", "Music", "Nature", "Technology", "Science",
            "Arts", "Business", "Health", "Education", "Entertainment", "Fashion", "Weather",
            "Family", "Friends", "Work", "Home", "Shopping", "Transportation", "Hobbies",
            "Books", "Movies", "Games", "Cooking", "Gardening", "Photography", "Exercise",
            "Medicine", "History", "Geography", "Culture", "Language", "Literature", "Architecture",
            "Mathematics", "Physics", "Chemistry", "Biology", "Environment", "Politics", "Economy",
            "Philosophy", "Psychology", "Sociology", "Religion", "Astronomy", "Agriculture", "Engineering"
          ];
          const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
          setAiGenerateTopic(randomTopic);
          handleGenerateTopicWords(randomTopic);
        }
      }
    }
  };

  // Close feedback suggestion
  const closeFeedbackSuggestion = () => {
    setShowFeedbackInSummary(false);
  };

  // Auto-scroll to practice section after words are generated
  const scrollToPracticeSection = () => {
    setTimeout(() => {
      const practiceSection = document.getElementById('practice-words-section');
      if (practiceSection) {
        practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  };

  // Preload all viseme images on component mount for optimal performance
  useEffect(() => {
    const preloadAllVisemeImages = async () => {
      console.log("Preloading all viseme images for optimal performance...");
      const allVisemeIds = Array.from({ length: 22 }, (_, i) => i); // Visemes 0-21

      try {
        const loadPromises = allVisemeIds.map((id) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load viseme ${id}`));
            img.crossOrigin = "anonymous";
            img.src = visemeImages[id as keyof typeof visemeImages];
          });
        });

        const loadedImages = await Promise.all(loadPromises);
        const imageMap: { [key: number]: HTMLImageElement } = {};
        allVisemeIds.forEach((id, index) => {
          imageMap[id] = loadedImages[index];
        });

        setPreloadedImages(imageMap);
        console.log("All viseme images preloaded successfully");
      } catch (error) {
        console.warn("Some viseme images failed to preload:", error);
      }
    };

    preloadAllVisemeImages();
  }, []);

  // Auto-load focused words or common words when the page opens
  useEffect(() => {
    if (!shareId) {
      if (focusSound) {
        // Generate words containing the specific sound for targeted practice
        handleGenerateWordsWithSound(focusSound);
      } else {
        handleGenerateTopicWords("Commonly Used Words");
      }
    }
  }, [focusSound]);

  // Handle topic card click
  const handleTopicCardClick = (topic: string) => {
    if (topic === "Alphabet") {
      handleGenerateAlphabet();
    } else if (topic === "Words that Start with..") {
      setSelectedTopicType('start');
      setSelectedLetterTab('letters'); // Default to letters tab
      setShowLetterDialog(true);
    } else if (topic === "Words that Contain..") {
      setSelectedTopicType('contain');
      setSelectedLetterTab('letters'); // Default to letters tab
      setShowLetterDialog(true);
    } else if (topic === "Words that End with..") {
      setSelectedTopicType('end');
      setSelectedLetterTab('letters'); // Default to letters tab
      setShowLetterDialog(true);
    } else {
      handleGenerateTopicWords(topic);
    }
  };

  // Generate alphabet cards
  const handleGenerateAlphabet = () => {
    const alphabetWords: ProcessedWord[] = letterOptionsAlphabet.map(
      (letter, index) => ({
        id: `alphabet-<span class="math-inline">\{Date\.now\(\)\}\-</span>{index}`,
        text: letter,
        status: "idle",
      })
    );

    setProcessedWords(alphabetWords);
    setCurrentWordIndex(0);
    setCurrentCarouselIndex(0);
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
    scrollToPracticeSection();
  };

  // Handle letter selection for word generation
  const handleLetterSelection = (letter: string) => {
    setShowLetterDialog(false);

    let topicString = "";
    if (selectedTopicType === 'start') {
      topicString = `Words that start with ${letter}`;
    } else if (selectedTopicType === 'contain') {
      topicString = `Words that contain ${letter}`;
    } else if (selectedTopicType === 'end') {
      topicString = `Words that end with ${letter}`;
    }

    handleGenerateTopicWords(topicString);
    setSelectedTopicType(null);
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

            const newWords: ProcessedWord[] = (result.data?.phrases || result.words || []).map(
        (item: any, index: number) => {
          // Handle both old format (string) and new format (object with text and syllabication)
          if (typeof item === 'string') {
            return {
              id: `word-<span class="math-inline">\{Date\.now\(\)\}\-topic\-</span>{index}`,
              text: item,
              status: "idle",
            };
          } else if (item && typeof item === 'object' && item.text) {
            return {
              id: `word-<span class="math-inline">\{Date\.now\(\)\}\-topic\-</span>{index}`,
              text: item.text,
              syllabication: item.syllabication,
              status: "idle",
            };
          } else {
            return {
              id: `word-<span class="math-inline">\{Date\.now\(\)\}\-topic\-</span>{index}`,
              text: `Word ${index + 1}`,
              status: "idle",
            };
          }
        }
      );

      // Fetch phonetic breakdown for all words
      try {
        const words = newWords.map(word => word.text);
        const phoneticResponse = await fetch('/api/pronunciation/phonetic-breakdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ words }),
        });

        if (phoneticResponse.ok) {
          const phoneticData = await phoneticResponse.json();
          
          // Update words with phonetic breakdown
          const wordsWithPhonetics = newWords.map(word => {
            const phoneticResult = phoneticData.results?.find((result: any) => result.word === word.text);
            return {
              ...word,
              phoneticBreakdown: phoneticResult?.phoneticBreakdown || word.text.toLowerCase()
            };
          });

          setProcessedWords(wordsWithPhonetics);
        } else {
          // If phonetic breakdown fails, just use the words without it
          setProcessedWords(newWords);
        }
      } catch (phoneticError) {
        console.error('Error fetching phonetic breakdown:', phoneticError);
        // If phonetic breakdown fails, just use the words without it
        setProcessedWords(newWords);
      }

      setCurrentWordIndex(0);
      setCurrentCarouselIndex(0);
      if (emblaApi) {
        emblaApi.scrollTo(0);
      }
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
      currentWordIndexRef.current = wordIndex; // Set ref to ensure accurate callback execution
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
      currentWordIndexRef.current = -1; // Reset ref on error

      // Reset word status
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    }
  };

  // Stop recording the word
  const stopWordPractice = async () => {
    try {
      await stopRecording();
      toast({
        title: "Recording Stopped",
        description: "Processing your pronunciation...",
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording properly",
        variant: "destructive",
      });
    }
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

      const assessmentResult = result.data || result;

      // Validate the result has expected properties
      if (typeof assessmentResult.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      // Update with results
      setWordAssessmentResult(assessmentResult);

      // Update in the words array
      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                assessmentResult: assessmentResult,
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
    currentWordIndexRef.current = -1; // Reset ref on cancel

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
    // Always use the regular word text for TTS, not syllabication
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
      const response = await fetch("/api/pronunciation/synthesize", {
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

  // Draw viseme on canvas for smooth rendering
  const drawVisemeOnCanvas = (visemeId: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = preloadedImages[visemeId];
    if (img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };

  // Preload images for specific viseme IDs with comprehensive error handling
  const preloadVisemeImages = async (visemeIds: number[]): Promise<void> => {
    // console.log("Preloading viseme images for IDs:", visemeIds);
    setImagesReady(false);

    // Always include viseme 0 (neutral position) for smooth transitions
    const idsToLoad = [0, ...visemeIds].filter((id, index, arr) => arr.indexOf(id) === index);

    // Use Promise.all to ensure all images are fully loaded before continuing
    const loadPromises = idsToLoad.map((id) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        // Check if image is already loaded and in cache
        if (preloadedImages[id] && preloadedImages[id].complete) {
          // console.log(`Viseme image ${id} already preloaded and cached`);
          resolve(preloadedImages[id]);
          return;
        }

        const img = new Image();

        img.onload = () => {
          // console.log(`Successfully preloaded viseme image ${id}`);
          resolve(img);
        };

        img.onerror = (e) => {
          console.error(`Failed to preload viseme image ${id}:`, e);
          reject(new Error(`Failed to load viseme image ${id}`));
        };

        // Set crossOrigin to handle potential CORS issues
        img.crossOrigin = "anonymous";
        img.src = visemeImages[id as keyof typeof visemeImages];

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete) {
            console.warn(`Timeout loading viseme image ${id}`);
            reject(new Error(`Timeout loading viseme image ${id}`));
          }
        }, 5000);
      });
    });

    try {
      const loadedImages = await Promise.all(loadPromises);

      // Update preloaded images state with all loaded images
      const newPreloadedImages: { [key: number]: HTMLImageElement } = { ...preloadedImages };
      idsToLoad.forEach((id, index) => {
        newPreloadedImages[id] = loadedImages[index];
      });

      setPreloadedImages(newPreloadedImages);
      setImagesReady(true);
      // console.log("All viseme images preloaded successfully");

    } catch (error) {
      console.error("Error preloading viseme images:", error);
      // Try to continue with partial loading
      setImagesReady(true);
    }
  };

  // Generate viseme animation for a word
  const generateVisemeAnimation = async (word: string) => {
    if (!word.trim()) {
      toast({
        title: "Error",
        description: "No word provided for animation",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingVisemes(true);
    setCurrentVisemeWord(word);
    setShowVisemeDialog(true);
    setCurrentVisemeId(0);
    setImagesReady(false);
    setAudioReady(false);
    setAnimationReady(false);

    try {
      const response = await fetch("/api/visemes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: word.trim(),
          voice: "en-US-AriaNeural",
          format: "svg",
          speed: 0.65 // 65% speed for slow demonstration
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate visemes: ${response.statusText}`);
      }

      const data: VisemeResponse = await response.json();

      // Convert base64 audio data to blob URL
      const binaryString = atob(data.audioBuffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBlob = new Blob([bytes.buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(audioBlob);
      setVisemeAudioUrl(url);
      setVisemeData(data.visemes);

      // Get unique viseme IDs and preload their images
      const uniqueVisemeIds: number[] = [];
      data.visemes.forEach(v => {
        if (!uniqueVisemeIds.includes(v.visemeId)) {
          uniqueVisemeIds.push(v.visemeId);
        }
      });
      console.log("Unique viseme IDs to preload:", uniqueVisemeIds);

      // Preload all required images and prepare audio simultaneously
      const [imagesResult, audioResult] = await Promise.all([
        preloadVisemeImages(uniqueVisemeIds),
        prepareAudioForPlayback(url)
      ]);

      // Set animation ready only after both images and audio are prepared
      setAnimationReady(true);

      // Auto-play the animation once everything is ready
      setTimeout(() => {
        playVisemeAnimation();
      }, 100);

    } catch (error) {
      console.error("Error generating visemes:", error);
      setShowVisemeDialog(false);
    } finally {
      setIsGeneratingVisemes(false);
    }
  };

  // 2. Guaranteed Audio Readiness and Playback Control with explicit canplaythrough event
  const prepareAudioForPlayback = React.useCallback(async (audioUrl: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!visemeAudioRef.current) {
        reject(new Error("Audio element not available"));
        return;
      }

      const audio = visemeAudioRef.current;
      setLoadingProgress(prev => ({ ...prev, audio: 0 }));

      const handleCanPlayThrough = () => {
        console.log("Audio ready for synchronized playback - canplaythrough event received");
        setAudioReady(true);
        setLoadingProgress(prev => ({ ...prev, audio: 100 }));
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('progress', handleProgress);
        resolve();
      };

      const handleError = (e: Event) => {
        console.error("Audio preparation failed:", e);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('progress', handleProgress);
        reject(new Error("Audio preparation failed"));
      };

      const handleLoadStart = () => {
        console.log("Audio loading started");
        setLoadingProgress(prev => ({ ...prev, audio: 10 }));
      };

      const handleProgress = () => {
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const duration = audio.duration || 1;
          const progress = Math.round((bufferedEnd / duration) * 90); // 90% max for progress, 100% for canplaythrough
          setLoadingProgress(prev => ({ ...prev, audio: Math.min(progress, 90) }));
        }
      };

      // Add comprehensive event listeners for loading feedback
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('progress', handleProgress);

      // Set audio source and preload
      audio.src = audioUrl;
      audio.preload = 'auto';
      audio.load();

      // Extended timeout with better fallback handling
      setTimeout(() => {
        if (!audioReady) {
          console.warn("Audio preparation timeout, checking readyState");
          // Check if audio is actually ready despite timeout
          if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
            console.log("Audio appears ready despite timeout, proceeding");
            setAudioReady(true);
            setLoadingProgress(prev => ({ ...prev, audio: 100 }));
            resolve();
          } else {
            console.error("Audio not ready after timeout");
            reject(new Error("Audio preparation timeout"));
          }
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('loadstart', handleLoadStart);
          audio.removeEventListener('progress', handleProgress);
        }
      }, 8000); // Extended timeout
    });
  }, [audioReady]);

  // 3. Precise Audio-Visual Synchronization Logic with requestAnimationFrame and optimized nextVisemeIndex lookup
  const playVisemeAnimation = React.useCallback(async () => {
    if (!visemeAudioRef.current || !visemeData.length || !visemeAudioUrl) {
      console.error("Animation prerequisites not met");
      return;
    }

    // Ensure both images and audio are ready before starting
    if (!animationReady || !imagesReady || !audioReady) {
      console.log("Waiting for animation to be ready...", { animationReady, imagesReady, audioReady });
      return;
    }

    // Clear any existing animation frames and timeouts
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    setIsPlayingVisemes(true);
    setCurrentVisemeId(0);
    setNextVisemeIndex(0);

    console.log("Starting synchronized viseme animation with", visemeData.length, "visemes");
    console.log("Viseme timing data:", visemeData.map(v => ({ id: v.visemeId, offset: v.audioOffset })));

    try {
      const audio = visemeAudioRef.current;

      // Reset audio to beginning
      audio.currentTime = 0;
      audio.playbackRate = 1.0;

      // Centralized cleanup function
      const cleanupEventListeners = () => {
        if (currentEventListenersRef.current.timeupdate) {
          audio.removeEventListener("timeupdate", currentEventListenersRef.current.timeupdate);
        }
        if (currentEventListenersRef.current.ended) {
          audio.removeEventListener("ended", currentEventListenersRef.current.ended);
        }
        if (currentEventListenersRef.current.error) {
          audio.removeEventListener("error", currentEventListenersRef.current.error);
        }
        currentEventListenersRef.current = {};

        // Cancel any pending animation frames
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      // Store cleanup function for later use
      cleanupFunctionsRef.current.push(cleanupEventListeners);

      // Optimized viseme synchronization using requestAnimationFrame
      let currentVisemeIndex = 0;
      const syncVisemeWithAudio = () => {
        if (!audio || audio.paused || audio.ended) return;

        const currentTime = audio.currentTime * 1000; // Convert to milliseconds

        // Optimized nextVisemeIndex lookup to minimize drift
        while (currentVisemeIndex < visemeData.length - 1 && 
               currentTime >= visemeData[currentVisemeIndex + 1].audioOffset) {
          currentVisemeIndex++;
        }

        const targetVisemeId = visemeData[currentVisemeIndex]?.visemeId || 0;

        // Update viseme with requestAnimationFrame for smooth rendering
        setCurrentVisemeId(prevId => {
          if (prevId !== targetVisemeId) {
            console.log(`RAF: Syncing viseme ${targetVisemeId} at time ${currentTime.toFixed(0)}ms`);
            return targetVisemeId;
          }
          return prevId;
        });

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(syncVisemeWithAudio);
      };

      // Set up event handlers for precise control with useCallback optimization
      const handleAudioEnd = React.useCallback(() => {
        console.log("Audio playback completed");
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        cleanupEventListeners();
      }, []);

      const handleAudioError = React.useCallback((e: Event) => {
        console.error("Audio error during synchronized playback:", e);
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        cleanupEventListeners();

        toast({
          title: "Audio Error",
          description: "Audio playback encountered an error.",
          variant: "destructive",
        });
      }, [toast]);

      // Store event listeners in ref for cleanup
      currentEventListenersRef.current = {
        ended: handleAudioEnd,
        error: handleAudioError
      };

      // Attach event listeners for control
      audio.addEventListener("ended", handleAudioEnd);
      audio.addEventListener("error", handleAudioError);

      // Start audio playback and animation synchronization
      await audio.play();

      // Start requestAnimationFrame-based synchronization for smooth visuals
      animationFrameRef.current = requestAnimationFrame(syncVisemeWithAudio);

      console.log("Synchronized audio-visual playback started successfully with RAF");

    } catch (error) {
      console.error("Error in synchronized playback:", error);
      setIsPlayingVisemes(false);
      setCurrentVisemeId(0);

      toast({
        title: "Playback Error",
        description: "Could not play the animation. Please try again.",
        variant: "destructive",
      });
    }
  }, [visemeAudioRef, visemeData, visemeAudioUrl, animationReady, imagesReady, audioReady, toast]);

  // 6. Centralized Animation Control with comprehensive cleanup
  const stopVisemeAnimation = React.useCallback(() => {
    // Clear all timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Execute all stored cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    cleanupFunctionsRef.current = [];

    if (visemeAudioRef.current) {
      const audio = visemeAudioRef.current;

      // Clean up event listeners using the stored references
      if (currentEventListenersRef.current.timeupdate) {
        audio.removeEventListener("timeupdate", currentEventListenersRef.current.timeupdate);
      }
      if (currentEventListenersRef.current.ended) {
        audio.removeEventListener("ended", currentEventListenersRef.current.ended);
      }
      if (currentEventListenersRef.current.error) {
        audio.removeEventListener("error", currentEventListenersRef.current.error);
      }
      currentEventListenersRef.current = {};

      audio.pause();
      audio.currentTime = 0;
    }

    // Clean up blob URLs to prevent memory leaks
    if (visemeAudioUrl) {
      URL.revokeObjectURL(visemeAudioUrl);
    }

    setIsPlayingVisemes(false);
    setCurrentVisemeId(0);
    setCanPlay(false);
  }, [visemeAudioUrl]);

  // Save a word to user's collection
  const saveWordToCollection = async (wordIndex: number) => {
    if (!isAuthenticated) {
      setPendingSaveIndex(wordIndex);
      setShowSignInDialog(true);
      return;
    }

    const word = processedWords[wordIndex];
    if (!word || savedWords.has(word.text)) return;

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/user/saved-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          word: word.text,
          syllabication: word.phoneticBreakdown || word.syllabication,
          difficulty: word.difficulty || "beginner",
          source: "words"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save word");
      }

      setSavedWords(prev => {
        const newSet = new Set(prev);
        newSet.add(word.text);
        return newSet;
      });
    } catch (error) {
      console.error("Error saving word:", error);
    }
  };

  const getLetterOptions = () => {
    if (selectedTopicType === 'start') {
      return {
        letters: letterOptionsAlphabet,
        otherSounds: letterOptionsStartSounds
      };
    } else if (selectedTopicType === 'contain') {
      return {
        letters: letterOptionsAlphabet,
        otherSounds: letterOptionsContainSounds
      };
    } else if (selectedTopicType === 'end') {
      return {
        letters: letterOptionsAlphabet,
        otherSounds: letterOptionsEndSounds
      };
    }
    return { letters: [], otherSounds: [] };
  };

  const currentLetterOptions = getLetterOptions();

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
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

      {/* Letter selection dialog */}
      <Dialog open={showLetterDialog} onOpenChange={setShowLetterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white bg-blue-600 -mx-6 -mt-6 px-6 py-4 mb-4 rounded-t-lg">
              {selectedTopicType === 'start' && "Words that Start with..."}
              {selectedTopicType === 'contain' && "Words that Contain..."}
              {selectedTopicType === 'end' && "Words that End with..."}
            </DialogTitle>
            <DialogDescription className="text-gray-700 font-medium">
              Choose a letter or sound group to generate words.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={selectedLetterTab} onValueChange={(value) => setSelectedLetterTab(value as "letters" | "otherSounds")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-200">
              <TabsTrigger value="letters" className="data-[state=active]:bg-[#1947e5] data-[state=active]:text-white data-[state=active]:shadow-md">Letters</TabsTrigger>
              <TabsTrigger value="otherSounds" className="data-[state=active]:bg-[#1947e5] data-[state=active]:text-white data-[state=active]:shadow-md">Other Sounds</TabsTrigger>
            </TabsList>
            <TabsContent value="letters">
              <div className="grid grid-cols-6 md:grid-cols-8 gap-2 p-4">
                {currentLetterOptions.letters.map((letter) => (
                  <Card
                    key={letter}
                    className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-12"
                    style={{ backgroundColor: '#1947e5' }}
                    onClick={() => handleLetterSelection(letter)}
                  >
                    <CardContent className="p-2 text-center flex items-center justify-center h-full">
                      <p className="font-bold text-white text-xs">{letter}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="otherSounds">
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-4">
                {currentLetterOptions.otherSounds.map((sound) => (
                  <Card
                    key={sound}
                    className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-12"
                    style={{ backgroundColor: '#1947e5' }}
                    onClick={() => handleLetterSelection(sound)}
                  >
                    <CardContent className="p-2 text-center flex items-center justify-center h-full">
                      <p className="font-bold text-white text-xs">{sound.replace(/_/g, ' ')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Viseme animation dialog */}
      <Dialog open={showVisemeDialog} onOpenChange={setShowVisemeDialog}>
        <DialogContent className="max-w-lg bg-blue-50 border-blue-200">
          <DialogHeader>
            <DialogTitle className="text-white bg-blue-600 -mx-6 -mt-6 px-6 py-4 mb-4 rounded-t-lg">
              Lip Animation - "{currentVisemeWord}"
            </DialogTitle>
            <DialogDescription className="text-blue-800 font-medium">
              Watch how to pronounce this word with slow lip movements.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start space-x-6">
            {/* Animation display - left aligned */}
            <div 
              className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-blue-200 flex-shrink-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${visemeImages[currentVisemeId as keyof typeof visemeImages]})`,
                transform: isPlayingVisemes ? 'scale(1.01)' : 'scale(1)',
                transition: 'transform 0.1s ease-out',
                filter: isPlayingVisemes ? 'brightness(1.05)' : 'brightness(1)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Loading overlay */}
              {isGeneratingVisemes && (
                <div className="absolute inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Generating animation...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Speech bubble - stationary on the right */}
            <div className="flex items-center h-48">
              <div className="relative bg-blue-500 text-white px-4 py-3 rounded-2xl text-base font-medium shadow-lg max-w-[150px]">
                "{currentVisemeWord}"
                {/* Simple triangle speech bubble tail pointing left to lips */}
                <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-blue-500"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">

            {/* 5. Enhanced Loading States and User Feedback */}
            {(isGeneratingVisemes || !canPlay) && (
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="space-y-3">
                  {/* Image Loading Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Loading Images</span>
                      <span className="text-sm text-blue-600">{loadingProgress.images}%</span>
                    </div>
                    <Progress value={loadingProgress.images} className="h-2" />
                  </div>

                  {/* Audio Loading Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Loading Audio</span>
                      <span className="text-sm text-blue-600">{loadingProgress.audio}%</span>
                    </div>
                    <Progress value={loadingProgress.audio} className="h-2" />
                  </div>

                  {/* Status Messages */}
                  <div className="text-center pt-2">
                    {isGeneratingVisemes && (
                      <p className="text-blue-700 font-medium">Generating lip animation data...</p>
                    )}
                    {!isGeneratingVisemes && !imagesReady && (
                      <p className="text-blue-600">Loading viseme images...</p>
                    )}
                    {!isGeneratingVisemes && !audioReady && imagesReady && (
                      <p className="text-blue-600">Preparing audio for synchronized playback...</p>
                    )}
                    {!isGeneratingVisemes && imagesReady && audioReady && !canPlay && (
                      <p className="text-blue-600">Finalizing animation setup...</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status and Controls */}
            <div className="text-center">
              {!isGeneratingVisemes && canPlay && (
                <div className="space-y-3">
                  <p className="text-green-600 font-medium">Animation ready to play!</p>

                  <div className="flex justify-center space-x-3">
                    <Button
                      onClick={playVisemeAnimation}
                      disabled={isPlayingVisemes || !canPlay}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {isPlayingVisemes ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Play Animation
                        </>
                      )}
                    </Button>

                    {isPlayingVisemes && (
                      <Button
                        onClick={stopVisemeAnimation}
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden audio element for viseme playback */}
          {visemeAudioUrl && (
            <audio
              ref={visemeAudioRef}
              src={visemeAudioUrl}
              preload="auto"
              style={{ display: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1537cc] mb-2">Practice Words</h1>
              <p className="text-muted-foreground">
                Generate and practice words to improve your speech clarity and pronunciation
              </p>
            </div>
            <Button
              onClick={() => setRunTutorial(true)}
              variant="outline"
              className="flex items-center gap-2 bg-[#ff7f7c] hover:bg-[#ff6c69] border-[#ff7f7c] text-white"
            >
              <Users className="h-4 w-4" />
              Tutorial
            </Button>
          </div>
        </div>

        {/* Select Your Topic Section */}
        <Card className="mb-6 bg-white">
          <CardContent className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-[#1537cc]">Select Your Topic</h2>
              <div className="words-level-button">
                <DifficultyDropdown />
              </div>
            </div>

            {/* Topic Cards */}
            <div className="mb-6 topic-selection-area">
              <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto pr-16">
                  {displayTopics.map((topic) => (
                    <Card
                      key={topic}
                      className="cursor-pointer hover:shadow-md hover:border-[#0F3CC9] transition-all duration-200 h-12 bg-white border-2 border-[#1537cc]"
                      onClick={() => handleTopicCardClick(topic)}
                    >
                      <CardContent className="p-2 text-center flex items-center justify-center h-full">
                        <p className="font-bold text-[#1537cc] text-xs sm:text-sm truncate">{topic}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Right arrow positioned on the right */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                  <Button
                    onClick={() => setTopicPage((prevPage) => (prevPage + 1) % totalTopicPages)}
                    variant="ghost"
                    className="text-[#1947e5] hover:text-[#0F3CC9] p-2 animate-bounce"
                    style={{ animationDuration: '2s' }}
                  >
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Custom Topic Input */}
            <div className="mb-6">
              <p className="text-lg font-extrabold text-[#1537cc] mb-3">Or enter a custom topic:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a topic you'd like to practice words about..."
                  value={aiGenerateTopic}
                  onChange={(e) => setAiGenerateTopic(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateTopicWords(aiGenerateTopic);
                    }
                  }}
                  className="flex-1 bg-[#f9fafb] border border-[#1537cc] focus:border-[#1537cc] focus:ring-[#1537cc] custom-topic-input"
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => handleGenerateTopicWords(aiGenerateTopic)}
                  disabled={isProcessing || !aiGenerateTopic.trim()}
                  className="bg-[#1947E5] hover:bg-[#1537CC] text-white border-0"
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practice section */}
                {processedWords.length > 0 && (
                  <div id="practice-words-section" className="space-y-6 practice-cards-area">
                    {/* Progress indicator */}
                    <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
                      <Progress 
                        value={((currentCarouselIndex + 1) / processedWords.length) * 100} 
                        className="h-3 bg-[#f9fafb] [&_div]:bg-[#1537cc]"
                      />
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
                      <Button
                        onClick={scrollPrev}
                        disabled={!canScrollPrev}
                        variant="outline"
                        size="sm"
                        className={`flex items-center gap-2 ${
                          !canScrollPrev
                            ? "bg-[#f9fafb] text-gray-400 border-gray-200" // Light grey when not selectable
                            : "bg-[#f0eded] hover:bg-gray-300 text-gray-800 border-gray-400" // Dark grey when selectable
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {showSummary && currentCarouselIndex >= processedWords.length - 1 
                            ? `${processedWords.filter(w => w.id !== 'summary-card').length} of ${processedWords.filter(w => w.id !== 'summary-card').length}` 
                            : `${currentCarouselIndex + 1} of ${processedWords.filter(w => w.id !== 'summary-card').length}`}
                        </span>
                      </div>

                      {/* Show Finish button only at the end instead of Next, or Practice More if on summary */}
                      {showSummary ? (
                        <Button
                          onClick={handlePracticeMoreWords}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                          size="sm"
                        >
                          Practice More Words
                        </Button>
                      ) : (!canScrollNext && processedWords.filter(w => w.status === 'complete' && w.id !== 'summary-card').length > 0) ? (
                        <Button
                          onClick={handleFinishPractice}
                          disabled={isGeneratingFeedback}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                          size="sm"
                        >
                          {isGeneratingFeedback ? (
                            <>
                              <RotateCw className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Flag className="h-4 w-4" />
                              Finish
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={scrollNext}
                          disabled={!canScrollNext}
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-2 ${
                            !canScrollNext
                              ? "bg-[#f9fafb] text-gray-400 border-gray-200" // Light grey when not selectable
                              : "bg-[#f0eded] hover:bg-gray-300 text-gray-800 border-gray-400" // Dark grey when selectable
                          }`}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Carousel - Centered with max width */}
                    <div className="flex justify-center">
                      <div className="embla w-full max-w-lg" ref={emblaRef}>
                        <div className="embla__container flex">
                          {processedWords.map((word, index) => (
                            <div key={`${word.id}-${index}`} className="embla__slide flex-[0_0_100%] px-2">
                              {word.id === 'summary-card' ? (
                                // Summary Card - Match exact styling of regular word cards
                                <Card className="h-full shadow-lg border-0 card-content w-full max-w-full overflow-hidden" style={{ backgroundColor: '#1947e5' }}>
                                  <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                                    {/* Celebratory particles effect */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                      <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                                      <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                      <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                                      <div className="absolute top-6 right-1/4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
                                    </div>
                                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 relative z-10 break-words">
                                      🎉 Practice Session Complete! 🎉
                                    </CardTitle>
                                    <CardDescription className="text-white/90 mt-2 text-base relative z-10 break-words">
                                      Excellent work! You've completed your practice session
                                    </CardDescription>
                                  </CardHeader>

                                  <CardContent className="px-4 pb-4 text-white space-y-4 max-h-96 overflow-y-auto w-full">
                                    {/* Performance Bubbles */}
                                    <div className="grid grid-cols-4 gap-2 w-full">
                                      {(() => {
                                        const wordsWithScores = processedWords.filter(w => 
                                          w.assessmentResult && w.assessmentResult.pronunciationScore !== null && w.id !== 'summary-card'
                                        );

                                        if (wordsWithScores.length === 0) {
                                          return (
                                            <div className="col-span-4 text-center p-2 bg-white rounded-lg">
                                              <div className="text-sm text-gray-700">No scores available yet</div>
                                              <div className="text-xs text-gray-500">Practice some words to see your results</div>
                                            </div>
                                          );
                                        }

                                        const avgPronunciation = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.pronunciationScore || 0), 0) / wordsWithScores.length);
                                        const avgAccuracy = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.accuracyScore || 0), 0) / wordsWithScores.length);
                                        const avgFluency = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.fluencyScore || 0), 0) / wordsWithScores.length);
                                        const avgCompleteness = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.completenessScore || 0), 0) / wordsWithScores.length);

                                        return (
                                          <>
                                            <div className="text-center p-2 bg-white rounded-lg">
                                              <div className="text-lg font-bold text-[#1947e5]">{avgPronunciation}%</div>
                                              <div className="text-xs text-gray-600">Pronunciation</div>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg">
                                              <div className="text-lg font-bold text-[#1947e5]">{avgAccuracy}%</div>
                                              <div className="text-xs text-gray-600">Accuracy</div>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg">
                                              <div className="text-lg font-bold text-[#1947e5]">{avgFluency}%</div>
                                              <div className="text-xs text-gray-600">Fluency</div>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded-lg">
                                              <div className="text-lg font-bold text-[#1947e5]">{avgCompleteness}%</div>
                                              <div className="text-xs text-gray-600">Completeness</div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>

                                    {/* AI Feedback Section */}
                                    {isGeneratingFeedback ? (
                                      <div className="p-3 bg-white rounded-lg w-full max-w-full">
                                        <h4 className="text-sm font-semibold text-[#1947e5] mb-2 flex items-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1947e5] flex-shrink-0"></div>
                                          <span className="break-words">Generating Feedback...</span>
                                        </h4>
                                        <p className="text-gray-600 text-xs break-words">Analyzing your practice session</p>
                                      </div>
                                    ) : summaryFeedback && showFeedbackInSummary && summaryFeedback.practicePrompt && (
                                      <div className="p-3 bg-white rounded-lg w-full max-w-full overflow-hidden">
                                        <h4 className="text-sm font-semibold text-[#1947e5] mb-2 flex items-center gap-2">
                                          <Lightbulb className="h-4 w-4 flex-shrink-0" />
                                          <span className="break-words">Personalized Feedback</span>
                                        </h4>
                                        <div className="max-h-20 overflow-y-auto mb-3">
                                          <p className="text-gray-700 text-xs break-words whitespace-normal leading-tight">{summaryFeedback.practicePrompt.question}</p>
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                          <Button
                                            onClick={() => handleSummaryPracticePrompt(summaryFeedback.practicePrompt!.problemSound)}
                                            className="bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 text-xs px-3 py-1"
                                            size="sm"
                                          >
                                            Yes
                                          </Button>
                                          <Button
                                            onClick={closeFeedbackSuggestion}
                                            className="bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0 text-xs px-3 py-1"
                                            size="sm"
                                          >
                                            No Thanks
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Words Below 70% */}
                                    {(() => {
                                      const wordsBelow70 = processedWords.filter(w => 
                                        w.assessmentResult && w.assessmentResult.pronunciationScore < 70 && w.id !== 'summary-card'
                                      );

                                      if (wordsBelow70.length > 0) {
                                        return (
                                          <div className="w-full max-w-full p-3 bg-white rounded-lg">
                                            <h4 className="text-sm font-semibold text-[#1947e5] mb-2">Words to Practice More</h4>
                                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                              {wordsBelow70.slice(0, 3).map((w, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                                    <span className="text-gray-800 text-xs font-medium truncate">{w.text}</span>
                                                    {w.phoneticBreakdown && (
                                                      <span className="text-gray-600 text-xs truncate">({w.phoneticBreakdown})</span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Button
                                                      onClick={() => {
                                                        // Find the word index in processedWords and save it
                                                        const wordIndex = processedWords.findIndex(word => word.text === w.text);
                                                        if (wordIndex !== -1) {
                                                          saveWordToCollection(wordIndex);
                                                        }
                                                      }}
                                                      variant="outline"
                                                      size="sm"
                                                      className={`h-6 px-2 text-xs border-0 ${
                                                        savedWords.has(w.text)
                                                          ? "bg-green-600 hover:bg-green-700 text-white"
                                                          : "bg-[#6366F1] hover:bg-[#5855EB] text-white"
                                                      }`}
                                                      disabled={savedWords.has(w.text)}
                                                    >
                                                      <Star className={`h-3 w-3 ${savedWords.has(w.text) ? 'fill-white' : ''}`} />
                                                    </Button>
                                                    <span className="text-red-600 text-xs font-bold">{Math.round(w.assessmentResult?.pronunciationScore || 0)}%</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </CardContent>
                                </Card>
                              ) : (
                                // Regular Word Card
                                <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                                  <CardHeader className="text-center">
                                    <CardTitle className="text-3xl font-bold text-white">{word.text}</CardTitle>
                                  {word.phoneticBreakdown && (
                                    <div className="text-lg italic mt-2">
                                      {word.status === "complete" && word.assessmentResult?.wordLevelResults?.[0] && 
                                       (word.assessmentResult.wordLevelResults[0] as any).syllables ? (
                                        // Show color-coded syllables based on assessment results
                                        mapSyllablesToDisplay(word.phoneticBreakdown, (word.assessmentResult.wordLevelResults[0] as any).syllables, word.assessmentResult.pronunciationScore).map((syllable, index) => (
                                          <span 
                                            key={index}
                                            style={{ color: syllable.color }}
                                            className="font-semibold"
                                          >
                                            {syllable.text}
                                            {index < mapSyllablesToDisplay(word.phoneticBreakdown || '', (word.assessmentResult?.wordLevelResults?.[0] as any)?.syllables || [], word.assessmentResult?.pronunciationScore).length - 1 && ' · '}
                                          </span>
                                        ))
                                      ) : (
                                        // Default display when no assessment data is available
                                        <span className="text-white/80">{word.phoneticBreakdown}</span>
                                      )}
                                    </div>
                                  )}
                                </CardHeader>

                                <CardContent className="space-y-4">
                                  {/* Recording Controls */}
                                  <div className="flex justify-center gap-2">
                                    {word.status === "idle" && (
                                      <Button
                                        onClick={() => startWordPractice(index)}
                                        className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 start-recording-button"
                                        disabled={isRecording || isProcessingRecording}
                                      >
                                        <Mic className="h-5 w-5" />
                                        Start Recording
                                      </Button>
                                    )}

                                    {word.status === "recording" && (
                                      <Button
                                        onClick={stopWordPractice}
                                        variant="destructive"
                                        className="flex items-center gap-2 stop-recording-button"
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
                                          onClick={() => startWordPractice(index)}
                                          className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                                        >
                                          <RotateCw className="h-5 w-5" />
                                          Try Again
                                        </Button>
                                        {word.recordingUrl && (
                                          <AudioPlaybackButton
                                            audioUrl={word.recordingUrl}
                                            buttonText="Listen to me"
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                                            icon={<Volume2 className="h-4 w-4" />}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Hear, Slow Switch + See */}
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      onClick={() => handleTextToSpeech(index)}
                                      variant="outline"
                                      className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0 hear-button"
                                    >
                                      <Ear className="h-4 w-4 mr-1" />
                                      Hear
                                    </Button>
                                    <button
                                      onClick={() => toggleSlowPlayback(word.id)}
                                      className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 slow-toggle ${
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
                                        <Snail className="h-3 w-3 text-gray-600" />
                                      </span>
                                    </button>
                                    <Button
                                      onClick={() => generateVisemeAnimation(word.text)}
                                      variant="outline"
                                      className="h-10 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white border-0 see-button"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      See
                                    </Button>
                                  </div>

                                  {/* Save button in new row */}
                                  <div className="flex justify-center mt-2">
                                    <Button
                                      onClick={() => saveWordToCollection(index)}
                                      variant="outline"
                                      className={`h-10 px-4 text-white border-0 save-button ${
                                        savedWords.has(processedWords[index]?.text)
                                          ? "bg-green-600 hover:bg-green-700"
                                          : "bg-[#6366F1] hover:bg-[#5855EB]"
                                      }`}
                                      disabled={savedWords.has(processedWords[index]?.text)}
                                    >
                                      <Star className={`h-4 w-4 mr-1 ${savedWords.has(processedWords[index]?.text) ? 'fill-white' : ''}`} />
                                      {savedWords.has(processedWords[index]?.text) ? "Word Saved" : "Save"}
                                    </Button>
                                  </div>

                                  {/* Assessment Results with Bar Charts */}
                                  {word.status === "complete" && word.assessmentResult && (
                                    <div className="space-y-4 mt-6 bg-white rounded-lg p-4 mx-2">
                                      {/* Overall Score */}
                                      <div className="text-center">
                                        <div 
                                          className="text-3xl font-bold mb-2" 
                                          style={{ 
                                            color: word.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' 
                                          }}
                                        >
                                          {Math.round(word.assessmentResult.pronunciationScore)}%
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4">
                                          {word.assessmentResult.pronunciationScore >= 80
                                            ? "Great job! Your pronunciation is very clear."
                                            : "Good effort! Try again to improve your score."}
                                        </p>
                                      </div>

                                      {/* Syllable-Level Feedback */}
                                      {word.assessmentResult.wordLevelResults?.[0] && (word.assessmentResult.wordLevelResults[0] as any).syllables && 
                                       (word.assessmentResult.wordLevelResults[0] as any).syllables.length > 0 && (
                                        <div className="mb-4">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Syllable Breakdown</h4>
                                          <div className="grid grid-cols-1 gap-2">
                                            {((word.assessmentResult.wordLevelResults[0] as any).syllables as any[]).map((syllable: any, index: number) => (
                                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                                <span className="text-sm font-medium text-gray-800">{syllable.grapheme}</span>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-600">{Math.round(syllable.accuracyScore)}%</span>
                                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                      className="h-1.5 rounded-full"
                                                      style={{
                                                        width: `${Math.round(syllable.accuracyScore)}%`,
                                                        backgroundColor: getSyllableColor(syllable.accuracyScore)
                                                      }}
                                                    ></div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Detailed Scores with Bar Charts */}
                                      <div className="space-y-1">
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="font-medium text-gray-700">Pronunciation</span>
                                            <span className="text-gray-700">{Math.round(word.assessmentResult.pronunciationScore)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${Math.round(word.assessmentResult.pronunciationScore)}%`,
                                                backgroundColor: word.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' :
                                                                 word.assessmentResult.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51'
                                              }}
                                            ></div>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="font-medium text-gray-700">Accuracy</span>
                                            <span className="text-gray-700">{Math.round(word.assessmentResult.accuracyScore || 0)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${Math.round(word.assessmentResult.accuracyScore || 0)}%`,
                                                backgroundColor: (word.assessmentResult.accuracyScore || 0) >= 80 ? '#2a9d8f' :
                                                                (word.assessmentResult.accuracyScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                                              }}
                                            ></div>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="font-medium text-gray-700">Fluency</span>
                                            <span className="text-gray-700">{Math.round(word.assessmentResult.fluencyScore || 0)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${Math.round(word.assessmentResult.fluencyScore || 0)}%`,
                                                backgroundColor: (word.assessmentResult.fluencyScore || 0) >= 80 ? '#2a9d8f' :
                                                                (word.assessmentResult.fluencyScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                                              }}
                                            ></div>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="font-medium text-gray-700">Completeness</span>
                                            <span className="text-gray-700">{Math.round(word.assessmentResult.completenessScore || 0)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${Math.round(word.assessmentResult.completenessScore || 0)}%`,
                                                backgroundColor: (word.assessmentResult.completenessScore || 0) >= 80 ? '#2a9d8f' :
                                                                (word.assessmentResult.completenessScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>


                  </div>
                )}
              </div>

              {/* Joyride Tutorial Component */}
              <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                stepIndex={stepIndex}
                callback={handleJoyrideCallback}
                continuous={true}
                showProgress={true}
                showSkipButton={true}
                styles={{
                  options: {
                    primaryColor: '#FF9692',
                    backgroundColor: '#1947e5',
                    textColor: '#ffffff',
                    arrowColor: '#1947e5',
                  },
                  tooltip: {
                    backgroundColor: '#1947e5',
                    color: '#ffffff',
                    borderRadius: '8px',
                  },
                  tooltipContainer: {
                    textAlign: 'left',
                  },
                  tooltipTitle: {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  },
                  tooltipContent: {
                    color: '#ffffff',
                    fontSize: '16px',
                    padding: '16px',
                  },
                  buttonNext: {
                    backgroundColor: '#FF9692',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                  },
                  buttonBack: {
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontSize: '14px',
                    marginRight: '10px',
                    border: '1px solid #ffffff',
                    borderRadius: '6px',
                  },
                  buttonSkip: {
                    color: '#ffffff',
                    fontSize: '14px',
                  },
                  buttonClose: {
                    color: '#ffffff',
                  },
                }}
                locale={{
                  back: 'Back',
                  close: 'Close',
                  last: 'Finish',
                  next: 'Next',
                  skip: 'Skip Tutorial'
                }}
              />
            </div>
          );
        }