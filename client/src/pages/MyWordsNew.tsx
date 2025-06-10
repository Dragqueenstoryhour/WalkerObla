import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Volume2, Shuffle, BookOpen, MicIcon, StopCircleIcon, Ear, Snail, RotateCw, BookmarkIcon, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SavedPhrase {
  id: number;
  phrase: string;
  phonetic: string | null;
  difficulty: string | null;
  source: string | null;
  createdAt: string;
}

interface ProcessedItem {
  id: string;
  text: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: any;
  status: "idle" | "recording" | "assessing" | "complete";
}

// Practice Carousel Component
function PracticeCarousel({ 
  items, 
  currentIndex, 
  onNext, 
  onPrevious, 
  onShuffle, 
  title, 
  color,
  emptyMessage 
}: {
  items: ProcessedItem[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  title: string;
  color: string;
  emptyMessage: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordingStates, setRecordingStates] = useState<{[key: string]: {
    isRecording: boolean;
    isProcessing: boolean;
    slowPlayback: boolean;
  }}>({});
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<ProcessedItem | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentItem = items[currentIndex];

  const getRecordingState = (id: string) => {
    return recordingStates[id] || { isRecording: false, isProcessing: false, slowPlayback: false };
  };

  const updateRecordingState = (id: string, updates: Partial<typeof recordingStates[string]>) => {
    setRecordingStates(prev => ({
      ...prev,
      [id]: { ...getRecordingState(id), ...updates }
    }));
  };

  const startRecording = async (item: ProcessedItem) => {
    try {
      updateRecordingState(item.id, { isRecording: true });
      item.status = "recording";
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processRecording(item, audioBlob);
        } catch (error) {
          console.error('Error processing recording:', error);
          updateRecordingState(item.id, { isRecording: false, isProcessing: false });
          item.status = "idle";
        }
      };

      mediaRecorder.start(100);
    } catch (error) {
      console.error('Error starting recording:', error);
      updateRecordingState(item.id, { isRecording: false });
      item.status = "idle";
    }
  };

  const stopRecording = (item: ProcessedItem) => {
    updateRecordingState(item.id, { isRecording: false });
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processRecording = async (item: ProcessedItem, audioBlob: Blob) => {
    updateRecordingState(item.id, { isRecording: false, isProcessing: true });
    item.status = "assessing";

    try {
      const recordingUrl = URL.createObjectURL(audioBlob);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", item.text);
      formData.append("itemType", "word");
      formData.append("source", "my_journey");

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      
      item.status = "complete";
      item.assessmentResult = result;
      item.recordingBlob = audioBlob;
      item.recordingUrl = recordingUrl;

      updateRecordingState(item.id, { isProcessing: false });
    } catch (error) {
      console.error("Error processing recording:", error);
      updateRecordingState(item.id, { isProcessing: false });
      item.status = "idle";
    }
  };

  const playTTS = async (item: ProcessedItem) => {
    try {
      const state = getRecordingState(item.id);
      const speed = state.slowPlayback ? 0.7 : 1.0;

      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          voice: "alloy",
          speed: speed,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate speech");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(error => {
        console.error("Error playing TTS:", error);
      });

      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("Error with text-to-speech:", error);
    }
  };

  const playRecording = (item: ProcessedItem) => {
    if (!item.recordingBlob) return;

    try {
      const audioUrl = URL.createObjectURL(item.recordingBlob);
      const audio = new Audio(audioUrl);
      
      audio.onerror = (e) => {
        console.error('Recording playback error:', e);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(error => {
        console.error('Recording play failed:', error);
      });

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("Error playing recording:", error);
    }
  };

  const toggleSlowPlayback = (item: ProcessedItem) => {
    const state = getRecordingState(item.id);
    updateRecordingState(item.id, { slowPlayback: !state.slowPlayback });
  };

  const removeItem = async (item: ProcessedItem) => {
    try {
      // Extract the original ID from the prefixed ID
      const originalId = item.id.split('-')[1];
      
      const response = await fetch(`/api/user/saved-phrases/${originalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove item");
      }

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });

      toast({
        title: "Removed",
        description: `"${item.text}" removed from your collection.`,
      });
      
      setShowRemoveDialog(false);
      setItemToRemove(null);
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: 'Remove Error',
        description: 'Could not remove item. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveClick = (item: ProcessedItem) => {
    setItemToRemove(item);
    setShowRemoveDialog(true);
  };

  if (items.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-purple-800">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold text-purple-800 mb-2">{emptyMessage}</h3>
          <p className="text-purple-600 mb-6">
            Start practicing to build your collection
          </p>
        </CardContent>
      </Card>
    );
  }

  const state = getRecordingState(currentItem.id);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold text-purple-800">{title}</CardTitle>
        <Button 
          onClick={onShuffle}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Shuffle
        </Button>
      </CardHeader>
      <CardContent>
        <Card className="h-full relative" style={{ backgroundColor: color }}>
          <button
            onClick={() => handleRemoveClick(currentItem)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            aria-label="Remove item"
          >
            <X className="h-4 w-4" />
          </button>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">{currentItem.text}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex justify-center gap-2">
              {currentItem.status === "idle" && (
                <Button
                  onClick={() => startRecording(currentItem)}
                  className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                  disabled={state.isRecording || state.isProcessing}
                >
                  <MicIcon className="h-5 w-5" />
                  Start Recording
                </Button>
              )}
              
              {currentItem.status === "recording" && (
                <Button
                  onClick={() => stopRecording(currentItem)}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <StopCircleIcon className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}
              
              {currentItem.status === "assessing" && (
                <Button disabled className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </Button>
              )}
              
              {currentItem.status === "complete" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => startRecording(currentItem)}
                    className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                  >
                    <RotateCw className="h-5 w-5" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => playRecording(currentItem)}
                    variant="outline"
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                  >
                    <Volume2 className="h-4 w-4" />
                    Listen to me
                  </Button>
                </div>
              )}
            </div>

            {/* Hear and Slow Switch */}
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => playTTS(currentItem)}
                variant="outline"
                className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
              >
                <Ear className="h-4 w-4 mr-1" />
                Hear
              </Button>
              <button
                onClick={() => toggleSlowPlayback(currentItem)}
                className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  state.slowPlayback ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={state.slowPlayback}
                aria-label="Toggle slow playback"
              >
                <span
                  className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                    state.slowPlayback ? 'translate-x-8' : 'translate-x-1'
                  }`}
                >
                  <Snail className="w-3 h-3 text-gray-600" />
                </span>
              </button>
            </div>



            {/* Assessment Results */}
            {currentItem.status === "complete" && currentItem.assessmentResult && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    {currentItem.assessmentResult.pronunciationScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {items.length > 1 && (
          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={onPrevious}
              variant="outline"
              disabled={currentIndex === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg">
              <span className="font-semibold text-gray-700">{currentIndex + 1}</span>
              <span className="text-gray-500">of</span>
              <span className="font-semibold text-gray-700">{items.length}</span>
            </span>
            <Button
              onClick={onNext}
              variant="outline"
              disabled={currentIndex === items.length - 1}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{itemToRemove?.text}" from your practice collection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRemoveDialog(false);
              setItemToRemove(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => itemToRemove && removeItem(itemToRemove)}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function MyWords() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Separate states for each carousel
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  
  const [shuffledWords, setShuffledWords] = useState<ProcessedItem[]>([]);
  const [shuffledPhrases, setShuffledPhrases] = useState<ProcessedItem[]>([]);
  const [shuffledReadings, setShuffledReadings] = useState<ProcessedItem[]>([]);

  // Fetch saved phrases
  const { data: phrases = [], isLoading: phrasesLoading } = useQuery<SavedPhrase[]>({
    queryKey: ['/api/user/saved-phrases'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Separate and process phrases when they change
  useEffect(() => {
    if (phrases.length > 0) {
      // Separate by source type
      const words = phrases.filter(p => p.source === 'words' || p.source === 'reader_feedback').map(p => ({
        id: `word-${p.id}`,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
        status: "idle" as const
      }));
      
      const phrasesOnly = phrases.filter(p => p.source === 'phrases' || p.source === 'phrase_practice').map(p => ({
        id: `phrase-${p.id}`,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
        status: "idle" as const
      }));
      
      const readings = phrases.filter(p => p.source === 'reader_content' || p.source === 'reading').map(p => ({
        id: `reading-${p.id}`,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
        status: "idle" as const
      }));

      // Shuffle each category
      setShuffledWords([...words].sort(() => Math.random() - 0.5));
      setShuffledPhrases([...phrasesOnly].sort(() => Math.random() - 0.5));
      setShuffledReadings([...readings].sort(() => Math.random() - 0.5));
      
      // Reset indices
      setCurrentWordIndex(0);
      setCurrentPhraseIndex(0);
      setCurrentReadingIndex(0);
    } else {
      setShuffledWords([]);
      setShuffledPhrases([]);
      setShuffledReadings([]);
      setCurrentWordIndex(0);
      setCurrentPhraseIndex(0);
      setCurrentReadingIndex(0);
    }
  }, [phrases.length]);

  if (authLoading || phrasesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Sign in to view your journey</h2>
          <p className="text-gray-500">Track your progress and access your saved words</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-800">My Journey</h1>
          <p className="text-muted-foreground">
            Track your progress and practice your saved words, phrases, and readings
          </p>
        </div>

        {/* Practice Words Carousel */}
        <PracticeCarousel
          items={shuffledWords}
          currentIndex={currentWordIndex}
          onNext={() => setCurrentWordIndex(prev => Math.min(prev + 1, shuffledWords.length - 1))}
          onPrevious={() => setCurrentWordIndex(prev => Math.max(prev - 1, 0))}
          onShuffle={() => {
            const shuffled = [...shuffledWords].sort(() => Math.random() - 0.5);
            setShuffledWords(shuffled);
            setCurrentWordIndex(0);
          }}
          title="Practice Words"
          color="#1947e5"
          emptyMessage="No saved words yet"
        />

        {/* Practice Phrases Carousel */}
        <PracticeCarousel
          items={shuffledPhrases}
          currentIndex={currentPhraseIndex}
          onNext={() => setCurrentPhraseIndex(prev => Math.min(prev + 1, shuffledPhrases.length - 1))}
          onPrevious={() => setCurrentPhraseIndex(prev => Math.max(prev - 1, 0))}
          onShuffle={() => {
            const shuffled = [...shuffledPhrases].sort(() => Math.random() - 0.5);
            setShuffledPhrases(shuffled);
            setCurrentPhraseIndex(0);
          }}
          title="Practice Phrases"
          color="#1947e5"
          emptyMessage="No saved phrases yet"
        />

        {/* Practice Readings Carousel */}
        <PracticeCarousel
          items={shuffledReadings}
          currentIndex={currentReadingIndex}
          onNext={() => setCurrentReadingIndex(prev => Math.min(prev + 1, shuffledReadings.length - 1))}
          onPrevious={() => setCurrentReadingIndex(prev => Math.max(prev - 1, 0))}
          onShuffle={() => {
            const shuffled = [...shuffledReadings].sort(() => Math.random() - 0.5);
            setShuffledReadings(shuffled);
            setCurrentReadingIndex(0);
          }}
          title="Practice Readings"
          color="#1947e5"
          emptyMessage="No saved readings yet"
        />
      </div>
    </div>
  );
}