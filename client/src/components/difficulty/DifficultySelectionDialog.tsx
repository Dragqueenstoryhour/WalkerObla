import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDifficulty, mapDifficultyToServer } from '@/contexts/DifficultyContext';
import { DifficultySlider } from './SimplifiedDifficultySelector';
import { useReading } from '@/contexts/ReadingContext';
import { generateReadingContent } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';
import { RotateCw } from 'lucide-react';

interface DifficultySelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DifficultySelectionDialog({ open, onClose }: DifficultySelectionDialogProps) {
  const { difficulty, setHasSelectedDifficulty } = useDifficulty();
  const { toast } = useToast();
  const { currentContent, setCurrentContent } = useReading();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      // Generate content with the selected difficulty level
      const serverDifficulty = mapDifficultyToServer(difficulty);
      
      toast({
        title: "Setting Difficulty",
        description: `Generating content for difficulty level ${difficulty}/8...`,
      });
      
      // Use a default topic or the current content topic
      const topic = currentContent?.title?.split(' ').slice(0, 2).join(' ').toLowerCase() || 'interesting facts';
      const content = await generateReadingContent(topic, serverDifficulty);
      
      // Update content
      setCurrentContent(content);
      
      // Mark as having selected difficulty
      setHasSelectedDifficulty(true);
      
      toast({
        title: "Difficulty Set",
        description: `Ready to practice at level ${difficulty}/8`,
      });
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error("Error setting initial difficulty:", error);
      toast({
        title: "Error",
        description: "There was an issue setting up your difficulty level. You can adjust it later from the header.",
        variant: "destructive",
      });
      // Still mark as selected and close dialog
      setHasSelectedDifficulty(true);
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Difficulty Level</DialogTitle>
          <DialogDescription>
            Choose a difficulty level that matches your comfort with speech and pronunciation.
            You can always change this later from the header.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <DifficultySlider />
          
          <div className="mt-6 text-sm text-gray-600">
            <p>
              Setting the appropriate difficulty level helps us provide:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>More relevant practice material</li>
              <li>Better customized challenges</li>
              <li>Appropriate progression for your skill level</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="mr-2">Updating...</span>
                <RotateCw className="h-4 w-4 animate-spin" />
              </>
            ) : (
              "OK"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}