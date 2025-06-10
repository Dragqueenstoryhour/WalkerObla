import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, X, Play, Pause, Shuffle, BarChart3, BookOpen, Type, List, BookmarkIcon, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CombinedLineChart } from '@/components/CombinedLineChart';

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
  originalId: number;
  text: string;
  phonetic?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced";
  assessmentResult?: { pronunciationScore: number };
}

interface UserActivity {
  id: number;
  activityType: string;
  itemPracticed: string;
  score: number | null;
  accuracy: number | null;
  fluency: number | null;
  completeness: number | null;
  difficulty: string | null;
  createdAt: string;
}

interface ActivityStats {
  wordStats: { total: number; avgScore: number; recent: UserActivity[] };
  phraseStats: { total: number; avgScore: number; recent: UserActivity[] };
  readingStats: { total: number; avgScore: number; recent: UserActivity[] };
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 20); // Convert 0-100 to 0-5 stars
  
  return (
    <div className="flex justify-center items-center mb-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= stars
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function PracticeCardComponent({ 
  items, 
  currentIndex, 
  onNext, 
  onPrevious, 
  onShuffle, 
  onDelete, 
  onPlayAudio, 
  isPlaying, 
  title, 
  icon: Icon, 
  color, 
  emptyMessage 
}: {
  items: ProcessedItem[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onDelete: (originalId: number) => void;
  onPlayAudio: (text: string) => void;
  isPlaying: boolean;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-8 text-center">
          <Icon className="h-16 w-16 mx-auto text-purple-300 mb-4" />
          <h3 className="text-xl font-semibold text-purple-800 mb-2">{emptyMessage}</h3>
          <p className="text-gray-600 mb-4">
            Start practicing to build your personal collection.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className={`${color} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{title}</CardTitle>
              <CardDescription className="text-white/80">
                Practice with pronunciation feedback
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onShuffle}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h3 className="text-4xl font-bold text-purple-800 mb-2">
              {currentItem.text}
            </h3>
            {currentItem.phonetic && (
              <p className="text-lg text-gray-600 font-mono bg-white/70 px-4 py-2 rounded-lg">
                {currentItem.phonetic}
              </p>
            )}
            {currentItem.difficulty && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {currentItem.difficulty}
              </Badge>
            )}
            
            {/* Assessment Score with Stars */}
            {currentItem.assessmentResult && (
              <div className="bg-white/70 px-4 py-3 rounded-lg">
                <StarRating score={currentItem.assessmentResult.pronunciationScore} />
                <p className="text-lg font-semibold text-purple-800">
                  Score: {Math.round(currentItem.assessmentResult.pronunciationScore)}%
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={() => onPlayAudio(currentItem.text)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              disabled={isPlaying}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Playing...' : 'Listen'}
            </Button>
            
            <Button
              onClick={() => onDelete(currentItem.originalId)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {items.length}
            </span>
            
            <Button
              onClick={onNext}
              disabled={currentIndex === items.length - 1}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyWordsFixed() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Separate states for each carousel
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  
  const [shuffledWords, setShuffledWords] = useState<ProcessedItem[]>([]);
  const [shuffledPhrases, setShuffledPhrases] = useState<ProcessedItem[]>([]);
  const [shuffledReadings, setShuffledReadings] = useState<ProcessedItem[]>([]);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch saved phrases
  const { data: phrases = [], isLoading: phrasesLoading } = useQuery<SavedPhrase[]>({
    queryKey: ['/api/user/saved-phrases'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch activity stats
  const { data: activityStats, isLoading: statsLoading } = useQuery<ActivityStats>({
    queryKey: ['/api/user/activity-stats'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Delete phrase mutation
  const deleteMutation = useMutation({
    mutationFn: (phraseId: number) => apiRequest(`/api/user/saved-phrases/${phraseId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });
      toast({
        title: 'Word removed',
        description: 'The word has been removed from your saved words.',
      });
      setShowDeleteDialog(false);
      setSelectedItemId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove word. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Separate and process phrases when they change
  useEffect(() => {
    if (phrases.length > 0) {
      // Separate by source type
      const words = phrases.filter(p => p.source === 'words' || p.source === 'reader_feedback').map(p => ({
        id: `word-${p.id}`,
        originalId: p.id,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
      }));
      
      const phrasesOnly = phrases.filter(p => p.source === 'phrases' || p.source === 'phrase_practice').map(p => ({
        id: `phrase-${p.id}`,
        originalId: p.id,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
      }));
      
      const readings = phrases.filter(p => p.source === 'reader_content' || p.source === 'reading').map(p => ({
        id: `reading-${p.id}`,
        originalId: p.id,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
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
  }, [phrases]);

  const handlePlayAudio = async (text: string) => {
    if (isPlaying) return;

    try {
      setIsPlaying(true);
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Speech synthesis failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      toast({
        title: 'Audio Error',
        description: 'Failed to play audio. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (originalId: number) => {
    setSelectedItemId(originalId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedItemId) {
      deleteMutation.mutate(selectedItemId);
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-800">
              {(user as any)?.firstName ? `Welcome, ${(user as any).firstName}!` : 'My Journey'}
            </h1>
            <p className="text-muted-foreground">
              Track your progress and practice your saved words
            </p>
          </div>
        </div>

        {/* My Stats Section - Combined Line Chart */}
        {activityStats && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-purple-800 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              My Stats
            </h2>
            
            <CombinedLineChart
              wordActivities={activityStats.wordStats.recent}
              phraseActivities={activityStats.phraseStats.recent}
              readingActivities={activityStats.readingStats.recent}
            />
          </div>
        )}

        {/* Practice Words */}
        <div className="mb-12">
          <PracticeCardComponent
            items={shuffledWords}
            currentIndex={currentWordIndex}
            onNext={() => setCurrentWordIndex(Math.min(shuffledWords.length - 1, currentWordIndex + 1))}
            onPrevious={() => setCurrentWordIndex(Math.max(0, currentWordIndex - 1))}
            onShuffle={() => {
              const shuffled = [...shuffledWords].sort(() => Math.random() - 0.5);
              setShuffledWords(shuffled);
              setCurrentWordIndex(0);
            }}
            onDelete={handleDeleteClick}
            onPlayAudio={handlePlayAudio}
            isPlaying={isPlaying}
            title="Practice Words"
            icon={Type}
            color="bg-gradient-to-r from-blue-500 to-indigo-500"
            emptyMessage="No Saved Words Yet"
          />
        </div>

        {/* Practice Phrases */}
        <div className="mb-12">
          <PracticeCardComponent
            items={shuffledPhrases}
            currentIndex={currentPhraseIndex}
            onNext={() => setCurrentPhraseIndex(Math.min(shuffledPhrases.length - 1, currentPhraseIndex + 1))}
            onPrevious={() => setCurrentPhraseIndex(Math.max(0, currentPhraseIndex - 1))}
            onShuffle={() => {
              const shuffled = [...shuffledPhrases].sort(() => Math.random() - 0.5);
              setShuffledPhrases(shuffled);
              setCurrentPhraseIndex(0);
            }}
            onDelete={handleDeleteClick}
            onPlayAudio={handlePlayAudio}
            isPlaying={isPlaying}
            title="Practice Phrases"
            icon={List}
            color="bg-gradient-to-r from-purple-500 to-pink-500"
            emptyMessage="No Saved Phrases Yet"
          />
        </div>

        {/* Practice Readings */}
        <div className="mb-12">
          <PracticeCardComponent
            items={shuffledReadings}
            currentIndex={currentReadingIndex}
            onNext={() => setCurrentReadingIndex(Math.min(shuffledReadings.length - 1, currentReadingIndex + 1))}
            onPrevious={() => setCurrentReadingIndex(Math.max(0, currentReadingIndex - 1))}
            onShuffle={() => {
              const shuffled = [...shuffledReadings].sort(() => Math.random() - 0.5);
              setShuffledReadings(shuffled);
              setCurrentReadingIndex(0);
            }}
            onDelete={handleDeleteClick}
            onPlayAudio={handlePlayAudio}
            isPlaying={isPlaying}
            title="Practice Readings"
            icon={BookOpen}
            color="bg-gradient-to-r from-emerald-500 to-teal-500"
            emptyMessage="No Saved Readings Yet"
          />
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this item from your saved collection?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}