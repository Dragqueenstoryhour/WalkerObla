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
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { SummaryCard } from "@/components/SummaryCard";
import useEmblaCarousel from 'embla-carousel-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming you have these components


interface ProcessedWord {
  id: string;
  text: string;
  syllabication?: string;
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

// Helper function to map syllables from assessment results to syllabication display
const mapSyllablesToDisplay = (syllabication: string, syllables: any[]): Array<{text: string, color: string}> => {
  if (!syllables || syllables.length === 0) {
    // No syllable data available, return default styling
    return syllabication.split('-').map(syllable => ({
      text: syllable,
      color: '#ffffff' // Default white color
    }));
  }
  
  const displaySyllables = syllabication.split('-');
  const resultSyllables = displaySyllables.map((displaySyllable, index) => {
    // Try to match with assessment syllables
    const matchingSyllable = syllables.find(s => 
      s.syllable && s.grapheme &&
      (s.syllable.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      s.grapheme.toLowerCase().includes(displaySyllable.toLowerCase()))
    );
    
    if (matchingSyllable) {
      return {
        text: displaySyllable,
        color: getSyllableColor(matchingSyllable.accuracyScore)
      };
    } else {
      return {
        text: displaySyllable,
        color: '#ffffff' // Default white if no match found
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


  // Viseme animation state
  const [showVisemeDialog, setShowVisemeDialog] = useState(false);
  const [isGeneratingVisemes, setIsGeneratingVisemes] = useState(false);
  const [isPlayingVisemes, setIsPlayingVisemes] = useState(false);
  const [currentVisemeId, setCurrentVisemeId] = useState(0);
  const [visemeData, setVisemeData] = useState<VisemeData[]>([]);
  const [visemeAudioUrl, setVisemeAudioUrl] = useState<string>("");
  const [currentVisemeWord, setCurrentVisemeWord] = useState<string>("");
  const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>({});
  const [imagesReady, setImagesReady] = useState(false);


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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentWordIndexRef = useRef<number>(-1);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);

  // Predefined word topics
  const wordTopics = [
    "Commonly Used Words",
    "Animals",
    "Colors",
    "Food and Drinks",
    "Body Parts",
    "Family Members",
    "Weather",
    "Numbers",
    "Alphabet",
    "Words that Start with..",
    "Words that Contain..",
    "Words that End with.."
  ];

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

  // Preload viseme images for smooth transitions
  useEffect(() => {
    Object.values(visemeImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

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

      const newWords: ProcessedWord[] = result.phrases.map(
        (item: any, index: number) => ({
          id: `word-${Date.now()}-sound-${index}`,
          text: item.text,
          syllabication: item.syllabication,
          status: "idle",
        })
      );

      setProcessedWords(newWords);
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
    // Reset session and generate words with the problem sound
    setShowSummary(false);
    setSummaryFeedback(null);
    setShowFeedbackInSummary(true);
    setProcessedWords([]);
    setCurrentCarouselIndex(0);
    setSelectedTopicType("contain");
    
    // Generate new words with the problem sound using proper logic
    handleGenerateWordsWithSound(problemSound);
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

      const newWords: ProcessedWord[] = result.phrases.map(
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

      setProcessedWords(newWords);
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
    console.log("Preloading viseme images for IDs:", visemeIds);
    setImagesReady(false);

    // Always include viseme 0 (neutral position) for smooth transitions
    const idsToLoad = [0, ...visemeIds].filter((id, index, arr) => arr.indexOf(id) === index);

    const loadPromises = idsToLoad.map((id) => {
      return new Promise<void>((resolve, reject) => {
        // Check if image is already loaded
        if (preloadedImages[id]) {
          console.log(`Viseme image ${id} already preloaded`);
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => {
          setPreloadedImages(prev => ({ ...prev, [id]: img }));
          console.log(`Successfully preloaded viseme image ${id}`);
          resolve();
        };
        img.onerror = (e) => {
          console.error(`Failed to preload viseme image ${id}:`, e);
          // Don't reject, just log error and continue
          resolve();
        };

        // Set crossOrigin to handle potential CORS issues
        img.crossOrigin = "anonymous";
        img.src = visemeImages[id as keyof typeof visemeImages];

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete) {
            console.warn(`Timeout loading viseme image ${id}`);
            resolve();
          }
        }, 5000);
      });
    });

    try {
      await Promise.all(loadPromises);
      setImagesReady(true);
      console.log("All viseme images preloaded successfully");

      // Force load neutral position if missing and wait for it
      if (!preloadedImages[0]) {
        console.warn("Neutral position image not loaded, forcing synchronous load");
        await new Promise<void>((resolve) => {
          const neutralImg = new Image();
          neutralImg.onload = () => {
            setPreloadedImages(prev => ({ ...prev, [0]: neutralImg }));
            console.log("Neutral position image force-loaded successfully");
            resolve();
          };
          neutralImg.onerror = () => {
            console.error("Failed to force-load neutral position image");
            resolve(); // Continue anyway
          };
          neutralImg.src = visemeImages[0];
          // Timeout fallback
          setTimeout(resolve, 1000);
        });
      }

    } catch (error) {
      console.error("Error preloading viseme images:", error);
      // Don't throw error, just set ready state to allow playback attempt
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

      // Preload all required images before playing
      await preloadVisemeImages(uniqueVisemeIds);

      // Auto-play the animation after images are ready - removed timeout to fix first-time error
      playVisemeAnimation();

    } catch (error) {
      console.error("Error generating visemes:", error);
      setShowVisemeDialog(false);
    } finally {
      setIsGeneratingVisemes(false);
    }
  };

  // Play viseme animation with comprehensive error handling
  const playVisemeAnimation = async () => {
    if (!visemeAudioRef.current || !visemeData.length || !visemeAudioUrl) {
      return;
    }

    // Force wait for images if not ready, with timeout fallback
    if (!imagesReady) {
      console.log("Images not ready, waiting up to 3 seconds...");
      let waitCount = 0;
      const maxWait = 30; // 3 seconds

      while (!imagesReady && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      if (!imagesReady) {
        console.warn("Images still not ready after timeout, proceeding anyway");
        setImagesReady(true); // Force ready state
      }
    }

    // Clear any existing timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    setIsPlayingVisemes(true);
    setCurrentVisemeId(0);

    console.log("Starting viseme animation with", visemeData.length, "visemes");
    console.log("Viseme data:", visemeData.map(v => ({ id: v.visemeId, offset: v.audioOffset })));
    console.log("Images ready:", imagesReady, "Preloaded images count:", Object.keys(preloadedImages).length);

    // Reset audio element state
    try {
      visemeAudioRef.current.playbackRate = 1.0;
      visemeAudioRef.current.currentTime = 0;

      // Ensure audio is properly loaded before playing
      if (visemeAudioRef.current.readyState < 2) {
        console.log("Audio not fully loaded, preloading...");
        visemeAudioRef.current.load();

        // Wait for audio to be ready with better error handling
        await new Promise<void>((resolve) => {
          let resolved = false;

          const handleCanPlay = () => {
            if (!resolved) {
              resolved = true;
              visemeAudioRef.current?.removeEventListener('canplay', handleCanPlay);
              visemeAudioRef.current?.removeEventListener('loadeddata', handleCanPlay);
              console.log("Audio successfully preloaded and ready");
              resolve();
            }
          };

          const handleError = () => {
            if (!resolved) {
              resolved = true;
              console.warn("Audio loading failed, proceeding anyway");
              resolve();
            }
          };

          visemeAudioRef.current?.addEventListener('canplay', handleCanPlay);
          visemeAudioRef.current?.addEventListener('loadeddata', handleCanPlay);
          visemeAudioRef.current?.addEventListener('error', handleError);

          // Reduced timeout for faster fallback
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn("Audio loading timeout, proceeding anyway");
              resolve();
            }
          }, 1000);
        });
      }

      const playPromise = visemeAudioRef.current.play();

      if (playPromise !== undefined) {
        await playPromise.then(() => {
          console.log("Audio started playing successfully, scheduling viseme changes");

          // Schedule viseme changes
          visemeData.forEach((viseme, index) => {
            const timeout = setTimeout(() => {
              console.log(`Changing to viseme ${viseme.visemeId} at offset ${viseme.audioOffset}ms (index: ${index})`);
              setCurrentVisemeId(viseme.visemeId);
            }, viseme.audioOffset);

            animationTimeoutsRef.current.push(timeout);
          });

          // Add a final timeout to return to neutral position
          const maxOffset = Math.max(...visemeData.map(v => v.audioOffset));
          const finalTimeout = setTimeout(() => {
            console.log("Animation complete, returning to neutral");
            setCurrentVisemeId(0);
            setIsPlayingVisemes(false);
          }, maxOffset + 500);

          animationTimeoutsRef.current.push(finalTimeout);

        }).catch((error) => {
          console.error("Audio playback failed:", error);
          setIsPlayingVisemes(false);
          setCurrentVisemeId(0);
          throw error;
        });
      }

      // Handle audio end
      const handleAudioEnd = () => {
        console.log("Audio ended normally");
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        visemeAudioRef.current?.removeEventListener("ended", handleAudioEnd);
        visemeAudioRef.current?.removeEventListener("error", handleAudioError);
      };

      const handleAudioError = (e: Event) => {
        console.error("Audio error during playback:", e);
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        visemeAudioRef.current?.removeEventListener("ended", handleAudioEnd);
        visemeAudioRef.current?.removeEventListener("error", handleAudioError);
      };

      visemeAudioRef.current.addEventListener("ended", handleAudioEnd);
      visemeAudioRef.current.addEventListener("error", handleAudioError);

    } catch (error) {
      console.error("Error in playVisemeAnimation:", error);
      setIsPlayingVisemes(false);
      setCurrentVisemeId(0);
      // Silent recovery - no error toast, just reset to allow replay
    }
  };

  // Stop viseme animation
  const stopVisemeAnimation = () => {
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    if (visemeAudioRef.current) {
      visemeAudioRef.current.pause();
      visemeAudioRef.current.currentTime = 0;
    }

    setIsPlayingVisemes(false);
    setCurrentVisemeId(0);
  };

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
      const response = await fetch("/api/saved-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: word.text,
          syllabication: word.syllabication,
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
    <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
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

            {/* Status */}
            <div className="text-center">
              {isGeneratingVisemes && (
                <p className="text-blue-700 font-medium">Generating animation...</p>
              )}
              {isPlayingVisemes && (
                <p className="text-blue-700 font-medium">Animation playing</p>
              )}
              {!isGeneratingVisemes && !isPlayingVisemes && visemeData.length > 0 && (
                <p className="text-blue-600">Ready to replay</p>
              )}
            </div>

            {/* Control buttons */}
            {visemeData.length > 0 && !isGeneratingVisemes && (
              <div className="flex gap-2">
                <Button
                  onClick={playVisemeAnimation}
                  disabled={isPlayingVisemes}
                  variant="default"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Replay
                </Button>
                <Button
                  onClick={stopVisemeAnimation}
                  disabled={!isPlayingVisemes}
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}
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
              <h1 className="text-3xl font-bold text-purple-800 mb-2">Speech Practice - Words</h1>
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
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Select Your Topic</h2>
              <div className="words-level-button">
                <DifficultyDropdown />
              </div>
            </div>

            {/* Choose a Topic Cards */}
            <div className="mb-6 topic-selection-area">
              <h3 className="text-md font-bold mb-3">Choose a Topic</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                {wordTopics.map((topic) => (
                  <Card
                    key={topic}
                    className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-16"
                    style={{ backgroundColor: '#1947e5' }}
                    onClick={() => handleTopicCardClick(topic)}
                  >
                    <CardContent className="p-3 text-center flex items-center justify-center h-full">
                      <p className="font-bold text-white text-sm">{topic}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Topic Input */}
            <div className="mb-6">
              <p className="text-base font-medium text-purple-600 mb-3">Or enter a custom topic:</p>
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
                  className="flex-1 custom-topic-input"
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
            <div className="bg-white rounded-lg p-4 shadow-lg border-0">
              <Progress 
                value={((currentCarouselIndex + 1) / processedWords.length) * 100} 
                className="h-2 [&>div]:bg-[#1947e5]"
              />
            </div>

            {/* Carousel */}
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {processedWords.map((word, index) => (
                  <div key={`${word.id}-${index}`} className="embla__slide flex-[0_0_100%] px-2">
                    {word.id === 'summary-card' ? (
                      // Summary Card
                      <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                        <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                          {/* Celebratory particles effect */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                            <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                            <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                            <div className="absolute top-6 right-1/4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
                          </div>
                          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2 relative z-10">
                            <Flag className="h-6 w-6 text-yellow-300" />
                            🎉 Practice Session Complete! 🎉
                          </CardTitle>
                          <CardDescription className="text-white/90 mt-2 text-lg relative z-10">
                            Excellent work! You've completed your practice session
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="px-6 pb-6 text-white space-y-6">
                          {/* Performance Bubbles */}
                          <div className="grid grid-cols-2 gap-4">
                            {(() => {
                              const wordsWithScores = processedWords.filter(w => 
                                w.assessmentResult && w.assessmentResult.pronunciationScore !== null && w.id !== 'summary-card'
                              );
                              
                              if (wordsWithScores.length === 0) {
                                return (
                                  <div className="col-span-2 text-center p-4 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <div className="text-lg text-white">No scores available yet</div>
                                    <div className="text-sm text-blue-100">Practice some words to see your results</div>
                                  </div>
                                );
                              }
                              
                              const avgPronunciation = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.pronunciationScore || 0), 0) / wordsWithScores.length);
                              const avgAccuracy = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.accuracyScore || 0), 0) / wordsWithScores.length);
                              const avgFluency = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.fluencyScore || 0), 0) / wordsWithScores.length);
                              const avgCompleteness = Math.round(wordsWithScores.reduce((sum, w) => sum + (w.assessmentResult?.completenessScore || 0), 0) / wordsWithScores.length);
                              
                              return (
                                <>
                                  <div className="text-center p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-white">{avgPronunciation}%</div>
                                    <div className="text-sm text-blue-100">Pronunciation</div>
                                  </div>
                                  <div className="text-center p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-white">{avgAccuracy}%</div>
                                    <div className="text-sm text-blue-100">Accuracy</div>
                                  </div>
                                  <div className="text-center p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-white">{avgFluency}%</div>
                                    <div className="text-sm text-blue-100">Fluency</div>
                                  </div>
                                  <div className="text-center p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-white">{avgCompleteness}%</div>
                                    <div className="text-sm text-blue-100">Completeness</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* AI Feedback Section */}
                          {isGeneratingFeedback ? (
                            <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Generating Personalized Feedback...
                              </h4>
                              <p className="text-white/80">Analyzing your practice session to provide targeted suggestions</p>
                            </div>
                          ) : summaryFeedback && showFeedbackInSummary && summaryFeedback.practicePrompt && (
                            <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <Lightbulb className="h-5 w-5" />
                                Personalized Feedback
                              </h4>
                              <p className="text-white/90 mb-4">{summaryFeedback.practicePrompt.question}</p>
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleSummaryPracticePrompt(summaryFeedback.practicePrompt!.problemSound)}
                                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                  size="sm"
                                  variant="outline"
                                >
                                  Yes
                                </Button>
                                <Button
                                  onClick={closeFeedbackSuggestion}
                                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                                  size="sm"
                                  variant="outline"
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
                                <div>
                                  <h4 className="text-lg font-semibold text-white mb-3">Words to Practice More</h4>
                                  <div className="space-y-2">
                                    {wordsBelow70.slice(0, 3).map((w, i) => (
                                      <div key={i} className="flex items-center justify-between p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-medium">{w.text}</span>
                                          {w.syllabication && (
                                            <span className="text-red-200 text-sm">({w.syllabication})</span>
                                          )}
                                        </div>
                                        <span className="text-red-200 font-bold">{Math.round(w.assessmentResult?.pronunciationScore || 0)}%</span>
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
                        {word.syllabication && (
                          <div className="text-lg italic mt-2">
                            {word.status === "complete" && word.assessmentResult?.wordLevelResults?.[0] && 
                             (word.assessmentResult.wordLevelResults[0] as any).syllables ? (
                              // Show color-coded syllables based on assessment results
                              mapSyllablesToDisplay(word.syllabication, (word.assessmentResult.wordLevelResults[0] as any).syllables).map((syllable, index) => (
                                <span 
                                  key={index}
                                  style={{ color: syllable.color }}
                                  className="font-semibold"
                                >
                                  {syllable.text}
                                  {index < mapSyllablesToDisplay(word.syllabication || '', (word.assessmentResult?.wordLevelResults?.[0] as any)?.syllables || []).length - 1 && '-'}
                                </span>
                              ))
                            ) : (
                              // Default display when no assessment data is available
                              <span className="text-white/80">{word.syllabication}</span>
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

            {/* Navigation controls */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button
                onClick={() => emblaApi?.scrollPrev()}
                disabled={currentCarouselIndex === 0}
                variant="outline"
                size="sm"
                className="previous-button"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {currentCarouselIndex >= processedWords.length - 1 && !showSummary ? (
                <Button
                  onClick={handleFinishPractice}
                  className="bg-[#1947e5] hover:bg-[#1947e5]/90 text-white"
                  size="sm"
                  disabled={isGeneratingFeedback}
                >
                  {isGeneratingFeedback ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4 mr-1" />
                      Finish
                    </>
                  )}
                </Button>
              ) : showSummary && currentCarouselIndex >= processedWords.length - 1 ? (
                <Button
                  onClick={handlePracticeMoreWords}
                  className="bg-[#1947e5] hover:bg-[#1947e5]/90 text-white"
                  size="sm"
                >
                  Practice More Words
                </Button>
              ) : (
                <Button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={currentCarouselIndex >= processedWords.length - 1}
                  variant="outline"
                  size="sm"
                  className="next-button"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
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