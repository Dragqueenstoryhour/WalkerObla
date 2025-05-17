import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SpeedometerDifficulty } from './SpeedometerDifficulty';
import { useDifficulty } from '@/contexts/DifficultyContext';

interface DifficultySelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DifficultySelectionDialog({ open, onClose }: DifficultySelectionDialogProps) {
  const { setHasSelectedDifficulty } = useDifficulty();

  const handleConfirm = () => {
    setHasSelectedDifficulty(true);
    onClose();
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
          <SpeedometerDifficulty />
          
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
          <Button onClick={handleConfirm}>
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}