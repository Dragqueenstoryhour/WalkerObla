import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDifficulty, mapDifficultyToServer } from '@/contexts/DifficultyContext';
import { DifficultySlider } from './SimplifiedDifficultySelector';
import { useReading } from '@/contexts/ReadingContext';
import { generateReadingContent } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';
import { RotateCw, Users } from 'lucide-react';
// import oblaLogoPath from '@assets/e0dfb3c8-508c-4b30-994b-f471210dcd7c_1749383232529.jpg'; // Original logo
import whiskGifPath from '@/../public/attached_assets/Whisk_gif_dq0ywe4ywq.gif'; // New logo path

interface DifficultySelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DifficultySelectionDialog({ open, onClose }: DifficultySelectionDialogProps) {
  const { difficulty, setHasSelectedDifficulty } = useDifficulty();
  const { toast } = useToast();
  const { currentContent, setCurrentContent } = useReading();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleTutorial = () => {
    // Close this dialog and trigger tutorial
    setHasSelectedDifficulty(true);
    onClose();
    // Trigger tutorial on Words page by dispatching a custom event
    window.dispatchEvent(new CustomEvent('startTutorial'));
  };

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
      <DialogContent className="sm:max-w-lg bg-[#f9fafb] border-2 border-blue-700 shadow-2xl"> {/* Changed background color */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
            <img src={whiskGifPath} alt="Whisk Logo" className="w-full h-full object-cover" /> {/* Updated logo path and alt text */}
          </div>
          <DialogTitle className="text-3xl font-bold text-[#1537cc] mb-2"> {/* Changed text color */}
            Welcome to Obla!
          </DialogTitle>
          <DialogDescription className="text-lg text-[#1537cc] leading-relaxed mb-6"> {/* Changed text color */}
            Your AI-powered speech therapy companion is ready to help you improve your pronunciation!
          </DialogDescription>

          {/* Start Tutorial Button */}
          <div className="mb-6 flex justify-center"> {/* Centered the button */}
            <Button
              onClick={handleTutorial}
              className="bg-[#ff7f7c] hover:bg-[#ff7f7c]/90 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 animate-slow-bounce flex items-center gap-2" // Updated background color and added custom animation class
            >
              <Users className="h-5 w-5" />
              Start Tutorial
            </Button>
          </div>

          {/* Or text */}
          <p className="text-[#1537cc]/80 text-sm mb-6"> {/* Changed text color */}
            ...or if this isn't your first rodeo, select your difficulty level to get started!
          </p>
        </div>

        <div className="bg-white/10 rounded-lg p-6 mb-6 border border-white/20 backdrop-blur-sm">
          <DifficultySlider />
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleConfirm}
            className="bg-[#00b39e] hover:bg-[#00b39e]/90 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg transform transition-all duration-200 hover:scale-105" // Updated background color
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="mr-2">Setting up your experience...</span>
                <RotateCw className="h-5 w-5 animate-spin" />
              </>
            ) : (
              "Start!"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}