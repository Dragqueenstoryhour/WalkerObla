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
  const [savedPhrases, setSavedPhrases] = useState<Set<string>>(new Set());
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
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

  // Predefined phrase topics
  const phraseTopics = [
    "Common Phrases",
    "Greetings",
    "Daily Conversations",
    "Restaurant Phrases",
    "Shopping Phrases",
    "Travel Phrases",
    "Medical Phrases",
    "Business Phrases",
    "Emergency Phrases",
    "Social Phrases",
    "Phone Conversations",
    "Weather Talk"
  ];

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

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
      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "recording" } : p,
        ),
      );

      // Start recording using the hook
      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording phrase: "${phrase.text}"`,
      });
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
      const response = await fetch("/api/saved-phrases", {
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

      setSavedPhrases(prev => new Set([...prev, phrase.text]));
    } catch (error) {
      console.error("Error saving phrase:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
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

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">Speech Practice - Phrases</h1>
          <p className="text-muted-foreground">
            Generate and practice phrases to improve your speech fluency and pronunciation
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
                {phraseTopics.map((topic) => (
                  <Card
                    key={topic}
                    className="cursor-pointer hover:shadow-md hover:bg-[#0F3CC9] transition-all duration-200 h-16"
                    style={{ backgroundColor: '#1947e5' }}
                    onClick={() => handleGenerateTopicPhrases(topic)}
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
                  placeholder="Enter a topic you'd like to practice phrases about..."
                  value={aiGenerateTopic}
                  onChange={(e) => setAiGenerateTopic(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateTopicPhrases(aiGenerateTopic);
                    }
                  }}
                  className="flex-1"
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
            <div className="bg-white rounded-lg p-4 shadow-lg border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
                <span className="text-sm text-[#264653]">
                  {currentCarouselIndex + 1} of {processedPhrases.length}
                </span>
              </div>
              <Progress 
                value={((currentCarouselIndex + 1) / processedPhrases.length) * 100} 
                className="h-2"
              />
            </div>

            {/* Carousel */}
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex">
                {processedPhrases.map((phrase, index) => (
                  <div key={phrase.id} className="embla__slide flex-[0_0_100%] px-2">
                    <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                      <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold text-white">{phrase.text}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Recording Controls */}
                        <div className="flex justify-center gap-2">
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
                            onClick={() => toggleSlowPlayback(phrase.id)}
                            className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              slowPlaybackPhrases[phrase.id] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
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
                              <Snail className="h-3 w-3 text-gray-600" />
                            </span>
                          </button>
                          <Button
                            onClick={() => savePhraseToCollection(index)}
                            variant="outline"
                            className="h-10 px-4 bg-[#6366F1] hover:bg-[#5855EB] text-white border-0"
                          >
                            <Star className={`h-4 w-4 mr-1 ${savedPhrases.has(processedPhrases[index]?.text) ? 'fill-white' : ''}`} />
                            Save
                          </Button>
                        </div>

                        {/* Assessment Results with Bar Charts */}
                        {phrase.status === "complete" && phrase.assessmentResult && (
                          <div className="space-y-4 mt-6 bg-white rounded-lg p-4 mx-2">
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
                disabled={currentCarouselIndex >= processedPhrases.length - 1}
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