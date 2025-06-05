import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { SignInToSaveModal } from "@/components/modals/SignInToSaveModal";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SaveWordButtonProps {
  word: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function SaveWordButton({ word, className, variant = "outline", size = "sm" }: SaveWordButtonProps) {
  const { user, isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Check if word is already saved
  const { data: savedWords = [] } = useQuery({
    queryKey: ['/api/saved-words'],
    enabled: isAuthenticated,
  });

  const savedWordsArray = Array.isArray(savedWords) ? savedWords : [];
  const isSaved = savedWordsArray.some((savedWord: any) => savedWord.word === word);

  // Save word mutation
  const saveWordMutation = useMutation({
    mutationFn: async (wordData: { word: string; folderId?: string }) => {
      return await apiRequest('/api/saved-words', 'POST', wordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-words'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save word. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove word mutation
  const removeWordMutation = useMutation({
    mutationFn: async (wordToRemove: string) => {
      return await apiRequest(`/api/saved-words/${encodeURIComponent(wordToRemove)}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-words'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-phrases'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove word. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    if (isSaved) {
      removeWordMutation.mutate(word);
    } else {
      saveWordMutation.mutate({ word });
    }
  };

  const handleSaveAfterLogin = () => {
    if (isAuthenticated) {
      saveWordMutation.mutate({ word });
    }
  };

  const isLoading = saveWordMutation.isPending || removeWordMutation.isPending;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isSaved ? (
          <BookmarkCheck className="h-4 w-4 mr-1" />
        ) : (
          <Bookmark className="h-4 w-4 mr-1" />
        )}
        {isSaved ? 'Saved' : 'Save'}
      </Button>

      <SignInToSaveModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        wordToSave={word}
        onSaveAfterLogin={handleSaveAfterLogin}
      />
    </>
  );
}