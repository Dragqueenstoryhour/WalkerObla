import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, User, CheckCircle, ChevronLeft, ChevronRight, Mic, Volume2, Eye, Snail, Ear, Flag, Play, Square, Pause, RotateCcw, X } from 'lucide-react';
import { SimpleRecorder } from '@/components/SimpleRecorder';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { getAuthHeaders } from '@/lib/supabaseClient';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface Assignment {
  id: number;
  title: string;
  description?: string;
  therapistName: string;
  dueDate?: string;
  progress: {
    totalItems: number;
    completedItems: number;
    averageScore: number;
  };
}

interface AssignmentItem {
  id: number;
  itemType: 'word' | 'phrase';
  content: string;
  syllabication?: string;
  phonetic?: string;
  definition?: string;
  difficulty?: string;
  isCompleted: boolean;
  lastScore?: number;
  bestScore?: number;
  attemptCount: number;
}

const AssignmentPractice: React.FC = () => {
  const [match, params] = useRoute('/assignments/:id');
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [itemAttempts, setItemAttempts] = useState<Record<number, number>>({});
  const [itemBestScores, setItemBestScores] = useState<Record<number, number>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });

  // Audio and interaction states
  const [slowPlaybackItems, setSlowPlaybackItems] = useState<Record<number, boolean>>({});
  const [audioPlaying, setAudioPlaying] = useState<number | null>(null);

  // Enhanced Viseme animation state with comprehensive readiness tracking
  const [showVisemeDialog, setShowVisemeDialog] = useState(false);
  const [isGeneratingVisemes, setIsGeneratingVisemes] = useState(false);
  const [isPlayingVisemes, setIsPlayingVisemes] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
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

  const visemeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const animationTimeoutsRef = React.useRef<NodeJS.Timeout[]>([]);
  const animationFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const currentEventListenersRef = React.useRef<{
    timeupdate?: () => void;
    ended?: () => void;
    error?: (e: Event) => void;
  }>({});
  const cleanupFunctionsRef = React.useRef<(() => void)[]>([]);

  const assignmentId = params?.id ? parseInt(params.id) : null;
  
  console.log(`🔍 AssignmentPractice loaded:`, { 
    assignmentId, 
    isAuthenticated, 
    params 
  });

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

  // Fetch assignment details
  const { data: assignment, isLoading: assignmentLoading, error: assignmentError } = useQuery({
    queryKey: [`/api/assignments/${assignmentId}`],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch assignment`);
      }
      const data = await response.json();
      return data.data as Assignment & { items: AssignmentItem[] };
    },
    enabled: !!assignmentId && isAuthenticated,
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const items = assignment?.items || [];
  const currentItem = items[currentItemIndex];
  const progressPercentage = ((completedItems.size / items.length) * 100) || 0;
  const isLastItem = currentItemIndex === items.length - 1;
  const canFinish = completedItems.size === items.length && !showSummary;

  // Handle item completion
  const handleItemComplete = async (itemId: number, score: number) => {
    console.log(`🎯 Assignment item completed: ${itemId} with score ${score}`);
    
    // Update attempt count
    const currentAttempts = itemAttempts[itemId] || 0;
    const newAttempts = currentAttempts + 1;
    setItemAttempts(prev => ({ ...prev, [itemId]: newAttempts }));
    
    // Update best score
    const currentBestScore = itemBestScores[itemId] || 0;
    const newBestScore = Math.max(currentBestScore, score);
    setItemBestScores(prev => ({ ...prev, [itemId]: newBestScore }));
    
    try {
      // Save result to server
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/assignments/${assignmentId}/results`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          itemId,
          pronunciationScore: score,
          attemptCount: newAttempts,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save assignment result');
      } else {
        console.log('✅ Assignment result saved successfully');
      }
    } catch (error) {
      console.error('Error saving assignment result:', error);
    }

    // Mark as completed and auto-advance after 3 attempts or if score is good
    const shouldAutoAdvance = newAttempts >= 3 || score >= 80;
    
    if (shouldAutoAdvance) {
      setCompletedItems(prev => new Set([...prev, itemId]));
      
      // Wait 3 seconds before auto-advancing
      setTimeout(() => {
        const nextIncompleteIndex = items.findIndex(
          (item, index) => index > currentItemIndex && !completedItems.has(item.id) && item.id !== itemId
        );
        
        if (nextIncompleteIndex !== -1) {
          setCurrentItemIndex(nextIncompleteIndex);
          if (emblaApi) emblaApi.scrollTo(nextIncompleteIndex);
        } else if (completedItems.size + 1 >= items.length) {
          // Assignment completed!
          toast({
            title: "🎉 Assignment Complete!",
            description: `Great job! You've completed "${assignment?.title}"`,
          });
        }
      }, 3000);
    }
  };

  // Audio functions
  const handleTextToSpeech = async (text: string, itemId: number, slow: boolean = false) => {
    try {
      setAudioPlaying(itemId);
      console.log(`🔊 Playing "${text}" at ${slow ? 'SLOW' : 'NORMAL'} speed`);
      
      const authHeaders = await getAuthHeaders();
      
      // Use SSML approach like Words.tsx and Phrases.tsx for consistent speed control
      let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
      ssmlText += `<voice name="en-US-AvaNeural">`;
      
      if (slow) {
        // Use SSML prosody rate to slow down - Azure uses "slow" or decimal values
        ssmlText += `<prosody rate="0.6">`;
        ssmlText += text;
        ssmlText += `</prosody>`;
      } else {
        ssmlText += text;
      }
      ssmlText += `</voice>`;
      ssmlText += `</speak>`;
      
      const response = await fetch('/api/pronunciation/synthesize', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ssml: ssmlText
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => {
          setAudioPlaying(null);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('TTS error:', error);
      setAudioPlaying(null);
    }
  };

  const toggleSlowPlayback = (itemId: number) => {
    setSlowPlaybackItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (emblaApi) emblaApi.scrollPrev();
  };

  const goToNext = () => {
    if (emblaApi) emblaApi.scrollNext();
  };

  // Effect to update canPlay state when all assets are ready
  useEffect(() => {
    const allReady = animationReady && imagesReady && audioReady;
    if (allReady !== canPlay) {
      setCanPlay(allReady);
      console.log("Animation readiness state updated:", { animationReady, imagesReady, audioReady, canPlay: allReady });
    }
  }, [animationReady, imagesReady, audioReady, canPlay]);

  // Effect to draw viseme when currentVisemeId changes
  useEffect(() => {
    if (canvasRef.current && imagesReady) {
      drawVisemeOnCanvas(currentVisemeId);
    }
  }, [currentVisemeId, imagesReady]);

  // Clear animation timeouts when component unmounts
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

  // Draw viseme on canvas for smooth rendering
  const drawVisemeOnCanvas = (visemeId: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = preloadedImages[visemeId] || preloadedImages[0];
    if (img && img.complete) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.globalAlpha = 1.0;
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
    const loadPromises = idsToLoad.map((id, index) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        // Check if image is already loaded and in cache
        if (preloadedImages[id] && preloadedImages[id].complete) {
          setLoadingProgress(prev => ({ 
            ...prev, 
            images: Math.round(((index + 1) / idsToLoad.length) * 100) 
          }));
          resolve(preloadedImages[id]);
          return;
        }

        const img = new Image();

        const timeoutId = setTimeout(() => {
          console.warn(`Timeout loading viseme image ${id}, using fallback`);
          resolve(preloadedImages[0] || img);
        }, 3000);

        img.onload = () => {
          clearTimeout(timeoutId);
          setLoadingProgress(prev => ({ 
            ...prev, 
            images: Math.round(((index + 1) / idsToLoad.length) * 100) 
          }));
          resolve(img);
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          console.warn(`Failed to load viseme image ${id}, using fallback`);
          resolve(preloadedImages[0] || img);
        };

        // Set crossOrigin to handle potential CORS issues
        img.crossOrigin = "anonymous";
        img.src = visemeImages[id as keyof typeof visemeImages];
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
  const generateVisemeAnimation = async (word: string, itemId: number) => {
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
          speed: slowPlaybackItems[itemId] ? 0.5 : 0.65 // Use slower speed if snail toggle is active
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate visemes: ${response.statusText}`);
      }

      const response_data = await response.json();
      const data: VisemeResponse = response_data.data || response_data; // Handle server success wrapper

      console.log("Client received response:", response_data);
      console.log("Client extracted data:", {
        hasAudioBuffer: !!data.audioBuffer,
        audioBufferType: typeof data.audioBuffer,
        audioBufferLength: data.audioBuffer ? data.audioBuffer.length : 'undefined',
        visemesCount: data.visemes ? data.visemes.length : 'undefined',
        duration: data.duration
      });

      // Convert base64 audio data to blob URL with validation
      if (!data.audioBuffer || typeof data.audioBuffer !== 'string') {
        console.error("Invalid audio buffer - data.audioBuffer:", data.audioBuffer);
        throw new Error('Invalid audio buffer received from server');
      }
      
      let binaryString;
      try {
        binaryString = atob(data.audioBuffer);
      } catch (error) {
        console.error('Failed to decode base64 audio buffer:', error);
        throw new Error('Invalid base64 audio data received from server');
      }
      
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

      // Store event listeners in ref for later use
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

        // Update viseme with canvas rendering for smooth transitions
        setCurrentVisemeId(prevId => {
          if (prevId !== targetVisemeId) {
            console.log(`RAF: Syncing viseme ${targetVisemeId} at time ${currentTime.toFixed(0)}ms`);
            drawVisemeOnCanvas(targetVisemeId);
            return targetVisemeId;
          }
          return prevId;
        });

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(syncVisemeWithAudio);
      };

      // Set up event handlers for precise control
      const handleAudioEnd = () => {
        console.log("Audio playback completed");
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        setAnimationCompleted(true);
        cleanupEventListeners();
      };

      const handleAudioError = (e: Event) => {
        console.error("Audio error during synchronized playback:", e);
        setIsPlayingVisemes(false);
        setCurrentVisemeId(0);
        cleanupEventListeners();

        toast({
          title: "Audio Error",
          description: "Audio playback encountered an error.",
          variant: "destructive",
        });
      };

      // Store event listeners in ref for cleanup
      currentEventListenersRef.current = {
        ended: handleAudioEnd,
        error: handleAudioError
      };

      // Attach event listeners for control
      audio.addEventListener("ended", handleAudioEnd);
      audio.addEventListener("error", handleAudioError);

      // Draw initial viseme (neutral mouth position) before starting animation
      drawVisemeOnCanvas(0);

      // Start audio playback and animation synchronization
      await audio.play();
      animationFrameRef.current = requestAnimationFrame(syncVisemeWithAudio);

    } catch (error) {
      console.error("Error playing viseme animation:", error);
      setIsPlayingVisemes(false);
      setCurrentVisemeId(0);
      toast({
        title: "Animation Playback Error",
        description: "Could not play the animation. Please try again.",
        variant: "destructive",
      });
    }
  }, [visemeData, visemeAudioUrl, animationReady, imagesReady, audioReady, preloadedImages]);

  // Handle closing animation modal with proper cleanup
  const handleCloseAnimation = () => {
    // Stop any playing animation
    if (isPlayingVisemes && visemeAudioRef.current) {
      visemeAudioRef.current.pause();
      visemeAudioRef.current.currentTime = 0;
      setIsPlayingVisemes(false);
    }
    
    // Reset animation state
    setCurrentVisemeId(0);
    setAnimationCompleted(false);
    setShowVisemeDialog(false);
    
    // Clean up audio URL to prevent memory leaks
    if (visemeAudioUrl) {
      URL.revokeObjectURL(visemeAudioUrl);
      setVisemeAudioUrl("");
    }
    
    // Clear any pending timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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

  // Sync carousel with current index
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        const newIndex = emblaApi.selectedScrollSnap();
        // Only update if not auto-advancing from completion
        if (!showSummary) {
          setCurrentItemIndex(newIndex);
        }
      });
    }
  }, [emblaApi, showSummary]);

  // Handle finish assignment
  const handleFinishAssignment = () => {
    setIsFinishing(true);
    setShowSummary(true);
    
    toast({
      title: "🎉 Assignment Complete!",
      description: `Excellent work! You've completed "${assignment?.title}"`,
    });
    
    setTimeout(() => {
      setIsFinishing(false);
    }, 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
            <p>You need to be signed in to access assignments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (assignmentError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Assignment Error</h2>
            <p className="mb-4 text-red-600">
              {assignmentError.message || 'Failed to load assignment'}
            </p>
            <p className="mb-4 text-gray-600">
              Please check your connection and try again, or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Link href="/my-words">
                <Button className="w-full">Back to My Words</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignment && !assignmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Assignment Not Found</h2>
            <p className="mb-4">The assignment you're looking for doesn't exist or you don't have access to it.</p>
            <Link href="/my-words">
              <Button>Back to My Words</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/my-words">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Words
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{assignment.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {assignment.therapistName}
                  </div>
                  {assignment.dueDate && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Progress: {completedItems.size} / {items.length}
              </div>
              <Progress value={progressPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">No Items in Assignment</h2>
              <p>This assignment doesn't contain any practice items yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assignment Progress</h3>
                <div className="text-sm text-gray-600">
                  {completedItems.size} / {items.length} completed
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {items.map((item, index) => (
                  <Button
                    key={item.id}
                    variant={index === currentItemIndex ? "default" : "outline"}
                    size="sm"
                    className="justify-start relative h-8"
                    onClick={() => {
                      if (!showSummary) {
                        setCurrentItemIndex(index);
                        if (emblaApi) emblaApi.scrollTo(index);
                      }
                    }}
                  >
                    {completedItems.has(item.id) && (
                      <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                    )}
                    <span className="truncate text-xs">{item.content}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentItemIndex === 0 || showSummary}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                {currentItemIndex + 1} of {items.length}
              </div>
              
              {canFinish ? (
                <Button
                  onClick={handleFinishAssignment}
                  disabled={isFinishing}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isFinishing ? (
                    <>Finishing...</>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Finish
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={goToNext}
                  disabled={currentItemIndex === items.length - 1 || showSummary}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Words.tsx-style Carousel */}
            {!showSummary && (
              <div className="flex justify-center">
                <div className="embla w-full max-w-lg" ref={emblaRef}>
                  <div className="embla__container flex">
                    {items.map((item, index) => (
                    <div key={item.id} className="embla__slide flex-[0_0_100%] px-2">
                      <Card 
                        className="h-full shadow-lg border-0 min-h-[600px]" 
                        style={{ backgroundColor: '#1947e5' }}
                      >
                        <CardHeader className="text-center">
                          <CardTitle className="text-3xl font-bold text-white">
                            {item.content}
                          </CardTitle>
                          {item.syllabication && (
                            <div className="text-lg italic mt-2">
                              <span className="text-white/80">{item.syllabication}</span>
                            </div>
                          )}
                          {item.phonetic && (
                            <div className="text-lg text-white/80 mt-1">
                              {item.phonetic}
                            </div>
                          )}
                          {item.definition && (
                            <div className="text-base text-white/80 mt-3 max-w-md mx-auto">
                              <strong>Definition:</strong> {item.definition}
                            </div>
                          )}
                          {completedItems.has(item.id) && (
                            <div className="flex items-center justify-center text-green-300 mt-2">
                              <CheckCircle className="w-5 h-5 mr-1" />
                              Completed
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="space-y-4 px-6">
                          {/* Recording Control */}
                          <div className="flex justify-center">
                            <SimpleRecorder
                              referenceText={item.content}
                              contentId={item.id}
                              onAssessmentReceived={(assessment) => {
                                if (assessment.pronunciationScore) {
                                  handleItemComplete(item.id, assessment.pronunciationScore);
                                  const attempts = (itemAttempts[item.id] || 0) + 1;
                                  const isMaxAttempts = attempts >= 3;
                                  toast({
                                    title: isMaxAttempts ? "Moving to next word!" : "Great job!",
                                    description: isMaxAttempts 
                                      ? `Final attempt: ${assessment.pronunciationScore}% on "${item.content}"`
                                      : `You scored ${assessment.pronunciationScore}% on "${item.content}" (Attempt ${attempts}/3)`,
                                  });
                                }
                              }}
                            />
                          </div>

                          {/* Control Buttons Row */}
                          <div className="flex justify-center gap-3">
                            {/* Hear Button */}
                            <Button
                              onClick={() => handleTextToSpeech(item.content, item.id, slowPlaybackItems[item.id])}
                              disabled={audioPlaying === item.id}
                              className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                            >
                              <Ear className="h-4 w-4 mr-1" />
                              Hear
                            </Button>

                            {/* Snail Toggle Switch */}
                            <button
                              onClick={() => toggleSlowPlayback(item.id)}
                              className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                slowPlaybackItems[item.id] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                              }`}
                              role="switch"
                              aria-checked={slowPlaybackItems[item.id]}
                            >
                              <span className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                                slowPlaybackItems[item.id] ? 'translate-x-8' : 'translate-x-1'
                              }`}>
                                <Snail className="h-3 w-3 text-gray-600" />
                              </span>
                            </button>

                            {/* See Button */}
                            <Button
                              onClick={() => generateVisemeAnimation(currentItem.content, currentItem.id)}
                              className="h-10 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white border-0"
                              disabled={isGeneratingVisemes || isPlayingVisemes}
                            >
                              {isGeneratingVisemes ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Generating...
                                </div>
                              ) : isPlayingVisemes ? (
                                <div className="flex items-center">
                                  <Square className="h-4 w-4 mr-1" />
                                  Stop
                                </div>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  See
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Viseme Animation Dialog */}
                          <Dialog open={showVisemeDialog} onOpenChange={setShowVisemeDialog}>
                            <DialogContent className="w-[95vw] max-w-md sm:max-w-lg p-0 overflow-hidden">
                              <DialogHeader className="p-4 pb-0">
                                <DialogTitle className="text-center text-2xl font-bold text-blue-600">
                                  Articulation Practice
                                </DialogTitle>
                                <DialogDescription className="text-center text-gray-600">
                                  Watch the animation to see how to pronounce "{currentVisemeWord}"
                                </DialogDescription>
                              </DialogHeader>
                              <div className="relative w-full mx-auto max-w-sm" style={{ paddingTop: '75%' }}>
                                <canvas
                                  ref={canvasRef}
                                  width="400"
                                  height="300"
                                  className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50 rounded"
                                ></canvas>
                                {(isGeneratingVisemes || !canPlay) && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                                    <p className="text-lg">
                                      {isGeneratingVisemes ? "Generating animation..." : "Loading assets..."}
                                    </p>
                                    <div className="w-3/4 bg-gray-700 rounded-full h-2.5 mt-2">
                                      <div
                                        className="bg-blue-500 h-2.5 rounded-full"
                                        style={{ width: `${(loadingProgress.images + loadingProgress.audio) / 2}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-sm mt-1">
                                      {Math.round((loadingProgress.images + loadingProgress.audio) / 2)}% loaded
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="p-4 pt-2 space-y-3">
                                <audio ref={visemeAudioRef} src={visemeAudioUrl} preload="auto" />
                                
                                {/* Primary Action Button */}
                                <div className="flex justify-center">
                                  <Button
                                    onClick={playVisemeAnimation}
                                    disabled={!canPlay}
                                    size="lg"
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg"
                                  >
                                    {isPlayingVisemes ? (
                                      <>
                                        <Pause className="h-5 w-5 mr-2" />
                                        Playing...
                                      </>
                                    ) : animationCompleted ? (
                                      <>
                                        <RotateCcw className="h-5 w-5 mr-2" />
                                        Play Again
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-5 w-5 mr-2" />
                                        Play Animation
                                      </>
                                    )}
                                  </Button>
                                </div>
                                
                                {/* Secondary Actions */}
                                <div className="flex justify-center">
                                  <Button
                                    onClick={handleCloseAnimation}
                                    variant="outline"
                                    size="sm"
                                    className="px-4"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Close
                                  </Button>
                                </div>
                                
                                {/* Animation Progress */}
                                {isPlayingVisemes && visemeAudioRef.current && (
                                  <div className="text-center text-sm text-gray-600">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                      <div 
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-100" 
                                        style={{ width: visemeAudioRef.current.duration ? `${(visemeAudioRef.current.currentTime / visemeAudioRef.current.duration) * 100}%` : '0%' }}
                                      ></div>
                                    </div>
                                    Practicing pronunciation...
                                  </div>
                                )}
                                
                                {/* Completion Message */}
                                {animationCompleted && (
                                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                                    <div className="text-green-700 font-medium text-sm flex items-center justify-center">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Great! You've seen how to pronounce "{currentVisemeWord}"
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Progress Info */}
                          {(itemAttempts[item.id] > 0 || itemBestScores[item.id] > 0) && (
                            <div className="text-center text-sm text-white/80">
                              Attempts: {itemAttempts[item.id] || 0}/3
                              {itemBestScores[item.id] > 0 && (
                                <span className="ml-2">Best score: {itemBestScores[item.id].toFixed(1)}%</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showSummary && (
              <Card 
                className="h-full shadow-lg border-0 min-h-[600px]" 
                style={{ backgroundColor: '#1947e5' }}
              >
                <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                  <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 relative z-10">
                    <CheckCircle className="w-6 h-6" />
                    Assignment Complete!
                  </CardTitle>
                  <p className="text-white/90 mt-2 text-base relative z-10">
                    Excellent work on "{assignment?.title}"
                  </p>
                  
                  {/* Celebratory particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                    <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                    <div className="absolute top-6 right-1/4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 px-6">
                  {/* Performance Summary */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-[#1947e5]">
                        {Object.values(itemBestScores).length > 0 
                          ? Math.round(Object.values(itemBestScores).reduce((a, b) => a + b, 0) / Object.values(itemBestScores).length)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-600">Avg Score</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-[#1947e5]">
                        {completedItems.size}
                      </div>
                      <div className="text-xs text-gray-600">Words Completed</div>
                    </div>
                  </div>
                  
                  {/* Words that need more practice */}
                  {Object.entries(itemBestScores).filter(([_, score]) => score < 70).length > 0 && (
                    <div className="w-full p-3 bg-white rounded-lg">
                      <h4 className="text-sm font-semibold text-[#1947e5] mb-2">Words to Practice More:</h4>
                      <div className="space-y-1">
                        {Object.entries(itemBestScores)
                          .filter(([_, score]) => score < 70)
                          .map(([itemId, score]) => {
                            const item = items.find(i => i.id.toString() === itemId);
                            return item ? (
                              <div key={itemId} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                                <span className="text-sm font-medium">{item.content}</span>
                                <span className="text-sm text-red-600">{score.toFixed(1)}%</span>
                              </div>
                            ) : null;
                          })
                        }
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-4">
                    <Link href="/my-words">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Assignments
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentPractice;