import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, X, Share2, BookmarkPlus, AlertCircle, Play, Trash2, Volume2, 
  FolderPlus, Folder, FolderOpen, MoreVertical, Copy, Edit, FileText, Plus 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the Types
interface SavedPhrase {
  id: number;
  phrase: string;
  phonetic?: string | null;
  difficulty?: string | null;
  source?: string | null;
  assessmentResults?: any;
  createdAt: string;
  userId: string;
}

interface PracticeGroup {
  id: number;
  name: string;
  description?: string | null;
  userId: string;
  shareId?: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PracticeGroupPhrase {
  id: number;
  groupId: number;
  phraseId: number;
  addedAt: string;
}

export default function MyWords() {
  const { isAuthenticated, user } = useAuth();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [selectedPhrase, setSelectedPhrase] = useState<SavedPhrase | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<any | null>(null);
  
  // Practice Groups state
  const [activeTab, setActiveTab] = useState<string>("all-phrases");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

  // State for new phrase input
  const [newPhrase, setNewPhrase] = useState('');

  // Fetch user saved phrases
  const { data: phrasesData, isLoading: isLoadingPhrases, error: phrasesError, refetch: refetchPhrases } = useQuery<{savedPhrases: SavedPhrase[]}>({
    queryKey: ['/api/phrases/saved'],
    enabled: isAuthenticated,
  });

  // Ensure savedPhrases is always an array
  const savedPhrases = phrasesData?.savedPhrases || [];
  const phrasesArray = Array.isArray(savedPhrases) ? savedPhrases : [];
  
  // Fetch practice groups
  const { data: groupsData, isLoading: isLoadingGroups, error: groupsError, refetch: refetchGroups } = useQuery<{groups: PracticeGroup[]}>({
    queryKey: ['/api/practice-groups'],
    enabled: isAuthenticated,
  });
  
  // Ensure groups is always an array
  const practiceGroups = groupsData?.groups || [];
  const groupsArray = Array.isArray(practiceGroups) ? practiceGroups : [];
  
  // Fetch phrases for a specific group when selected
  const { data: groupPhrasesData, isLoading: isLoadingGroupPhrases } = useQuery<{phrases: SavedPhrase[], group: PracticeGroup}>({
    queryKey: ['/api/practice-groups', selectedGroupId],
    enabled: isAuthenticated && selectedGroupId !== null,
  });
  
  // Phrases for the selected group
  const groupPhrases = groupPhrasesData?.phrases || [];
  const currentGroupPhrases = Array.isArray(groupPhrases) ? groupPhrases : [];
  
  // Show all phrases or filtered by selected group
  const displayedPhrases = selectedGroupId !== null ? currentGroupPhrases : phrasesArray;
  
  // Add phrase mutation
  const addPhraseMutation = useMutation({
    mutationFn: async (phrase: string) => {
      return apiRequest('POST', '/api/phrases/save', {
        phrase,
        difficulty: 'medium',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phrases/saved'] });
      toast({
        title: 'Phrase added',
        description: 'The phrase has been added to your saved phrases.',
      });
      setNewPhrase('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add the phrase. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle add phrase
  const handleAddPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhrase.trim()) {
      addPhraseMutation.mutate(newPhrase.trim());
    }
  };

  // Delete phrase mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/phrases/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phrases/saved'] });
      toast({
        title: 'Phrase deleted',
        description: 'The phrase has been removed from your saved phrases.',
      });
      setConfirmDeleteOpen(false);
      setDeletingId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete the phrase. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle phrase selection for practice
  const handleSelectPhrase = (phrase: SavedPhrase) => {
    setSelectedPhrase(phrase);
  };

  // Handle delete phrase
  const handleDeleteConfirm = (id: number) => {
    setDeletingId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId !== null) {
      deleteMutation.mutate(deletingId);
    }
  };

  // Handle recording
  const startRecording = async () => {
    if (!selectedPhrase) return;
    
    try {
      // First ensure any previous recordings are properly cleaned up
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
      }
      setRecording(false);
      setRecorder(null);
      
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      console.log('Microphone access granted, creating MediaRecorder...');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        console.log(`Data available: ${e.data.size} bytes`);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, processing audio...');
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
        
        // Create the audio blob
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log(`Audio blob created: ${blob.size} bytes`);
        setAudioBlob(blob);
        
        // Assess pronunciation with the recorded audio
        if (selectedPhrase) {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          formData.append('text', selectedPhrase.phrase);
          formData.append('referenceText', selectedPhrase.phrase);
          
          console.log('Sending recording for assessment with text:', selectedPhrase.phrase);
          fetch('/api/pronunciation/assess', {
            method: 'POST',
            body: formData,
          })
            .then(response => response.json())
            .then(result => {
              console.log('Assessment results received:', result);
              setAssessmentResults(result);
              
              // Store the audioBlob URL for playback
              const audioUrl = URL.createObjectURL(blob);
              setAudioBlob(new Blob([blob], { type: 'audio/webm' }));
              
              toast({
                title: 'Pronunciation Assessment Complete',
                description: `Your score: ${result.pronunciationScore.toFixed(1)}/100`,
              });
            })
            .catch(error => {
              console.error('Assessment error:', error);
              toast({
                title: 'Error',
                description: 'Failed to assess pronunciation',
                variant: 'destructive',
              });
            });
        }
      };
      
      // Setup event handlers for recording state
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        setRecording(true);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: 'Recording Error',
          description: 'An error occurred during recording',
          variant: 'destructive',
        });
      };
      
      setRecorder(mediaRecorder);
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(100); // Collect data every 100ms
      setRecording(true);
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast({
        title: 'Microphone Error',
        description: 'Please allow microphone access to record',
        variant: 'destructive',
      });
    }
  };
  
  const stopRecording = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setRecording(false);
    }
  };

  // Create practice group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest('POST', '/api/practice-groups', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups'] });
      toast({
        title: 'Group created',
        description: 'Your new practice group has been created successfully.',
      });
      setNewGroupOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      // Select the newly created group
      if (data && data.id) {
        setSelectedGroupId(data.id);
        setActiveTab('practice-groups');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create the practice group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete practice group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/practice-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups'] });
      setSelectedGroupId(null);
      setActiveTab('all-phrases');
      setConfirmDeleteGroupOpen(false);
      setDeletingGroupId(null);
      toast({
        title: 'Group deleted',
        description: 'The practice group has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete the practice group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Add phrase to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: async ({ groupId, phraseId }: { groupId: number; phraseId: number }) => {
      return apiRequest('POST', `/api/practice-groups/${groupId}/phrases`, { phraseId });
    },
    onSuccess: (data, variables) => {
      // Invalidate both the general groups query and the specific group query
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups', variables.groupId] });
      
      // If we're currently viewing this group, refetch the phrases
      if (selectedGroupId === variables.groupId) {
        refetchGroups();
      }
      
      toast({
        title: 'Phrase added to group',
        description: 'The phrase has been added to your practice group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add the phrase to the group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Remove phrase from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, phraseId }: { groupId: number; phraseId: number }) => {
      return apiRequest('DELETE', `/api/practice-groups/${groupId}/phrases/${phraseId}`);
    },
    onSuccess: (data, variables) => {
      // Invalidate both the general groups query and the specific group query
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practice-groups', variables.groupId] });
      
      // If we're currently viewing this group, refetch the phrases
      if (selectedGroupId === variables.groupId) {
        refetchGroups();
      }
      
      toast({
        title: 'Phrase removed from group',
        description: 'The phrase has been removed from your practice group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove the phrase from the group. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Generate share link mutation
  const generateShareLinkMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest('POST', `/api/practice-groups/${groupId}/share`);
    },
    onSuccess: (data: any) => {
      if (data && data.shareId) {
        queryClient.invalidateQueries({ queryKey: ['/api/practice-groups'] });
        const shareableLink = `${window.location.origin}/shared-phrases/${data.shareId}`;
        
        // Copy link to clipboard
        navigator.clipboard.writeText(shareableLink).then(() => {
          toast({
            title: 'Share link created',
            description: 'The link has been copied to your clipboard.',
          });
        }).catch(() => {
          toast({
            title: 'Share link created',
            description: `Share link: ${shareableLink}`,
          });
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate a share link. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle adding a new practice group
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate({
        name: newGroupName.trim(),
        description: newGroupDescription.trim()
      });
    }
  };

  // Handle deleting a practice group
  const handleDeleteGroupConfirm = (id: number) => {
    setDeletingGroupId(id);
    setConfirmDeleteGroupOpen(true);
  };

  const confirmDeleteGroup = () => {
    if (deletingGroupId !== null) {
      deleteGroupMutation.mutate(deletingGroupId);
    }
  };

  // Handle selecting a practice group
  const handleSelectGroup = (groupId: number) => {
    setSelectedGroupId(groupId);
    setActiveTab('practice-groups');
  };

  // Handle adding a phrase to a group
  const handleAddToGroup = (phraseId: number, groupId: number) => {
    addToGroupMutation.mutate({ phraseId, groupId });
  };

  // Handle removing a phrase from a group
  const handleRemoveFromGroup = (phraseId: number, groupId: number) => {
    removeFromGroupMutation.mutate({ groupId, phraseId });
  };

  // Handle creating a share link
  const handleShareGroup = (groupId: number) => {
    generateShareLinkMutation.mutate(groupId);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoadingPhrases) {
      navigate('/');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to view your saved phrases',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, isLoadingPhrases, navigate, toast]);

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-screen">
      <p>Please log in to view your saved phrases.</p>
    </div>;
  }

  // Render pronunciation performance visualization
  const renderAssessmentResults = () => {
    if (!assessmentResults) return null;
    
    return (
      <div className="mt-4">
        <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-6 relative overflow-hidden shadow-md">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#57cc99]"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#c2f8d7] rounded-tl-xl"></div>

          <div className="w-full max-w-md mx-auto bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-center text-[#264653] mb-4">Your Performance</h2>
            <div className="text-6xl font-bold text-center mb-2" style={{ color: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' }}>
              {Math.round(assessmentResults.pronunciationScore)}%
            </div>
            <p className="text-center text-gray-600 mb-4">
              {assessmentResults.pronunciationScore >= 80 
                ? "Great job! Your pronunciation is very clear."
                : "Good effort! Try again to improve your score."}
            </p>
            
            {/* Detailed scores breakdown */}
            <div className="space-y-3 mb-5">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Pronunciation</span>
                  <span>{Math.round(assessmentResults.pronunciationScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.round(assessmentResults.pronunciationScore)}%`,
                      backgroundColor: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' : 
                                     assessmentResults.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51' 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fluency</span>
                  <span>{Math.round(assessmentResults.fluencyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.round(assessmentResults.fluencyScore)}%`,
                      backgroundColor: assessmentResults.fluencyScore >= 80 ? '#2a9d8f' : 
                                     assessmentResults.fluencyScore >= 60 ? '#e9c46a' : '#e76f51' 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Completeness</span>
                  <span>{Math.round(assessmentResults.completenessScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.round(assessmentResults.completenessScore)}%`,
                      backgroundColor: assessmentResults.completenessScore >= 80 ? '#2a9d8f' : 
                                     assessmentResults.completenessScore >= 60 ? '#e9c46a' : '#e76f51' 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Accuracy</span>
                  <span>{Math.round(assessmentResults.accuracyScore)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.round(assessmentResults.accuracyScore)}%`,
                      backgroundColor: assessmentResults.accuracyScore >= 80 ? '#2a9d8f' : 
                                     assessmentResults.accuracyScore >= 60 ? '#e9c46a' : '#e76f51' 
                    }}
                  ></div>
                </div>
              </div>
              
              {assessmentResults.prosodyScore && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Prosody</span>
                    <span>{Math.round(assessmentResults.prosodyScore)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.round(assessmentResults.prosodyScore)}%`,
                        backgroundColor: assessmentResults.prosodyScore >= 80 ? '#2a9d8f' : 
                                       assessmentResults.prosodyScore >= 60 ? '#e9c46a' : '#e76f51' 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Word-by-word analysis */}
            {assessmentResults.wordLevelResults && assessmentResults.wordLevelResults.length > 0 && (
              <div className="mt-5 pt-5 border-t">
                <h3 className="text-sm font-semibold mb-3">Word-by-word analysis:</h3>
                <div className="flex flex-wrap gap-2">
                  {assessmentResults.wordLevelResults.map((word: any, idx: number) => {
                    // Calculate color based on score
                    const score = word.accuracyScore;
                    const bgColor = score > 85 ? 'bg-green-100' : 
                                  score > 70 ? 'bg-yellow-100' : 
                                  'bg-red-100';
                    const textColor = score > 85 ? 'text-green-800' : 
                                    score > 70 ? 'text-yellow-800' : 
                                    'text-red-800';
                    
                    return (
                      <div 
                        key={`word-${idx}`} 
                        className={`px-2 py-1 rounded text-sm ${bgColor} ${textColor}`}
                      >
                        {word.word} ({Math.round(score)}%)
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Playback recording section */}
          {audioBlob && (
            <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
              <div className="text-sm font-medium text-[#264653]">Listen to your recording:</div>
              <button
                className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                onClick={() => {
                  const url = URL.createObjectURL(audioBlob);
                  const audio = new Audio(url);
                  audio.play();
                }}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Saved Phrases</h1>
      </div>

      {/* Practice Groups and Phrases Tabs */}
      <Tabs defaultValue="all-phrases" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-phrases">All Phrases</TabsTrigger>
          <TabsTrigger value="practice-groups">Practice Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-phrases" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left panel - Saved phrases list */}
            <div className="md:col-span-2">
              {/* Add new phrase */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <form onSubmit={handleAddPhrase} className="space-y-2">
                    <h2 className="text-xl font-semibold mb-2">Add New Phrase</h2>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        placeholder="Enter a new word or phrase"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <Button type="submit" disabled={!newPhrase.trim()}>
                        Add
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  {isLoadingPhrases ? (
                    <div className="p-4 text-center">Loading your saved phrases...</div>
                  ) : phrasesArray.length === 0 ? (
                    <div className="p-4 text-center flex flex-col items-center space-y-2">
                      <AlertCircle className="h-12 w-12 text-muted-foreground" />
                      <p>You don't have any saved phrases yet.</p>
                      <p className="text-sm text-muted-foreground">Go to New Phrases to discover and save phrases for practice.</p>
                      <Button onClick={() => navigate('/new-phrases')} className="mt-2">
                        Discover New Phrases
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {phrasesArray.map((phrase: SavedPhrase) => (
                        <div 
                          key={phrase.id} 
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedPhrase?.id === phrase.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}
                          onClick={() => handleSelectPhrase(phrase)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{phrase.phrase}</p>
                              {phrase.phonetic && (
                                <p className="text-sm text-muted-foreground">{phrase.phonetic}</p>
                              )}
                              {phrase.difficulty && (
                                <div className="mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${phrase.difficulty === 'easy' ? 'bg-green-100 text-green-800' : phrase.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    {phrase.difficulty.charAt(0).toUpperCase() + phrase.difficulty.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {groupsArray.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <BookmarkPlus className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {groupsArray.map((group) => (
                                      <DropdownMenuItem 
                                        key={`add-to-${group.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddToGroup(phrase.id, group.id);
                                        }}
                                      >
                                        <Folder className="mr-2 h-4 w-4" />
                                        Add to "{group.name}"
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Button 
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConfirm(phrase.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right panel - Practice selected phrase */}
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-4">
                  {selectedPhrase ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Practice Mode</h2>
                      <Separator />
                      <div className="p-3 border rounded-md bg-accent/50">
                        <p className="font-medium">{selectedPhrase.phrase}</p>
                        {selectedPhrase.phonetic && (
                          <p className="text-sm text-muted-foreground">{selectedPhrase.phonetic}</p>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button 
                          onClick={recording ? stopRecording : startRecording}
                          variant={recording ? "destructive" : "default"}
                          className="w-full"
                        >
                          {recording ? (
                            <>
                              <X className="mr-2 h-4 w-4" /> Stop Recording
                            </>
                          ) : (
                            <>
                              <Mic className="mr-2 h-4 w-4" /> Record Practice
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            // Request speech synthesis
                            fetch(`/api/speech/synthesize?text=${encodeURIComponent(selectedPhrase.phrase)}`)
                              .then(response => response.arrayBuffer())
                              .then(arrayBuffer => {
                                const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
                                const url = URL.createObjectURL(blob);
                                const audio = new Audio(url);
                                audio.play();
                              })
                              .catch(error => {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to synthesize speech',
                                  variant: 'destructive',
                                });
                              });
                          }}
                        >
                          <Play className="mr-2 h-4 w-4" /> Listen
                        </Button>
                      </div>
                      
                      {/* Show assessment results if available */}
                      {assessmentResults && renderAssessmentResults()}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">Select a phrase to practice</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="practice-groups" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Practice Groups</h2>
              <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <FolderPlus className="h-4 w-4" />
                    Create New Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Practice Group</DialogTitle>
                    <DialogDescription>
                      Create a collection of phrases to practice together or share with others.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Group Name</Label>
                      <Input
                        id="name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="E.g., Common Greetings, Medical Terms, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Add a description for this group..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setNewGroupOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim()}
                    >
                      Create Group
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {isLoadingGroups ? (
              <div className="p-4 text-center">Loading your practice groups...</div>
            ) : groupsArray.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center flex flex-col items-center space-y-3">
                  <Folder className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Practice Groups Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Create practice groups to organize your phrases for focused practice or to share with others.
                  </p>
                  <Button onClick={() => setNewGroupOpen(true)} className="mt-2">
                    <FolderPlus className="mr-2 h-4 w-4" /> Create Your First Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupsArray.map((group) => (
                  <Card key={group.id} className={selectedGroupId === group.id ? 'border-primary' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleShareGroup(group.id)}>
                              <Share2 className="mr-2 h-4 w-4" /> Share Group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteGroupConfirm(group.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 pb-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{group.isShared ? 'Shared' : 'Private'}</span>
                        <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleSelectGroup(group.id)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" /> View Phrases
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            
            {selectedGroupId !== null && groupPhrasesData && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {groupPhrasesData.group?.name || 'Group Phrases'} 
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({currentGroupPhrases.length} phrases)
                      </span>
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedGroupId(null)}
                    >
                      Back to Groups
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingGroupPhrases ? (
                    <div className="p-4 text-center">Loading phrases...</div>
                  ) : currentGroupPhrases.length === 0 ? (
                    <div className="p-4 text-center flex flex-col items-center space-y-2">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                      <p>No phrases in this group yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Add phrases to this group from the "All Phrases" tab.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentGroupPhrases.map((phrase) => (
                        <div 
                          key={phrase.id} 
                          className="p-3 border rounded-md cursor-pointer transition-colors hover:bg-accent"
                          onClick={() => handleSelectPhrase(phrase)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{phrase.phrase}</p>
                              {phrase.phonetic && (
                                <p className="text-sm text-muted-foreground">{phrase.phonetic}</p>
                              )}
                              {phrase.difficulty && (
                                <div className="mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${phrase.difficulty === 'easy' ? 'bg-green-100 text-green-800' : phrase.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    {phrase.difficulty.charAt(0).toUpperCase() + phrase.difficulty.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedGroupId) {
                                  handleRemoveFromGroup(phrase.id, selectedGroupId);
                                }
                              }}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this phrase?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the phrase from your saved phrases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete group confirmation dialog */}
      <AlertDialog open={confirmDeleteGroupOpen} onOpenChange={setConfirmDeleteGroupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this practice group?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the group and unlink all phrases.
              The phrases themselves won't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}