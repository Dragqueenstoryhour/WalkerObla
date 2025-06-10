import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, X, Plus, Folder, Volume2, Play, Pause, Shuffle, TrendingUp, Award, Target, Clock, BarChart3, BookOpen, Type, List, MicIcon, StopCircleIcon, Ear, Snail, RotateCw, BookmarkIcon, Check } from 'lucide-react';
import { CombinedLineChart } from '@/components/CombinedLineChart';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';

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
  originalId: number; // Store the original numeric ID for deletion
  text: string;
  phonetic?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: any;
  status: "idle" | "recording" | "assessing" | "complete";
}

interface PracticeGroup {
  id: number;
  name: string;
  description: string | null;
  phraseCount: number;
  createdAt: string;
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

// Bar Chart Component with Y-axis labels
function ScoreChart({ scores, title, color }: { scores: number[], title: string, color: string }) {
  if (scores.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        No data yet
      </div>
    );
  }

  const maxScore = 100; // Always use 100 as max for consistency
  const yAxisLabels = [100, 75, 50, 25];
  
  return (
    <div className="flex h-32">
      {/* Y-axis labels */}
      <div className="flex flex-col justify-between text-xs text-gray-400 pr-2 py-1">
        {yAxisLabels.map(label => (
          <span key={label}>{label}%</span>
        ))}
      </div>
      
      {/* Chart bars */}
      <div className="flex items-end gap-1 justify-center flex-1">
        {scores.slice(-10).map((score, index) => (
          <div
            key={index}
            className={`${color} rounded-t transition-all duration-300 hover:opacity-80 min-w-[12px] flex-1 max-w-[20px]`}
            style={{ height: `${(score / maxScore) * 100}%` }}
            title={`Score: ${Math.round(score)}%`}
          />
        ))}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ 
  title, 
  icon: Icon, 
  total, 
  avgScore, 
  recentScores, 
  color,
  bgGradient 
}: {
  title: string;
  icon: any;
  total: number;
  avgScore: number;
  recentScores: number[];
  color: string;
  bgGradient: string;
}) {
  return (
    <Card className={`${bgGradient} border-0 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <CardTitle className={`text-lg ${color}`}>{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-gray-700">
            {total} completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Average Score</span>
          <span className={`font-bold text-lg ${color}`}>
            {avgScore > 0 ? `${Math.round(avgScore)}%` : 'N/A'}
          </span>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Recent Performance</span>
            <span className="text-xs text-gray-500">Last 10 sessions</span>
          </div>
          <ScoreChart 
            scores={recentScores} 
            title={title}
            color={color.includes('blue') ? 'bg-blue-500' : 
                   color.includes('purple') ? 'bg-purple-500' : 
                   'bg-emerald-500'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyWords() {
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
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<SavedPhrase | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Recording states for each type
  const [recordingStates, setRecordingStates] = useState<{[key: string]: {
    isRecording: boolean;
    isProcessing: boolean;
    slowPlayback: boolean;
  }}>({});

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch saved phrases
  const { data: phrases = [], isLoading: phrasesLoading, error: phrasesError } = useQuery<SavedPhrase[]>({
    queryKey: ['/api/user/saved-phrases'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch practice groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<PracticeGroup[]>({
    queryKey: ['/api/user/practice-groups'],
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
      setSelectedPhrase(null);
      
      if (currentIndex >= shuffledPhrases.length - 1 && shuffledPhrases.length > 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove word. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (groupData: { name: string; description: string }) =>
      apiRequest('/api/user/practice-groups', 'POST', groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/practice-groups'] });
      toast({
        title: 'Group created',
        description: 'Practice group has been created successfully.',
      });
      setShowCreateGroupDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
    },
  });

  // Add to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: ({ groupId, phraseId }: { groupId: number; phraseId: number }) =>
      apiRequest(`/api/user/practice-groups/${groupId}/phrases`, 'POST', { phraseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/practice-groups'] });
      toast({
        title: 'Added to group',
        description: 'Word has been added to the practice group.',
      });
      setShowAddToGroupDialog(false);
      setSelectedPhrase(null);
      setSelectedGroupId('');
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
        status: "idle" as const
      }));
      
      const phrasesOnly = phrases.filter(p => p.source === 'phrases' || p.source === 'phrase_practice').map(p => ({
        id: `phrase-${p.id}`,
        originalId: p.id,
        text: p.phrase,
        phonetic: p.phonetic || undefined,
        difficulty: (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
        status: "idle" as const
      }));
      
      const readings = phrases.filter(p => p.source === 'reader_content' || p.source === 'reading').map(p => ({
        id: `reading-${p.id}`,
        originalId: p.id,
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
  }, [phrases]);

  // Handle unauthorized errors
  useEffect(() => {
    if (phrasesError && isUnauthorizedError(phrasesError as Error)) {
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
      return;
    }
  }, [phrasesError]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading]);

  const handleShuffle = (type: 'words' | 'phrases' | 'readings') => {
    if (type === 'words') {
      const shuffled = [...shuffledWords].sort(() => Math.random() - 0.5);
      setShuffledWords(shuffled);
      setCurrentWordIndex(0);
    } else if (type === 'phrases') {
      const shuffled = [...shuffledPhrases].sort(() => Math.random() - 0.5);
      setShuffledPhrases(shuffled);
      setCurrentPhraseIndex(0);
    } else if (type === 'readings') {
      const shuffled = [...shuffledReadings].sort(() => Math.random() - 0.5);
      setShuffledReadings(shuffled);
      setCurrentReadingIndex(0);
    }
  };

  const handleNext = (type: 'words' | 'phrases' | 'readings') => {
    if (type === 'words' && currentWordIndex < shuffledWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else if (type === 'phrases' && currentPhraseIndex < shuffledPhrases.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    } else if (type === 'readings' && currentReadingIndex < shuffledReadings.length - 1) {
      setCurrentReadingIndex(currentReadingIndex + 1);
    }
  };

  const handlePrevious = (type: 'words' | 'phrases' | 'readings') => {
    if (type === 'words' && currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    } else if (type === 'phrases' && currentPhraseIndex > 0) {
      setCurrentPhraseIndex(currentPhraseIndex - 1);
    } else if (type === 'readings' && currentReadingIndex > 0) {
      setCurrentReadingIndex(currentReadingIndex - 1);
    }
  };

  const handlePlayAudio = async (text: string) => {
    if (isPlaying) {
      audioElement?.pause();
      setIsPlaying(false);
      return;
    }

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
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      setAudioElement(audio);

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      const playAudio = () => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Audio playback started successfully');
          }).catch((error) => {
            console.error('Audio play failed:', error);
            setIsPlaying(false);
            const fallbackAudio = new Audio(audioUrl);
            fallbackAudio.play().catch(e => {
              console.error('Fallback failed:', e);
              setIsPlaying(false);
            });
          });
        }
      };

      audio.oncanplay = playAudio;
      audio.onloadeddata = playAudio;
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });

      audio.src = audioUrl;
      audio.load();
    } catch (error) {
      setIsPlaying(false);
      toast({
        title: 'Audio Error',
        description: 'Failed to play audio. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (phrase: SavedPhrase) => {
    setSelectedPhrase(phrase);
    setShowDeleteDialog(true);
  };

  const handleAddToGroupClick = (phrase: SavedPhrase) => {
    setSelectedPhrase(phrase);
    setShowAddToGroupDialog(true);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
      });
    }
  };

  const handleAddToGroup = () => {
    if (selectedPhrase && selectedGroupId && selectedPhrase.id) {
      const groupId = parseInt(selectedGroupId);
      const phraseId = parseInt(selectedPhrase.id.toString());
      
      if (!isNaN(groupId) && !isNaN(phraseId)) {
        addToGroupMutation.mutate({
          groupId,
          phraseId,
        });
      }
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

  const currentPhrase = shuffledPhrases[currentIndex];

  return (
    <div className="container mx-auto px-4 py-8 bg-green-50 min-h-screen">
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-800">
              {user?.firstName ? `Welcome, ${user.firstName}!` : 'My Journey'}
            </h1>
            <p className="text-muted-foreground">
              Track your progress and practice your saved words
            </p>
          </div>
          {shuffledPhrases.length > 0 && (
            <Button 
              onClick={handleShuffle} 
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          )}
        </div>



        {/* Practice Groups */}
        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-purple-800">Practice Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group, index) => (
                <Card key={group.id} className={`bg-gradient-to-br ${
                  index % 3 === 0 ? 'from-purple-50 to-pink-50 border-purple-200' :
                  index % 3 === 1 ? 'from-blue-50 to-indigo-50 border-blue-200' :
                  'from-green-50 to-teal-50 border-green-200'
                } shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}>
                  <CardHeader className={`pb-3 ${
                    index % 3 === 0 ? 'bg-gradient-to-r from-purple-100 to-pink-100' :
                    index % 3 === 1 ? 'bg-gradient-to-r from-blue-100 to-indigo-100' :
                    'bg-gradient-to-r from-green-100 to-teal-100'
                  } rounded-t-lg`}>
                    <CardTitle className={`text-lg flex items-center gap-2 ${
                      index % 3 === 0 ? 'text-purple-800' :
                      index % 3 === 1 ? 'text-blue-800' :
                      'text-green-800'
                    }`}>
                      <Folder className="h-4 w-4" />
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <CardDescription className="text-gray-600">{group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="bg-white/50">
                    <Badge className={`${
                      index % 3 === 0 ? 'bg-purple-100 text-purple-700 border-purple-300' :
                      index % 3 === 1 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                      'bg-green-100 text-green-700 border-green-300'
                    }`} variant="outline">
                      {group.phraseCount} word{group.phraseCount === 1 ? '' : 's'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Practice Words Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-purple-800">Practice Words and Phrases</h2>
          
          {shuffledPhrases.length === 0 ? (
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
              <CardContent className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-purple-800 mb-2">No saved words yet</h3>
                <p className="text-purple-600 mb-6">
                  Start practicing words and phrases to build your collection
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/'} 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Practice Words
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/phrases'} 
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    Practice Phrases
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-purple-800">
                    Word {currentIndex + 1} of {shuffledPhrases.length}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-purple-300 text-purple-700">
                          <Plus className="h-4 w-4 mr-1" />
                          New Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Practice Group</DialogTitle>
                          <DialogDescription>
                            Organize your words into practice groups for focused learning.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="groupName">Group Name</Label>
                            <Input
                              id="groupName"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              placeholder="e.g., Difficult Words"
                            />
                          </div>
                          <div>
                            <Label htmlFor="groupDescription">Description (Optional)</Label>
                            <Textarea
                              id="groupDescription"
                              value={newGroupDescription}
                              onChange={(e) => setNewGroupDescription(e.target.value)}
                              placeholder="Describe what this group is for..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim() || createGroupMutation.isPending}
                          >
                            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {currentPhrase && (
                  <div className="text-center space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-4xl font-bold text-purple-800 mb-2">
                        {currentPhrase.phrase}
                      </h3>
                      {currentPhrase.phonetic && (
                        <p className="text-lg text-gray-600 font-mono bg-white/70 px-4 py-2 rounded-lg">
                          {currentPhrase.phonetic}
                        </p>
                      )}
                      {currentPhrase.difficulty && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {currentPhrase.difficulty}
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => handlePlayAudio(currentPhrase.phrase)}
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
                        onClick={() => handleAddToGroupClick(currentPhrase)}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        Add to Group
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteClick(currentPhrase)}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <Button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-gray-500">
                        {currentIndex + 1} / {shuffledPhrases.length}
                      </span>
                      
                      <Button
                        onClick={handleNext}
                        disabled={currentIndex === shuffledPhrases.length - 1}
                        variant="outline"
                        size="sm"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Word</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{selectedPhrase?.phrase}" from your saved words?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedPhrase && deleteMutation.mutate(selectedPhrase.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add to Group Dialog */}
        <Dialog open={showAddToGroupDialog} onOpenChange={setShowAddToGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Practice Group</DialogTitle>
              <DialogDescription>
                Choose a practice group for "{selectedPhrase?.phrase}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupSelect">Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name} ({group.phraseCount} words)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddToGroup}
                disabled={!selectedGroupId || addToGroupMutation.isPending}
              >
                {addToGroupMutation.isPending ? 'Adding...' : 'Add to Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}