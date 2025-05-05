import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { Mic, X, Share2, BookmarkPlus, AlertCircle, Play, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function MyWords() {
  const { isAuthenticated, user } = useAuth();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [selectedPhrase, setSelectedPhrase] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch user saved phrases
  const { data: savedPhrases = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/phrases/saved'],
    enabled: isAuthenticated,
  });

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
  const handleSelectPhrase = (phrase: any) => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Assess pronunciation with the recorded audio
        if (selectedPhrase) {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.wav');
          formData.append('referenceText', selectedPhrase.phrase);
          
          fetch('/api/pronunciation/assess', {
            method: 'POST',
            body: formData,
          })
            .then(response => response.json())
            .then(result => {
              toast({
                title: 'Pronunciation Score',
                description: `Your score: ${result.pronunciationScore.toFixed(1)}/100`,
              });
            })
            .catch(error => {
              toast({
                title: 'Error',
                description: 'Failed to assess pronunciation',
                variant: 'destructive',
              });
            });
        }
      };
      
      setRecorder(mediaRecorder);
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to view your saved phrases',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, isLoading, navigate, toast]);

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-screen">
      <p>Please log in to view your saved phrases.</p>
    </div>;
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Saved Phrases</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel - Saved phrases list */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="p-4 text-center">Loading your saved phrases...</div>
              ) : savedPhrases.length === 0 ? (
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
                  {savedPhrases.map((phrase: any) => (
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConfirm(phrase.id);
                          }}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
    </div>
  );
}
