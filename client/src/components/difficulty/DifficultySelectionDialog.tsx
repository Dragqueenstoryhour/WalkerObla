import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDifficulty, mapDifficultyToServer } from '@/contexts/DifficultyContext';
import { DifficultySlider } from './SimplifiedDifficultySelector';
import { useReading } from '@/contexts/ReadingContext';
import { generateReadingContent } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';
import { RotateCw } from 'lucide-react';
import oblaLogoPath from '@assets/e0dfb3c8-508c-4b30-994b-f471210dcd7c_1749383232529.jpg';

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
      // Ensure the difficulty is a valid number 1-8
      if (!/^[1-8]$/.test(difficulty)) {
        console.warn(`Invalid difficulty format: ${difficulty}, using 4 (medium) as default`);
        // Default to medium if invalid
        toast({
          title: "Invalid Difficulty",
          description: "Using medium difficulty (level 4) as default",
        });
      }

      toast({
        title: "Setting Difficulty",
        description: `Generating content for difficulty level ${difficulty}/8...`,
      });

      // Use a default topic or the current content topic
      const topic = currentContent?.title?.split(' ').slice(0, 2).join(' ').toLowerCase() || 'interesting facts';

      // Send the numeric difficulty directly to ensure API compatibility
      const content = await generateReadingContent(topic, difficulty);

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
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-purple-200 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
            <img src={oblaLogoPath} alt="Obla Logo" className="w-full h-full object-cover" />
          </div>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Welcome to Obla!
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-700 leading-relaxed">
            Your AI-powered speech therapy companion is ready to help you improve pronunciation!
          </DialogDescription>
        </div>

        <div className="bg-white/70 rounded-lg p-6 mb-6 border border-purple-100 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-purple-800 mb-4 text-center">
            Let's personalize your experience
          </h3>
          <p className="text-gray-700 mb-4 text-center">
            Choose your starting difficulty level. Don't worry - you can always adjust it later!
          </p>

          <DifficultySlider />

        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleConfirm}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="mr-2">Setting up your experience...</span>
                <RotateCw className="h-5 w-5 animate-spin" />
              </>
            ) : (
              <>
                Start My Journey!
                Start My Journey!
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}