import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthButtons } from '@/components/AuthButtons';
import { SavedWordsWithFolders } from '@/components/SavedWordsWithFolders';

export default function MyWords() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Sign in to access your saved words</h1>
          <p className="text-muted-foreground mb-6">
            Save words during practice sessions and organize them in custom folders
          </p>
          <AuthButtons />
        </div>
      </div>
    );
  }

  return <SavedWordsWithFolders />;
}