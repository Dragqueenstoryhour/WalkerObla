import React, { useState, useEffect } from 'react';
import { useDifficulty, difficultyLevelNames, DifficultyLevel } from '@/contexts/DifficultyContext';
import { useReading } from '@/contexts/ReadingContext';
import { generateReadingContent } from '@/lib/openai';
import { cn } from '@/lib/utils';
import { Gauge, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DifficultySliderProps {
  className?: string;
  onUpdate?: () => void;
}

export function DifficultySlider({ className, onUpdate }: DifficultySliderProps) {
  const { difficulty, setDifficulty } = useDifficulty();
  const [sliderValue, setSliderValue] = useState<number>(parseInt(difficulty));

  // Update slider when difficulty changes from outside
  useEffect(() => {
    setSliderValue(parseInt(difficulty));
  }, [difficulty]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    setDifficulty(String(value) as DifficultyLevel);

    if (onUpdate) {
      onUpdate();
    }
  };

  // Get background gradient for difficulty bar
  const getBackgroundGradient = () => {
    return `linear-gradient(90deg, 
      #4ade80 0%, 
      #a3e635 25%, 
      #facc15 50%, 
      #fb923c 75%, 
      #ef4444 100%)`;
  };

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {/* Simplified difficulty bar */}
      <div className="w-full flex items-center justify-center mb-2">
        <span className="font-semibold">
          {difficultyLevelNames[difficulty as DifficultyLevel]}
        </span>
      </div>

      {/* Custom thin slider that looks like a color gradient bar */}
      <div className="relative w-full h-6 mb-3">
        {/* Color gradient background */}
        <div 
          className="absolute inset-0 h-2 rounded-full top-2"
          style={{ background: getBackgroundGradient() }}
        ></div>

        {/* Custom slider using native HTML input range for better control */}
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />

        {/* Sliding circle indicator */}
        <div 
          className="absolute w-6 h-6 bg-white border-2 border-gray-300 rounded-full shadow-md z-5 -translate-y-1/2"
          style={{ 
            left: `calc(${((sliderValue - 1) / 7) * 100}% - ${sliderValue === 1 ? '0.75rem' : sliderValue === 8 ? '0.75rem' : '0.75rem'})`,
            top: '50%' 
          }}
        ></div>
      </div>

      {/* Difficulty level indicator */}
      <div className="w-full flex justify-between text-xs px-1 text-gray-700">
        <span>Easy</span>
        <span>Expert</span>
      </div>
    </div>
  );
}

interface DifficultyDropdownProps {
  onConfirm?: (difficulty: string) => Promise<void>;
}

export function DifficultyDropdown({ onConfirm }: DifficultyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { difficulty, setDifficulty } = useDifficulty();
  const { toast } = useToast();
  const { currentContent, setCurrentContent } = useReading();
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle OK button click
  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      // Validate difficulty
      if (!/^[1-8]$/.test(difficulty)) {
        console.error(`Invalid difficulty: ${difficulty}, defaulting to 1`);
        toast({
          title: 'Error',
          description: 'Invalid difficulty level. Using level 1.',
          variant: 'destructive',
        });
        setDifficulty('1');
      }

      // If onConfirm callback was provided, use it
      // otherwise generate new content with this difficulty
      if (onConfirm) {
        await onConfirm(difficulty);
      } else {
        // Default topic is either from current content or a general one
        const topic = currentContent?.title?.split(' ').slice(0, 2).join(' ').toLowerCase() || 'interesting facts';
        
        toast({
          title: 'Generating New Content',
          description: `Updating with difficulty level ${difficulty}/8...`,
        });
        
        try {
          // Generate new content with the selected difficulty
          const content = await generateReadingContent(topic, difficulty);
          setCurrentContent(content);
        } catch (contentError) {
          console.error('Error regenerating content:', contentError);
          throw contentError;
        }
      }

      // Close the dropdown
      setIsOpen(false);

      toast({
        title: 'Difficulty Updated',
        description: `Content now at level ${difficulty}/8`,
      });
    } catch (error) {
      console.error('Error updating difficulty:', error);
      toast({
        title: 'Error',
        description: 'Failed to update content with new difficulty.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none"
      >
        <span>Level: {difficulty}/8</span>
        <Gauge className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="mb-3">
            <h3 className="font-medium">Adjust Difficulty</h3>
          </div>

          <DifficultySlider />

          <div className="mt-2 text-xs text-gray-500">
            Adjust the difficulty level to match your speech needs.
          </div>

          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleConfirm}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isGenerating ? (
                <>
                  <span className="mr-2">Updating...</span>
                  <RotateCw className="h-4 w-4 animate-spin" />
                </>
              ) : (
                'OK'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}