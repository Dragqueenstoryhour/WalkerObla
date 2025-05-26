import React, { useState, useRef, useEffect, useContext } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import useAudioRecording from "@/hooks/useAudioRecording";
import { PronunciationAssessmentResult } from "@/lib/types";
import {
  MicIcon,
  StopCircleIcon,
  VolumeIcon,
  RotateCw,
  Upload,
  CheckCircle,
  FileText,
  Image,
  AlertTriangle,
  BarChart2,
  Share2,
  Award,
  Users,
  Camera,
  Mic,
  Star,
  Volume2,
  Gauge,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { useDifficulty } from "@/contexts/DifficultyContext";
import { DifficultyDropdown } from "@/components/difficulty/SimplifiedDifficultySelector";
import { Turtle } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualEntryText, setManualEntryText] = useState("");
  const [imageUploadText, setImageUploadText] = useState("");
  const [aiGenerateTopic, setAiGenerateTopic] = useState("Commonly Used Words");
  const [customTopic, setCustomTopic] = useState("");
  const [isRecordingTopic, setIsRecordingTopic] = useState(false);
  const [showLetterSelection, setShowLetterSelection] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState("");
  const [processedWords, setProcessedWords] = useState<ProcessedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingSaveIndex, setPendingSaveIndex] = useState<number | null>(null);
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [currentRecordingWord, setCurrentRecordingWord] = useState<ProcessedWord | null>(null);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<{ [key: string]: boolean }>({});
  const [shareableLink, setShareableLink] = useState("");
  const [savedWordId, setSavedWordId] = useState<string | null>(null);
  
  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  
  // Progress tracking
  const [completedWordsCount, setCompletedWordsCount] = useState(0);
  const [showFinalProgress, setShowFinalProgress] = useState(false);
  const [lowScoreWords, setLowScoreWords] = useState<ProcessedWord[]>([]);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle recording completion and assessment
  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Use the stored reference to the currently recording word
    const currentWord = currentRecordingWord;
    
    if (!currentWord) {
      console.log("No current recording word found for assessment");
      return;
    }

    console.log("Processing assessment for word:", currentWord.text);

    try {
      setProcessedWords(prev => prev.map(w => 
        w.id === currentWord.id ? { ...w, status: "assessing" } : w
      ));

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("referenceText", currentWord.text);

      console.log("Sending audio for assessment...");
      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const assessmentResult = await response.json();
      console.log("Received assessment results:", assessmentResult);

      setProcessedWords(prev => prev.map(w => 
        w.id === currentWord.id 
          ? { 
              ...w, 
              status: "complete", 
              assessmentResult,
              recordingBlob: audioBlob,
              recordingUrl: URL.createObjectURL(audioBlob)
            } 
          : w
      ));

      // Clear the recording reference
      setCurrentRecordingWord(null);

      // Track completed words and low scores
      setCompletedWordsCount(prev => {
        const newCount = prev + 1;
        if (newCount === 8) {
          setShowFinalProgress(true);
        }
        return newCount;
      });

      if (assessmentResult.pronunciationScore < 80) {
        setLowScoreWords(prev => [...prev, {
          ...currentWord,
          assessmentResult,
          recordingBlob: audioBlob,
          recordingUrl: URL.createObjectURL(audioBlob)
        }]);
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      
      // Reset the word status on error
      setProcessedWords(prev => prev.map(w => 
        w.id === currentWord.id ? { ...w, status: "idle" } : w
      ));
      
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Audio recording hook
  const {
    recordingDuration,
    audioUrl,
    startRecording: startMainRecording,
    stopRecording: stopMainRecording,
    audioBlob,
  } = useAudioRecording({
    onRecordingComplete: (blob) => {
      console.log("Recording completed, processing assessment...");
      handleRecordingComplete(blob);
    },
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    },
  });

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
  const handleGenerateTopicWords = async (topic: string, targetDifficulty?: string) => {
    setIsGenerating(true);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/content/generate-topic-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty: targetDifficulty || difficulty,
          generationType: "words",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate words");
      }

      const data = await response.json();
      const newWords: ProcessedWord[] = data.phrases.map((word: string, index: number) => ({
        id: `word-${Date.now()}-${index}`,
        text: word,
        status: "idle",
      }));

      setProcessedWords(newWords);
      setCurrentWordIndex(0);
      setCompletedWordsCount(0);
      setShowFinalProgress(false);
      setLowScoreWords([]);

      // Removed toast notification

      scrollToPracticeSection();
    } catch (error) {
      console.error("Error generating words:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate words. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsProcessing(false);
    }
  };

  // Start word practice
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= processedWords.length) return;

    const word = processedWords[wordIndex];
    setCurrentlyPracticing(word.id);
    setCurrentRecordingWord(word); // Store reference to the word being recorded

    // Set status to recording BEFORE starting the recording
    setProcessedWords(prev => prev.map((w, idx) => 
      idx === wordIndex ? { ...w, status: "recording" } : w
    ));

    try {
      await startMainRecording();
    } catch (error) {
      console.error("Error starting recording:", error);
      // Reset status on error
      setProcessedWords(prev => prev.map((w, idx) => 
        idx === wordIndex ? { ...w, status: "idle" } : w
      ));
      setCurrentRecordingWord(null); // Clear the recording reference
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Stop word practice
  const stopWordPractice = async () => {
    try {
      await stopMainRecording();
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle text-to-speech
  const handleTextToSpeech = (wordIndex: number) => {
    const word = processedWords[wordIndex];
    if (!word) return;

    const utterance = new SpeechSynthesisUtterance(word.text);
    utterance.rate = slowPlaybackWords[word.id] ? 0.6 : 1;
    speechSynthesis.speak(utterance);
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

      // Removed toast notification
    } catch (error) {
      console.error("Error saving word:", error);
      toast({
        title: "Save Error",
        description: "Failed to save word. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle speech-to-text for topic generation
  const handleTopicSpeechToText = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecordingTopic(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to transcribe audio');
          }

          const result = await response.json();
          if (result.text) {
            setCustomTopic(result.text);
            setAiGenerateTopic(result.text);
            await handleGenerateTopicWords(result.text);
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast({
            title: "Transcription Error",
            description: "Failed to convert speech to text. Please try again.",
            variant: "destructive",
          });
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecordingTopic(false);
        }
      }, 5000); // Stop after 5 seconds
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive",
      });
      setIsRecordingTopic(false);
    }
  };

  // Handle letter-based word generation
  const handleLetterWordGeneration = async (letter: string) => {
    const topic = `Words that start with ${letter}`;
    setAiGenerateTopic(topic);
    setSelectedLetter(letter);
    setShowLetterSelection(false);
    await handleGenerateTopicWords(topic);
  };

  // Auto-load commonly used words when the page opens
  useEffect(() => {
    if (!shareId) {
      handleGenerateTopicWords("Commonly Used Words");
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Practice Words</h1>
        <DifficultyDropdown onConfirm={async (newDifficulty) => {
          setDifficulty(newDifficulty as any);
          await handleGenerateTopicWords(aiGenerateTopic, newDifficulty);
        }} />
      </div>

      {/* Topic Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose a Topic or Enter Your Own</h2>
        
        {/* Custom Topic Input */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a custom topic (e.g., 'cooking terms', 'travel words')"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customTopic.trim()) {
                  setAiGenerateTopic(customTopic);
                  handleGenerateTopicWords(customTopic);
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (customTopic.trim()) {
                  setAiGenerateTopic(customTopic);
                  handleGenerateTopicWords(customTopic);
                }
              }}
              disabled={!customTopic.trim() || isGenerating}
            >
              Generate
            </Button>
            <Button
              variant="outline"
              onClick={handleTopicSpeechToText}
              disabled={isRecordingTopic || isGenerating}
              className="px-3"
            >
              {isRecordingTopic ? (
                <StopCircleIcon className="h-4 w-4" />
              ) : (
                <MicIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isRecordingTopic && (
            <p className="text-sm text-muted-foreground">Recording... Speak your topic now (up to 5 seconds)</p>
          )}
        </div>

        <h3 className="text-lg font-medium mb-3">Choose a Topic</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            "Commonly Used Words",
            "Family Members", 
            "Colors",
            "Animals",
            "Food",
            "Body Parts",
            "Weather",
            "Numbers",
            "School Supplies",
            "Home Items",
            "Clothing",
            "Transportation"
          ].map((topic) => (
            <Button
              key={topic}
              variant="outline"
              className="text-left h-auto py-3"
              onClick={() => {
                setAiGenerateTopic(topic);
                handleGenerateTopicWords(topic);
              }}
            >
              {topic}
            </Button>
          ))}
          
          {/* Words that Start with... Button */}
          <Button
            variant="outline"
            className="text-left h-auto py-3 bg-blue-50 border-blue-200 hover:bg-blue-100"
            onClick={() => setShowLetterSelection(true)}
          >
            Words that Start with...
          </Button>
        </div>

        {/* Letter Selection Dialog */}
        {showLetterSelection && (
          <Dialog open={showLetterSelection} onOpenChange={setShowLetterSelection}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choose a Starting Letter</DialogTitle>
                <DialogDescription>
                  Select a letter to generate words that start with that letter or sound combination
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-6 gap-3 py-4">
                {/* A-Z Letters */}
                {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
                  <Button
                    key={letter}
                    variant="outline"
                    className="h-12 text-lg font-semibold"
                    onClick={() => handleLetterWordGeneration(letter)}
                  >
                    {letter}
                  </Button>
                ))}
                
                {/* Common consonant combinations */}
                {["Bl", "Br", "Cl", "Cr", "Dr", "Fl", "Fr", "Gl", "Gr", "Pl", "Pr", "Sc", "Sk", "Sl", "Sm", "Sn", "Sp", "St", "Sw", "Th", "Tr", "Tw"].map((combo) => (
                  <Button
                    key={combo}
                    variant="outline"
                    className="h-12 text-sm font-semibold bg-green-50 border-green-200 hover:bg-green-100"
                    onClick={() => handleLetterWordGeneration(combo)}
                  >
                    {combo}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Progress Indicator */}
      {processedWords.length > 0 && !showFinalProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm">{completedWordsCount}/8 words completed</span>
          </div>
          <Progress value={(completedWordsCount / 8) * 100} className="h-3" />
        </div>
      )}

      {/* Practice Words Section with Carousel */}
      {processedWords.length > 0 && !showFinalProgress && (
        <div id="practice-words-section" className="w-full max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Practice Words</h2>
          
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {processedWords.map((word, idx) => (
                  <div key={word.id} className="flex-[0_0_100%] min-w-0">
                    <Card className="mx-4 transition-all">
                      <CardContent className="p-6">
                        {/* Idle state - show word and practice button */}
                        {word.status === "idle" && (
                          <div className="text-center space-y-6">
                            <div className="flex justify-center mb-4">
                              <Button
                                className="bg-primary text-primary-foreground px-8 py-3"
                                onClick={() => startWordPractice(idx)}
                              >
                                <Mic className="h-5 w-5 mr-2" />
                                Practice
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <h3 className="text-4xl font-bold text-center">{word.text}</h3>
                              
                              {/* Audio controls */}
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setSlowPlaybackWords(prev => ({ ...prev, [word.id]: false }));
                                    handleTextToSpeech(idx);
                                  }}
                                >
                                  <Volume2 className="h-4 w-4 mr-1" />
                                  Normal
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setSlowPlaybackWords(prev => ({ ...prev, [word.id]: true }));
                                    handleTextToSpeech(idx);
                                  }}
                                >
                                  <Turtle className="h-4 w-4 mr-1" />
                                  Slow
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`border-yellow-500 text-yellow-600 hover:bg-yellow-50 ${
                                    savedWordId === word.id ? 'bg-yellow-100' : ''
                                  }`}
                                  onClick={() => handleSaveWord(idx)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recording state */}
                        {word.status === "recording" && (
                          <div className="text-center space-y-6">
                            <h3 className="text-3xl font-bold">{word.text}</h3>
                            <div className="relative w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                              <Mic className="h-12 w-12 text-red-500" />
                            </div>
                            <p className="text-lg">Recording...</p>
                            <Button
                              className="bg-red-500 text-white hover:bg-red-600"
                              onClick={stopWordPractice}
                            >
                              <StopCircleIcon className="h-5 w-5 mr-2" />
                              Stop Recording
                            </Button>
                          </div>
                        )}

                        {/* Assessing state */}
                        {word.status === "assessing" && (
                          <div className="text-center space-y-6">
                            <h3 className="text-3xl font-bold">{word.text}</h3>
                            <div className="relative w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                              <RotateCw className="h-12 w-12 text-blue-500 animate-spin" />
                            </div>
                            <p className="text-lg">Analyzing your pronunciation...</p>
                          </div>
                        )}

                        {/* Complete state with results */}
                        {word.status === "complete" && word.assessmentResult && (
                          <div className="space-y-6">
                            <h3 className="text-4xl font-bold text-center">{word.text}</h3>
                            
                            {/* Audio controls */}
                            <div className="flex justify-center gap-2 mb-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setSlowPlaybackWords(prev => ({ ...prev, [word.id]: false }));
                                  const utterance = new SpeechSynthesisUtterance(word.text);
                                  utterance.rate = 1;
                                  speechSynthesis.speak(utterance);
                                }}
                              >
                                <Volume2 className="h-4 w-4 mr-1" />
                                Normal
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setSlowPlaybackWords(prev => ({ ...prev, [word.id]: true }));
                                  const utterance = new SpeechSynthesisUtterance(word.text);
                                  utterance.rate = 0.6;
                                  speechSynthesis.speak(utterance);
                                }}
                              >
                                <Turtle className="h-4 w-4 mr-1" />
                                Slow
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`border-yellow-500 text-yellow-600 hover:bg-yellow-50 ${
                                  savedWordId === word.id ? 'bg-yellow-100' : ''
                                }`}
                                onClick={() => handleSaveWord(idx)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                              {word.recordingUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => {
                                    if (word.recordingUrl) {
                                      if (audioRef.current) {
                                        audioRef.current.src = word.recordingUrl;
                                        audioRef.current.play();
                                      } else {
                                        const audio = new Audio(word.recordingUrl);
                                        audio.play();
                                      }
                                    }
                                  }}
                                >
                                  <VolumeIcon className="h-4 w-4 mr-1" />
                                  Playback
                                </Button>
                              )}
                            </div>

                            {/* Assessment Results */}
                            <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-6">
                              <h4 className="text-xl font-bold text-center text-[#264653] mb-4">
                                Your Performance
                              </h4>
                              <div
                                className="text-6xl font-bold text-center mb-4"
                                style={{
                                  color: word.assessmentResult.pronunciationScore >= 80 ? "#2a9d8f" : "#e76f51",
                                }}
                              >
                                {Math.round(word.assessmentResult.pronunciationScore)}%
                              </div>

                              {/* Detailed scores */}
                              <div className="space-y-3">
                                {[
                                  { label: "Pronunciation", score: word.assessmentResult.pronunciationScore },
                                  { label: "Fluency", score: word.assessmentResult.fluencyScore },
                                  { label: "Completeness", score: word.assessmentResult.completenessScore },
                                  { label: "Accuracy", score: word.assessmentResult.accuracyScore },
                                ].map(({ label, score }) => (
                                  <div key={label} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{label}</span>
                                      <span>{Math.round(score)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                      <div
                                        className="h-2.5 rounded-full"
                                        style={{
                                          width: `${Math.round(score)}%`,
                                          backgroundColor: score >= 80 ? "#2a9d8f" : score >= 60 ? "#e9c46a" : "#e76f51",
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Recording playback */}
                              {word.recordingBlob && (
                                <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mt-4 flex items-center justify-between">
                                  <div className="text-sm font-medium text-[#264653]">
                                    Listen to your recording:
                                  </div>
                                  <button
                                    className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                                    onClick={() => {
                                      if (word.recordingBlob) {
                                        const audio = new Audio(URL.createObjectURL(word.recordingBlob));
                                        audio.play();
                                      }
                                    }}
                                  >
                                    <Volume2 className="h-5 w-5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-center gap-3">
                              <Button
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => startWordPractice(idx)}
                              >
                                Try Again
                              </Button>
                              <Button
                                variant="outline"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setCurrentlyPracticing(null);
                                  goToNext();
                                }}
                              >
                                Next <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentCarouselIndex === 0}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNext}
                disabled={currentCarouselIndex >= processedWords.length - 1}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {/* Carousel dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {processedWords.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentCarouselIndex ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final Progress Summary */}
      {showFinalProgress && (
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">🎉 Great Job!</h2>
            <p className="text-lg text-gray-600">You've completed all 8 practice words!</p>
          </div>

          {/* Progress Chart */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Your Progress</h3>
            <div className="space-y-4">
              {processedWords
                .filter(word => word.assessmentResult)
                .map((word, index) => (
                  <div key={word.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{word.text}</span>
                      <span>{Math.round(word.assessmentResult!.pronunciationScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.round(word.assessmentResult!.pronunciationScore)}%`,
                          backgroundColor: word.assessmentResult!.pronunciationScore >= 80 ? "#2a9d8f" : "#e76f51",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Words needing more practice */}
          {lowScoreWords.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 text-center">Words to Practice More</h3>
              <p className="text-center text-gray-600 mb-4">
                These words scored less than 80% - give them another try!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowScoreWords.map((word, index) => (
                  <div key={`low-${index}`} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold">{word.text}</h4>
                      <span className="text-red-600 font-bold">
                        {Math.round(word.assessmentResult!.pronunciationScore)}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground"
                        onClick={() => {
                          // Find the word in the current list and practice it
                          const wordIndex = processedWords.findIndex(w => w.text === word.text);
                          if (wordIndex !== -1) {
                            goToSlide(wordIndex);
                            setShowFinalProgress(false);
                            startWordPractice(wordIndex);
                          }
                        }}
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        Practice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleSaveWord(processedWords.findIndex(w => w.text === word.text))}
                      >
                        <Star className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Try new topic button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => {
                setShowFinalProgress(false);
                setCompletedWordsCount(0);
                setLowScoreWords([]);
                handleGenerateTopicWords("Commonly Used Words");
              }}
            >
              Practice New Words
            </Button>
          </div>
        </div>
      )}

      {/* Sign in dialog for saving words */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign in to Save Words</DialogTitle>
            <DialogDescription>
              Sign in to save this word to your collection and practice it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center space-y-4">
            <Button 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              variant="default"
              size="lg"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign in to Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}