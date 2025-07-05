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
import { queryClient } from "@/lib/queryClient";
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
  ArrowLeft,
  Snail,
  Flag,
  Ear,
  ChevronDown, // Added ChevronDown for dropdown
  ChevronUp, // Added ChevronUp for show less
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { SummaryCard } from "@/components/SummaryCard";
import useEmblaCarousel from 'embla-carousel-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to get word color based on phoneme accuracy scores
const getWordColorFromPhonemes = (wordResult: any): string => {
  if (!wordResult.phonemes || wordResult.phonemes.length === 0) {
    // If no phoneme data, use overall word accuracy score
    return wordResult.accuracyScore >= 70 ? '#2a9d8f' : '#e76f51';
  }

  // Check if any phoneme in the word has accuracy below 60%
  const hasLowAccuracyPhoneme = wordResult.phonemes.some((phoneme: any) => phoneme.score < 60);

  if (hasLowAccuracyPhoneme) {
    return '#e76f51'; // Red for words with any low-accuracy phonemes
  } else {
    return '#2a9d8f'; // Green for words where all phonemes are above 60%
  }
};

// Helper function to render phrase text with color-coded words based on assessment results
const renderColorCodedPhraseText = (phraseText: string, assessmentResult: any, previousAssessmentResult?: any): JSX.Element => {
  // Use current assessment result, or fall back to previous assessment result if available
  const resultToUse = assessmentResult || previousAssessmentResult;
  
  if (!resultToUse?.wordLevelResults) {
    // No assessment data available, return default white text
    return <span className="text-white">{phraseText}</span>;
  }

  const words = phraseText.split(/\s+/);
  const wordResults = resultToUse.wordLevelResults;

  return (
    <span>
      {words.map((word, index) => {
        // Find matching word result (case-insensitive, remove punctuation)
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        const matchingResult = wordResults.find((wr: any) => 
          wr.word.toLowerCase() === cleanWord
        );

        const color = matchingResult 
          ? getWordColorFromPhonemes(matchingResult)
          : '#ffffff'; // Default white if no match

        return (
          <span key={index} style={{ color }} className="font-semibold">
            {word}
            {index < words.length - 1 && ' '}
          </span>
        );
      })}
    </span>
  );
};

// Helper function to determine text size based on phrase length
const getTextSizeClass = (text: string): string => {
  const length = text.length;
  if (length > 80) return 'text-sm';
  if (length > 50) return 'text-base';
  if (length > 30) return 'text-lg';
  return 'text-xl';
};

interface ProcessedPhrase {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: PronunciationAssessmentResult;
  previousAssessmentResult?: PronunciationAssessmentResult; // For maintaining colors during retry
  status: "idle" | "recording" | "assessing" | "complete";
}

