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
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<{ [key: string]: boolean }>({});
  const [showSummary, setShowSummary] = useState(false);

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
  const visemeAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    "Actions/Verbs",
    "Emotions",
    "Home and Furniture",
    "Transportation"
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

  // Auto-load common words when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicWords("Commonly Used Words");
    }
  }, []);

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

  // Auto-scroll to practice section after words are generated
  const scrollToPracticeSection = () => {
    setTimeout(() => {
      const practiceSection = document.getElementById('practice-words-section');
      if (practiceSection) {
        practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
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
      toast({
        title: "Animation Error",
        description: "Failed to generate lip animation. Please try again.",
        variant: "destructive",
      });
      setShowVisemeDialog(false);
    } finally {
      setIsGeneratingVisemes(false);
    }
  };

  // Play viseme animation with comprehensive error handling
  const playVisemeAnimation = async () => {
    if (!visemeAudioRef.current || !visemeData.length || !visemeAudioUrl) {
      toast({
        title: "Error",
        description: "No animation data available",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold text-purple-800 mb-2">Speech Practice - Words</h1>
          <p className="text-muted-foreground">
            Generate and practice words to improve your speech clarity and pronunciation
          </p>
        </div>

        {/* Select Your Topic Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Select Your Topic</h2>
              <DifficultyDropdown />
            </div>

            {/* Choose a Topic Cards */}
            <div className="mb-6">
              <h3 className="text-md font-bold mb-3">Choose a Topic</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                {wordTopics.map((topic) => (
                  <Card
                    key={topic}
                    className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-16"
                    style={{ backgroundColor: '#1947e5' }}
                    onClick={() => handleGenerateTopicWords(topic)}
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
                  className="flex-1"
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
          <div id="practice-words-section" className="space-y-6">
            {/* Progress indicator */}
            <div className="bg-white rounded-lg p-4 shadow-lg border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
                <span className="text-sm text-[#264653]">
                  {currentCarouselIndex + 1} of {processedWords.length}
                </span>
              </div>
              <Progress 
                value={((currentCarouselIndex + 1) / processedWords.length) * 100} 
                className="h-2"
              />
            </div>

            {/* Carousel */}
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {processedWords.map((word, index) => (
                  <div key={word.id} className="embla__slide flex-[0_0_100%] px-2">
                    <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                      <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold text-white">{word.text}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Recording Controls */}
                        <div className="flex justify-center gap-2">
                          {word.status === "idle" && (
                            <Button
                              onClick={() => startWordPractice(index)}
                              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
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
                            className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                          >
                            <Ear className="h-4 w-4 mr-1" />
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
                              <Snail className="h-3 w-3 text-gray-600" />
                            </span>
                          </button>
                          <Button
                            onClick={() => generateVisemeAnimation(word.text)}
                            variant="outline"
                            className="h-10 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white border-0"
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
                            className="h-10 px-4 bg-[#6366F1] hover:bg-[#5855EB] text-white border-0"
                          >
                            <Star className={`h-4 w-4 mr-1 ${savedWords.has(processedWords[index]?.text) ? 'fill-white' : ''}`} />
                            Save
                          </Button>
                        </div>


                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => emblaApi?.scrollPrev()}
                disabled={currentCarouselIndex === 0}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button
                onClick={() => emblaApi?.scrollNext()}
                disabled={currentCarouselIndex >= processedWords.length - 1}
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
    </div>
  );
}