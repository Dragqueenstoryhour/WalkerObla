import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FolderPlus, 
  Folder, 
  BookmarkCheck, 
  Trash2, 
  Edit3, 
  MoreVertical,
  Volume2,
  Snail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SavedWord {
  id: number;
  word: string;
  definition?: string | null;
  pronunciation?: string | null;
  folderId?: number | null;
  difficultyLevel: number;
  practiceCount: number;
  masteryLevel: number;
  createdAt: string;
}

interface WordFolder {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  createdAt: string;
}

export function SavedWordsWithFolders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});

  // Fetch saved words
  const { data: savedWords = [] } = useQuery<SavedWord[]>({
    queryKey: ['/api/saved-words'],
  });

  // Fetch folders
  const { data: folders = [] } = useQuery<WordFolder[]>({
    queryKey: ['/api/word-folders'],
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: { name: string; description?: string; color: string }) => {
      const response = await fetch('/api/word-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });
      if (!response.ok) throw new Error('Failed to create folder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/word-folders'] });
      setShowNewFolderDialog(false);
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor('#3b82f6');
      toast({ title: "Folder created!", description: "Your new folder is ready to use." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await fetch(`/api/word-folders/${folderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete folder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/word-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-words'] });
      if (selectedFolderId === deleteFolderMutation.variables) {
        setSelectedFolderId(null);
      }
      toast({ title: "Folder deleted", description: "Folder and its contents have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete folder.", variant: "destructive" });
    },
  });

  // Delete word mutation
  const deleteWordMutation = useMutation({
    mutationFn: async (word: string) => {
      const response = await fetch(`/api/saved-words/${encodeURIComponent(word)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete word');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-words'] });
      toast({ title: "Word removed", description: "Word has been removed from your collection." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete word.", variant: "destructive" });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({ title: "Error", description: "Folder name is required.", variant: "destructive" });
      return;
    }
    
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      description: newFolderDescription.trim() || undefined,
      color: newFolderColor,
    });
  };

  const handleTextToSpeech = async (word: string) => {
    if (!word) return;

    try {
      const isSlowMode = slowPlaybackWords[word] || false;
      const textToSpeak = word;

      // Construct the SSML string with Azure AI Speech native voice
      let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
      ssmlText += `<voice name="en-US-AvaNeural">`;

      if (isSlowMode) {
        // Use SSML prosody rate to slow down - Azure uses "slow" or decimal values
        ssmlText += `<prosody rate="0.6">`;
        ssmlText += textToSpeak;
        ssmlText += `</prosody>`;
      } else {
        ssmlText += textToSpeak;
      }
      ssmlText += `</voice>`;
      ssmlText += `</speak>`;

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
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
      };

      const playAudio = () => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('TTS playback started successfully');
          }).catch((error) => {
            console.error('Audio play failed:', error);
            const fallbackAudio = new Audio(audioUrl);
            fallbackAudio.play().catch(e => console.error('Fallback failed:', e));
          });
        }
      };

      audio.oncanplay = playAudio;
      audio.onloadeddata = playAudio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.src = audioUrl;
      audio.load();
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser TTS if API fails
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const filteredWords = selectedFolderId 
    ? savedWords.filter((word: SavedWord) => word.folderId === selectedFolderId)
    : savedWords.filter((word: SavedWord) => !word.folderId);

  const folderColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Saved Words</h1>
        
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                />
              </div>
              <div>
                <Label htmlFor="folder-description">Description (Optional)</Label>
                <Input
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {folderColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newFolderColor === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
                  Create Folder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            <Button
              variant={selectedFolderId === null ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedFolderId(null)}
            >
              <BookmarkCheck className="h-4 w-4 mr-2" />
              All Words ({savedWords.filter((w: SavedWord) => !w.folderId).length})
            </Button>
            
            {folders.map((folder: WordFolder) => (
              <div key={folder.id} className="flex items-center gap-1">
                <Button
                  variant={selectedFolderId === folder.id ? "default" : "ghost"}
                  className="flex-1 justify-start"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <Folder 
                    className="h-4 w-4 mr-2" 
                    style={{ color: folder.color }}
                  />
                  {folder.name} ({savedWords.filter((w: SavedWord) => w.folderId === folder.id).length})
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => deleteFolderMutation.mutate(folder.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        {/* Words Grid */}
        <div className="lg:col-span-3">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              {selectedFolderId 
                ? folders.find((f: WordFolder) => f.id === selectedFolderId)?.name || 'Folder'
                : 'All Words'
              }
            </h2>
            <p className="text-muted-foreground">
              {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map((word: SavedWord) => (
              <Card key={word.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{word.word}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteWordMutation.mutate(word.word)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Word
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {word.pronunciation && (
                    <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  {word.definition && (
                    <p className="text-sm mb-2">{word.definition}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTextToSpeech(word.word)}
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Listen
                    </Button>
                    
                    <div className="text-xs text-muted-foreground">
                      Level {word.masteryLevel}/100
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredWords.length === 0 && (
            <div className="text-center py-12">
              <BookmarkCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No words saved</h3>
              <p className="text-muted-foreground">
                Start saving words from practice sessions to build your collection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}