export default function Phrases() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const shareId = params.shareId;
  const { difficulty, setDifficulty, setCurrentMode } = useDifficulty();

  // State variables
  const [aiGenerateTopic, setAiGenerateTopic] = useState("");
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedPhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedPhraseId, setSavedPhraseId] = useState<string | null>(null);
  const [savedPhrases, setSavedPhrases] = useState<Set<string>>(new Set());
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [phraseAssessmentResult, setPhraseAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackPhrases, setSlowPlaybackPhrases] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<any>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [showFeedbackInSummary, setShowFeedbackInSummary] = useState(true);
  // State for topic card navigation
  const [topicPage, setTopicPage] = useState(0); // 0 for first 6, 1 for second 6, etc.

  // State for special topic dialogs
  const [showLetterDialog, setShowLetterDialog] = useState(false);
  const [selectedTopicType, setSelectedTopicType] = useState<'start' | 'contain' | 'end' | null>(null);
  const [selectedLetterTab, setSelectedLetterTab] = useState<"letters" | "otherSounds">("letters");

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    skipSnaps: false,
    inViewThreshold: 0.7,
    startIndex: 0
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
      // Use a ref to get the current phrase index to avoid stale closure
      const currentIndex = currentPhraseIndexRef.current;
      if (currentIndex >= 0 && currentIndex < processedPhrases.length) {
        processPhraseRecording(blob, currentIndex);
      } else {
        console.warn("Invalid phrase index when recording completed:", currentIndex);
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
  const currentPhraseIndexRef = useRef<number>(-1);

  // Letter and consonant group options (copied from Words.tsx)
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

  // Helper function to determine font size based on text length
  const getTextSizeClass = (text: string) => {
    const length = text.length;
    if (length <= 20) return 'text-2xl sm:text-3xl'; // Large for short phrases
    if (length <= 35) return 'text-xl sm:text-2xl';  // Medium for moderate phrases  
    if (length <= 50) return 'text-lg sm:text-xl';   // Smaller for longer phrases
    return 'text-base sm:text-lg';                   // Smallest for very long phrases
  };

  // All topics combined for pagination
  const allTopics = [
    "Words that start with..", "Words that contain..", "Words that end with..", "Common Phrases", "Food & Dining", "Travel", 
    "Shopping", "Work & Business", "Family & Relationships", "Technology", "Sports", "Everyday Conversation",
    "Health", "History", "Weather & Seasons", "Transportation", 
    "Technology", "Education", "Vacation", "Emergency Situations",
    "Banking & Finance", "Home & Garden", "Entertainment", "Directions & Navigation"
  ];

  const topicsPerPage = 6;
  const totalTopicPages = Math.ceil(allTopics.length / topicsPerPage);

  // Get current page topics for display
  const displayTopics = allTopics.slice(
    topicPage * topicsPerPage,
    (topicPage + 1) * topicsPerPage
  );

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Set current mode to phrases - separate effect to ensure it always runs
  useEffect(() => {
    setCurrentMode('phrases');
  }, [setCurrentMode]);

  // Auto-load common phrases when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicPhrases("Common Phrases");
    }
  }, []);

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
    setTopicPage(0); // Reset to first page of topics

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
      setCurrentCarouselIndex(0);

      // Reset summary state for fresh cycle
      setShowSummary(false);
      setSummaryFeedback(null);
      setShowFeedbackInSummary(false);

      // Reset carousel to first position
      setTimeout(() => {
        if (emblaApi) {
          emblaApi.scrollTo(0);
        }
      }, 100);

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

  // Auto-scroll to practice section after phrases are generated
  const scrollToPracticeSection = () => {
    setTimeout(() => {
      const practiceSection = document.getElementById('practice-phrases-section');
      if (practiceSection) {
        practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  };

  // Start recording for an individual phrase practice
  const startPhrasePractice = async (phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) return;

    try {
      const phrase = processedPhrases[phraseIndex];
      setCurrentlyPracticing(phrase.id);
      setCurrentPhraseIndex(phraseIndex);
      currentPhraseIndexRef.current = phraseIndex; // Set ref to ensure accurate callback execution
      setPhraseAssessmentResult(null);

      // Update the phrase status to recording
      // Preserve current assessment as previous for color coding during retry
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { 
            ...p, 
            status: "recording",
            // Preserve current assessment as previous for color coding during retry
            previousAssessmentResult: p.assessmentResult || p.previousAssessmentResult
          } : p,
        ),
      );

      // Start recording using the hook
      await startRecording();

      //toast({
       // title: "Recording Started",
       // description: `Recording phrase: "${phrase.text}"`,
      // });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
      currentPhraseIndexRef.current = -1; // Reset ref on error

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
    stopRecording();
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
    // Cancel recording using the hook
    cancelRecording();
    setCurrentlyPracticing(null);
    currentPhraseIndexRef.current = -1; // Reset ref on cancel

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
    const textToSpeak = phrase.text;

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
            description: `Playing: "${phrase.text}"`,
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

  // Toggle slow playback for a phrase
  const toggleSlowPlayback = (phraseId: string) => {
    setSlowPlaybackPhrases(prev => ({
      ...prev,
      [phraseId]: !prev[phraseId]
    }));
  };

  // Save a phrase to user's collection
  const savePhraseToCollection = async (phraseIndex: number) => {
    if (!isAuthenticated) {
      setPendingSaveIndex(phraseIndex);
      setShowSignInDialog(true);
      return;
    }

    const phrase = processedPhrases[phraseIndex];
    if (!phrase || savedPhrases.has(phrase.text)) return;

    try {
      const response = await fetch("/api/phrases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase: phrase.text,
          difficulty: phrase.difficulty || "beginner",
          source: "phrases"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save phrase");
      }

      setSavedPhrases(prev => {
        const newSet = new Set(prev);
        newSet.add(phrase.text);
        return newSet;
      });

      // Invalidate the saved phrases query to refresh My Journey
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });

      toast({
        title: "Phrase Saved",
        description: "This phrase has been saved to your collection.",
      });
    } catch (error) {
      console.error("Error saving phrase:", error);
      toast({
        title: "Save Error",
        description: "Could not save phrase. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle finish practice session and generate summary
  const handleFinishPractice = async () => {
    const phrasesWithScores = processedPhrases.filter(p => 
      p.assessmentResult && p.assessmentResult.pronunciationScore !== null
    );

    // Add summary card immediately with loading state
    const summaryPhrase: ProcessedPhrase = {
      id: 'summary-card',
      text: 'Practice Session Complete!',
      status: 'complete'
    };

    setProcessedPhrases(prev => [...prev, summaryPhrase]);
    setShowSummary(true);
    setIsGeneratingFeedback(true);

    // Navigate to the summary card
    setTimeout(() => {
      if (emblaApi) {
        emblaApi.scrollTo(processedPhrases.length); // Go to the new summary card
      }
    }, 100);

    // Generate AI feedback asynchronously
    if (phrasesWithScores.length > 0) {
      try {
        const sessionData = phrasesWithScores.map(phrase => ({
          activityType: 'phrase_practice',
          itemPracticed: phrase.text,
          score: phrase.assessmentResult?.pronunciationScore || 0,
          accuracy: phrase.assessmentResult?.accuracyScore || 0,
          fluency: phrase.assessmentResult?.fluencyScore || 0,
          completeness: phrase.assessmentResult?.completenessScore || 0,
          difficulty: difficulty,
          metadata: phrase.assessmentResult,
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
          const feedbackData = await response.json();
          setSummaryFeedback(feedbackData);
        }
      } catch (error) {
        console.error('Error generating feedback:', error);
      } finally {
        setIsGeneratingFeedback(false);
      }
    } else {
      setIsGeneratingFeedback(false);
    }
  };

  // Handle summary practice prompt - different logic for phrases vs words
  const handleSummaryPracticePrompt = async (problemSound: string) => {
    if (!problemSound) return;

    // Close the feedback suggestion and reset summary state
    setShowFeedbackInSummary(false);
    setShowSummary(false);
    setSummaryFeedback(null);

    // Reset carousel state for new content
    setProcessedPhrases([]);
    setCurrentCarouselIndex(0);

    try {
      // Handle different types of practice suggestions
      if (problemSound === "difficulty_increase") {
        // For high performers, increase difficulty and generate new topic phrases
        const currentDifficultyNum = parseInt(difficulty, 10);
        const newDifficultyNum = Math.min(currentDifficultyNum + 1, 8);
        const newDifficulty = newDifficultyNum.toString();
        setDifficulty(newDifficulty as any);

        // Generate phrases with increased difficulty from random topic
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
        await handleGenerateTopicPhrases(randomTopic, newDifficulty);
      } else if (problemSound === "new_topic") {
        // Generate phrases from a random new topic
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
        await handleGenerateTopicPhrases(randomTopic);
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
          await handleGenerateTopicPhrases(problemSound);
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
              await handleGenerateTopicPhrases(extractedTopic);
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
              await handleGenerateTopicPhrases(randomTopic);
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
            await handleGenerateTopicPhrases(randomTopic);
          }
        }
      }
    } catch (error) {
      console.error('Error handling practice prompt:', error);
    }
  };

  // Handle special topic clicks
  const handleSpecialTopicClick = (topic: string) => {
    switch (topic) {
      case "Words that start with..":
        setSelectedTopicType('start');
        setShowLetterDialog(true);
        break;
      case "Words that contain..":
        setSelectedTopicType('contain');
        setShowLetterDialog(true);
        break;
      case "Words that end with..":
        setSelectedTopicType('end');
        setShowLetterDialog(true);
        break;
      default:
        handleGenerateTopicPhrases(topic);
    }
  };

  // Handle letter selection for phrase generation
  const handleLetterSelection = (letter: string) => {
    setShowLetterDialog(false);

    let topicText = "";
    if (selectedTopicType === 'start') {
      topicText = `Phrases with words starting with ${letter}`;
    } else if (selectedTopicType === 'contain') {
      topicText = `Phrases with words containing ${letter}`;
    } else if (selectedTopicType === 'end') {
      topicText = `Phrases with words ending with ${letter}`;
    }

    if (topicText) {
      handleGenerateTopicPhrases(topicText);
    }
  };

  // Get letter options based on selected topic type
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

  // Handle topic-based practice prompt - generate new phrases
  const handleTopicPracticePrompt = async (suggestedTopic: string) => {
    if (!suggestedTopic) return;

    // Close the feedback suggestion
    setShowFeedbackInSummary(false);

    // Generate new phrases for the suggested topic
    await handleGenerateTopicPhrases(suggestedTopic);
  };

  // Close feedback suggestion
  const closeFeedbackSuggestion = () => {
    setShowFeedbackInSummary(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      {/* Shared phrases notification dialog */}
      <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shared Phrases Loaded</DialogTitle>
            <DialogDescription>
              Someone shared these phrases with you. You can practice them below!
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
              Please sign in to save phrases to your collection.
            </DialogDescription>
          </DialogHeader>
          <AuthButtons />
        </DialogContent>
      </Dialog>

      {/* Letter Selection Dialog */}
      <Dialog open={showLetterDialog} onOpenChange={setShowLetterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white bg-blue-600 -mx-6 -mt-6 px-6 py-4 mb-4 rounded-t-lg">
              {selectedTopicType === 'start' && "Words that Start with..."}
              {selectedTopicType === 'contain' && "Words that Contain..."}
              {selectedTopicType === 'end' && "Words that End with..."}
            </DialogTitle>
            <DialogDescription className="text-gray-700 font-medium">
              Choose a letter or sound group to generate phrases.
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

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#1537cc]">Phrases Practice</h2>
          <p className="text-muted-foreground">
            Generate and practice phrases to improve your speech fluency and pronunciation
          </p>
        </div>

        {/* Select Your Topic Section */}
        <Card className="mb-6 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-[#1537cc]">Select Your Topic</h2>
              <DifficultyDropdown />
            </div>

            {/* Topic Cards */}
            <div className="mb-6">
              <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto pr-16">
                  {displayTopics.map((topic) => (
                    <Card
                      key={topic}
                      className="cursor-pointer hover:shadow-md hover:border-[#0F3CC9] transition-all duration-200 h-12 bg-white border-2 border-[#1537cc]"
                      onClick={() => handleSpecialTopicClick(topic)}
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
                  placeholder="Enter a topic you'd like to practice phrases about..."
                  value={aiGenerateTopic}
                  onChange={(e) => setAiGenerateTopic(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateTopicPhrases(aiGenerateTopic);
                    }
                  }}
                  className="flex-1 bg-[#f9fafb] border border-[#1537cc] focus:border-[#1537cc] focus:ring-[#1537cc]"
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => handleGenerateTopicPhrases(aiGenerateTopic)}
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
        {processedPhrases.length > 0 && (
          <div id="practice-phrases-section" className="space-y-6">
            {/* Progress indicator */}
            <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
                <span className="text-sm text-[#264653]">
                  {showSummary && currentCarouselIndex >= processedPhrases.length - 1 
                    ? `${processedPhrases.filter(p => p.id !== 'summary-card').length} of ${processedPhrases.filter(p => p.id !== 'summary-card').length}` 
                    : `${currentCarouselIndex + 1} of ${processedPhrases.filter(p => p.id !== 'summary-card').length}`}
                </span>
              </div>
              <Progress
                value={showSummary && currentCarouselIndex === processedPhrases.length - 1
                  ? 100
                  : ((currentCarouselIndex + 1) / processedPhrases.length) * 100}
                className="h-3 bg-[#f9fafb] [&_div]:bg-[#1537cc]"
              />
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
              <Button
                onClick={() => emblaApi?.scrollPrev()}
                disabled={currentCarouselIndex === 0}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${
                  currentCarouselIndex === 0 // If disabled
                    ? "bg-[#f9fafb] text-gray-400 border-gray-200" // Light grey when not selectable
                    : "bg-[#e3e3e3] hover:bg-gray-300 text-gray-800 border-gray-400" // Dark grey when selectable
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                {currentCarouselIndex + 1} of {processedPhrases.length + (showSummary ? 1 : 0)}
              </span>

              {(() => {
                const phrasesWithoutSummary = processedPhrases.filter(p => p.id !== 'summary-card');
                const completedCount = phrasesWithoutSummary.filter(p => p.status === 'complete').length;
                const isOnLastPhrase = currentCarouselIndex >= phrasesWithoutSummary.length - 1;
                const hasCompletedPhrases = completedCount > 0;
                const canFinish = isOnLastPhrase && hasCompletedPhrases && !showSummary;

                if (canFinish) {
                  return (
                    <Button
                      onClick={handleFinishPractice}
                      className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                      size="sm"
                    >
                      <Flag className="h-4 w-4" />
                      Finish
                    </Button>
                  );
                } else {
                  return (
                    <Button
                      onClick={() => emblaApi?.scrollNext()}
                      disabled={currentCarouselIndex >= processedPhrases.length - 1}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 ${
                        currentCarouselIndex >= processedPhrases.length - 1 // If disabled
                          ? "bg-[#f9fafb] text-gray-400 border-gray-200" // Light grey when not selectable
                          : "bg-[#f0eded] hover:bg-gray-300 text-gray-800 border-gray-400" // Dark grey when selectable
                      }`}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  );
                }
              })()}
            </div>

            {/* Carousel */}
            <div className="embla overflow-hidden max-w-md mx-auto" ref={emblaRef}>
              <div className="embla__container flex">
                {processedPhrases.map((phrase, index) => (
            <div key={`${phrase.id}-${index}`} className="embla__slide flex-[0_0_auto] px-2 flex justify-center">
                    {phrase.id === 'summary-card' ? (
                      // Summary Card - Match exact styling of regular phrase cards
                    <Card className="w-72 shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                        <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                          {/* Celebratory particles effect */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                            <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                            <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                            <div className="absolute top-6 right-1/4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
                          </div>
                          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 relative z-10 break-words">
                            <span role="img" aria-label="party popper">🎉</span> Practice Session Complete! <span role="img" aria-label="party popper">🎉</span>
                          </CardTitle>
                          <CardDescription className="text-white/90 mt-2 text-base relative z-10 break-words">
                            Excellent work! You've completed your phrase practice session
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="px-4 pb-4 text-white space-y-4 max-h-96 overflow-y-auto w-full">
                          {/* Performance Bubbles */}
                          <div className="grid grid-cols-4 gap-2 w-full">
                            {(() => {
                              const phrasesWithScores = processedPhrases.filter(p => 
                                p.assessmentResult && p.assessmentResult.pronunciationScore !== null && p.id !== 'summary-card'
                              );

                              if (phrasesWithScores.length === 0) {
                                return (
                                  <div className="col-span-4 text-center p-2 bg-white rounded-lg">
                                    <div className="text-sm text-gray-700">No scores available yet</div>
                                    <div className="text-xs text-gray-500">Practice some phrases to see your results</div>
                                  </div>
                                );
                              }

                              const avgPronunciation = Math.round(phrasesWithScores.reduce((sum, p) => sum + (p.assessmentResult?.pronunciationScore || 0), 0) / phrasesWithScores.length);
                              const avgAccuracy = Math.round(phrasesWithScores.reduce((sum, p) => sum + (p.assessmentResult?.accuracyScore || 0), 0) / phrasesWithScores.length);
                              const avgFluency = Math.round(phrasesWithScores.reduce((sum, p) => sum + (p.assessmentResult?.fluencyScore || 0), 0) / phrasesWithScores.length);
                              const avgCompleteness = Math.round(phrasesWithScores.reduce((sum, p) => sum + (p.assessmentResult?.completenessScore || 0), 0) / phrasesWithScores.length);

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
                                <span role="img" aria-label="lightbulb">💡</span>
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

                          {/* Phrases Below 70% */}
                          {(() => {
                            const phrasesBelow70 = processedPhrases.filter(p => 
                              p.assessmentResult && p.assessmentResult.pronunciationScore < 70 && p.id !== 'summary-card'
                            );

                            if (phrasesBelow70.length > 0) {
                              return (
                                <div className="w-full max-w-full p-3 bg-white rounded-lg">
                                  <h4 className="text-sm font-semibold text-[#1947e5] mb-2">Phrases to Practice More</h4>
                                  <div className="space-y-1 max-h-24 overflow-y-auto">
                                    {phrasesBelow70.slice(0, 3).map((p, i) => (
                                      <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                          <span className="text-gray-800 text-xs font-medium truncate">{p.text}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <Button
                                            onClick={() => {
                                              // Find the phrase index in processedPhrases and save it
                                              const phraseIndex = processedPhrases.findIndex(phrase => phrase.text === p.text);
                                              if (phraseIndex !== -1) {
                                                savePhraseToCollection(phraseIndex);
                                              }
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className={`h-6 px-2 text-xs border-0 ${
                                              savedPhrases.has(p.text)
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "bg-[#6366F1] hover:bg-[#5855EB] text-white"
                                            }`}
                                            disabled={savedPhrases.has(p.text)}
                                          >
                                            <Star className={`h-3 w-3 ${savedPhrases.has(p.text) ? 'fill-white' : ''}`} />
                                          </Button>
                                          <span className="text-red-600 text-xs font-bold">{Math.round(p.assessmentResult?.pronunciationScore || 0)}%</span>
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
                      // Regular Phrase Card
                    <Card className="w-72 shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                        <CardHeader className="text-center px-3 py-4">
                          <CardTitle className={`${getTextSizeClass(phrase.text)} font-bold leading-relaxed px-2`} style={{ wordBreak: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                            {(phrase.status === "complete" && phrase.assessmentResult) || phrase.previousAssessmentResult ? 
                              renderColorCodedPhraseText(phrase.text, phrase.assessmentResult, phrase.previousAssessmentResult) :
                              <span className="text-white">{phrase.text}</span>
                            }
                          </CardTitle>
                        </CardHeader>

                      <CardContent className="space-y-3 px-3 pb-4">
                        {/* Recording Controls */}
                        <div className="flex justify-center gap-2 flex-wrap">
                          {phrase.status === "idle" && (
                            <Button
                              onClick={() => startPhrasePractice(index)}
                              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                              disabled={isRecording || isProcessingRecording}
                            >
                              <Mic className="h-5 w-5" />
                              Start Recording
                            </Button>
                          )}

                          {phrase.status === "recording" && (
                            <Button
                              onClick={stopPhrasePractice}
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
                                onClick={() => startPhrasePractice(index)}
                                className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                              >
                                <RotateCw className="h-5 w-5" />
                                Try Again
                              </Button>
                              {phrase.recordingUrl && (
                                <AudioPlaybackButton
                                  audioUrl={phrase.recordingUrl}
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

                        {/* Hear and Slow Switch + Save */}
                        <div className="flex justify-center gap-2 flex-wrap">
                          <Button
                            onClick={() => handleTextToSpeech(index)}
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                          >
                            <Ear className="h-3 w-3 mr-1" />
                            Hear
                          </Button>
                          <button
                            onClick={() => toggleSlowPlayback(phrase.id)}
                            className={`relative inline-flex h-9 w-14 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              slowPlaybackPhrases[phrase.id] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                            }`}
                            role="switch"
                            aria-checked={slowPlaybackPhrases[phrase.id]}
                            aria-label="Toggle slow playback"
                          >
                            <span
                              className={`inline-flex h-7 w-7 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                                slowPlaybackPhrases[phrase.id] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            >
                              <Snail className="h-2 w-2 text-gray-600" />
                            </span>
                          </button>
                          <Button
                            onClick={() => savePhraseToCollection(index)}
                            variant="outline"
                            size="sm"
                            className={`h-9 px-3 text-white border-0 ${
                              savedPhrases.has(processedPhrases[index]?.text)
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-[#6366F1] hover:bg-[#5855EB]"
                            }`}
                            disabled={savedPhrases.has(processedPhrases[index]?.text)}
                          >
                            <Star className={`h-3 w-3 mr-1 ${savedPhrases.has(processedPhrases[index]?.text) ? 'fill-white stroke-none' : 'stroke-white'}`} />
                            {savedPhrases.has(processedPhrases[index]?.text) ? "Phrase Saved" : "Save"}
                          </Button>
                        </div>

                        {/* Assessment Results with Bar Charts */}
                        {phrase.status === "complete" && phrase.assessmentResult && (
                          <div className="space-y-3 mt-4 bg-white rounded-lg p-3 mx-1">
                            {/* Overall Score */}
                            <div className="text-center">
                              <div 
                                className="text-3xl font-bold mb-2" 
                                style={{ 
                                  color: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' 
                                }}
                              >
                                {Math.round(phrase.assessmentResult.pronunciationScore)}%
                              </div>
                              <p className="text-gray-600 text-sm mb-4">
                                {phrase.assessmentResult.pronunciationScore >= 80
                                  ? "Great job! Your pronunciation is very clear."
                                  : "Good effort! Try again to improve your score."}
                              </p>
                            </div>

                            {/* Detailed Scores with Bar Charts */}
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-gray-700">Pronunciation</span>
                                  <span className="text-gray-700">{Math.round(phrase.assessmentResult.pronunciationScore)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.pronunciationScore)}%`,
                                      backgroundColor: phrase.assessmentResult.pronunciationScore >= 80 ? '#2a9d8f' :
                                                       phrase.assessmentResult.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51'
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-gray-700">Accuracy</span>
                                  <span className="text-gray-700">{Math.round(phrase.assessmentResult.accuracyScore || 0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.accuracyScore || 0)}%`,
                                      backgroundColor: (phrase.assessmentResult.accuracyScore || 0) >= 80 ? '#2a9d8f' :
                                                      (phrase.assessmentResult.accuracyScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-gray-700">Fluency</span>
                                  <span className="text-gray-700">{Math.round(phrase.assessmentResult.fluencyScore || 0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.fluencyScore || 0)}%`,
                                      backgroundColor: (phrase.assessmentResult.fluencyScore || 0) >= 80 ? '#2a9d8f' :
                                                      (phrase.assessmentResult.fluencyScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-gray-700">Completeness</span>
                                  <span className="text-gray-700">{Math.round(phrase.assessmentResult.completenessScore || 0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${Math.round(phrase.assessmentResult.completenessScore || 0)}%`,
                                      backgroundColor: (phrase.assessmentResult.completenessScore || 0) >= 80 ? '#2a9d8f' :
                                                      (phrase.assessmentResult.completenessScore || 0) >= 60 ? '#e9c46a' : '#e76f51'
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
        )}
      </div>
    </div>
  );
}