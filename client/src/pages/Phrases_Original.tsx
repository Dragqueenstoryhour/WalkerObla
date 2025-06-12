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
      if (currentPhraseIndex >= 0) {
        processPhraseRecording(blob, currentPhraseIndex);
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
    if (!phrase) return;

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
                    <Card className="bg-white shadow-lg border-0 h-full card-content">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold text-[#2a5e2a]">
                            Phrase {index + 1}
                          </CardTitle>
                          <Badge 
                            variant={
                              phrase.status === "complete" ? "default" :
                              phrase.status === "recording" ? "secondary" :
                              phrase.status === "assessing" ? "outline" : "outline"
                            }
                            className={
                              phrase.status === "complete" ? "bg-green-100 text-green-800" :
                              phrase.status === "recording" ? "bg-red-100 text-red-800" :
                              phrase.status === "assessing" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {phrase.status === "complete" ? "Complete" :
                             phrase.status === "recording" ? "Recording" :
                             phrase.status === "assessing" ? "Analyzing" : "Ready"}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Phrase text */}
                        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4">
                          <p className="text-2xl font-bold text-[#0c4a6e] text-center leading-relaxed">
                            {phrase.text}
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
                            onClick={() => toggleSlowPlayback(phrase.id)}
                            variant="outline"
                            size="sm"
                            className={`flex items-center gap-2 ${slowPlaybackPhrases[phrase.id] ? 'bg-blue-50 border-blue-300' : ''}`}
                          >
                            <Snail className="h-4 w-4" />
                            {slowPlaybackPhrases[phrase.id] ? 'Normal' : 'Slow'}
                          </Button>

                          <Button
                            onClick={() => savePhraseToCollection(index)}
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
                          {phrase.status === "idle" && (
                            <Button
                              onClick={() => startPhrasePractice(index)}
                              className="w-full bg-[#57cc99] hover:bg-[#4ade80] text-white py-3"
                              disabled={isRecording || isProcessingRecording}
                            >
                              <Mic className="h-5 w-5 mr-2" />
                              Start Recording
                            </Button>
                          )}

                          {phrase.status === "recording" && (
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
                                  onClick={stopPhrasePractice}
                                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <StopCircleIcon className="h-5 w-5 mr-2" />
                                  Stop Recording
                                </Button>
                                <Button
                                  onClick={() => cancelPhrasePractice(index)}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {phrase.status === "assessing" && (
                            <div className="text-center space-y-3">
                              <div className="flex items-center justify-center space-x-2">
                                <RotateCw className="h-5 w-5 animate-spin text-[#57cc99]" />
                                <span className="text-sm font-medium text-[#264653]">
                                  Analyzing pronunciation...
                                </span>
                              </div>
                            </div>
                          )}

                          {phrase.status === "complete" && phrase.assessmentResult && (
                            <div className="space-y-3">
                              {/* Assessment results */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="text-center space-y-2">
                                  <div className="flex items-center justify-center space-x-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="font-semibold text-green-800">Assessment Complete</span>
                                  </div>
                                  
                                  <div className="text-2xl font-bold text-green-700">
                                    {Math.round(phrase.assessmentResult.pronunciationScore)}%
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                      <div className="font-medium text-gray-600">Accuracy</div>
                                      <div className="font-bold text-gray-800">
                                        {Math.round(phrase.assessmentResult.accuracyScore)}%
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="font-medium text-gray-600">Fluency</div>
                                      <div className="font-bold text-gray-800">
                                        {Math.round(phrase.assessmentResult.fluencyScore)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Playback recording section */}
                              {phrase.recordingUrl && (
                                <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
                                  <div className="text-sm font-medium text-[#264653]">
                                    Listen to your recording:
                                  </div>
                                  <AudioPlaybackButton
                                    audioUrl={phrase.recordingUrl}
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
                                  setProcessedPhrases(phrases =>
                                    phrases.map((p, idx) =>
                                      idx === index ? { ...p, status: "idle", assessmentResult: undefined, recordingUrl: undefined } : p
                                    )
                                  );
                                  setPhraseAssessmentResult(null);
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