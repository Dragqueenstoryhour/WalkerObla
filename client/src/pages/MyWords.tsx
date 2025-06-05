import { useState, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, X, Plus, Folder, Volume2, Play, Pause, Shuffle } from 'lucide-react';
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

interface PracticeGroup {
  id: number;
  name: string;
  description: string | null;
  phraseCount: number;
  createdAt: string;
}

export default function MyWords() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledPhrases, setShuffledPhrases] = useState<SavedPhrase[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<SavedPhrase | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch saved phrases
  const { data: phrases = [], isLoading: phrasesLoading, error: phrasesError } = useQuery({
    queryKey: ['/api/user/saved-phrases'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch practice groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/user/practice-groups'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Delete phrase mutation
  const deleteMutation = useMutation({
    mutationFn: (phraseId: number) => apiRequest(`/api/user/saved-phrases/${phraseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });
      toast({
        title: 'Word removed',
        description: 'The word has been removed from your saved words.',
      });
      setShowDeleteDialog(false);
      setSelectedPhrase(null);
      
      // Adjust current index if needed
      if (currentIndex >= shuffledPhrases.length - 1 && shuffledPhrases.length > 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
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
      apiRequest('/api/user/practice-groups', {
        method: 'POST',
        body: JSON.stringify(groupData),
        headers: { 'Content-Type': 'application/json' },
      }),
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
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Add to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: ({ groupId, phraseId }: { groupId: number; phraseId: number }) =>
      apiRequest(`/api/user/practice-groups/${groupId}/phrases`, {
        method: 'POST',
        body: JSON.stringify({ phraseId }),
        headers: { 'Content-Type': 'application/json' },
      }),
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
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: 'Failed to add word to group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Shuffle phrases when they change
  useEffect(() => {
    if (phrases.length > 0) {
      const shuffled = [...phrases].sort(() => Math.random() - 0.5);
      setShuffledPhrases(shuffled);
      setCurrentIndex(0);
    } else {
      setShuffledPhrases([]);
      setCurrentIndex(0);
    }
  }, [phrases]);

  // Handle unauthorized errors
  useEffect(() => {
    if (phrasesError && isUnauthorizedError(phrasesError as Error)) {
      toast({
        title: 'Unauthorized',
        description: 'You are logged out. Logging in again...',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
      return;
    }
  }, [phrasesError, toast]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Unauthorized',
        description: 'You are logged out. Logging in again...',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const handleShuffle = () => {
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    setShuffledPhrases(shuffled);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < shuffledPhrases.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
      const audio = new Audio(audioUrl);
      setAudioElement(audio);

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });

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
    if (selectedPhrase && selectedGroupId) {
      addToGroupMutation.mutate({
        groupId: parseInt(selectedGroupId),
        phraseId: selectedPhrase.id,
      });
    }
  };

  if (authLoading || phrasesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentPhrase = shuffledPhrases[currentIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Words</h1>
            <p className="text-muted-foreground">
              {shuffledPhrases.length === 0 
                ? 'No saved words yet' 
                : `${shuffledPhrases.length} saved word${shuffledPhrases.length === 1 ? '' : 's'}`
              }
            </p>
          </div>
          {shuffledPhrases.length > 0 && (
            <Button onClick={handleShuffle} variant="outline" size="sm">
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          )}
        </div>

        {/* Practice Groups */}
        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Practice Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <CardDescription>{group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
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
          <h2 className="text-xl font-semibold mb-4">Practice Words and Phrases</h2>
          
          {shuffledPhrases.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  You haven't saved any words yet. Save words during practice sessions to see them here!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} of {shuffledPhrases.length}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentIndex === shuffledPhrases.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(currentPhrase)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="text-center py-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">{currentPhrase.phrase}</h3>
                  
                  {currentPhrase.phonetic && (
                    <p className="text-lg text-muted-foreground font-mono">
                      [{currentPhrase.phonetic}]
                    </p>
                  )}
                  
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      onClick={() => handlePlayAudio(currentPhrase.phrase)}
                      variant="outline"
                      size="sm"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    
                    <Button
                      onClick={() => handleAddToGroupClick(currentPhrase)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Group
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    {currentPhrase.difficulty && (
                      <Badge variant="outline">{currentPhrase.difficulty}</Badge>
                    )}
                    {currentPhrase.source && (
                      <Badge variant="outline">{currentPhrase.source}</Badge>
                    )}
                    <span>
                      Saved {new Date(currentPhrase.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Group Button */}
        <div className="text-center">
          <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Practice Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Practice Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize your practice words and phrases.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Description (optional)</Label>
                  <Textarea
                    id="group-description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Enter group description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending}
                >
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
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
              Add "{selectedPhrase?.phrase}" to a practice group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-select">Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No groups available. Create a group first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToGroupDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToGroup}
              disabled={!selectedGroupId || addToGroupMutation.isPending}
            >
              Add to Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}