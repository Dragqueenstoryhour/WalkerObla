import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { useDifficulty, difficultyLevelNames, DifficultyLevel, mapDifficultyToServer } from '@/contexts/DifficultyContext';
import { cn } from '@/lib/utils';
import { Gauge, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReading } from '@/contexts/ReadingContext';
import { generateReadingContent } from '@/lib/openai';
import { Button } from '@/components/ui/button';

interface SpeedometerDifficultyProps {
  className?: string;
  compact?: boolean;
}

export function SpeedometerDifficulty({ className, compact = false }: SpeedometerDifficultyProps) {
  const { difficulty, setDifficulty } = useDifficulty();
  const [sliderValue, setSliderValue] = useState<number[]>([parseInt(difficulty)]);

  // Update slider when difficulty changes from outside
  useEffect(() => {
    setSliderValue([parseInt(difficulty)]);
  }, [difficulty]);

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    // Set difficulty with delay to avoid too many updates during slide
    setDifficulty(String(value[0]) as DifficultyLevel);
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

      {/* Use a custom thin slider that looks like a color gradient bar */}
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
          value={sliderValue[0]}
          onChange={(e) => handleSliderChange([parseInt(e.target.value)])}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />
        
        {/* Sliding circle indicator */}
        <div 
          className="absolute w-6 h-6 bg-white border-2 border-gray-300 rounded-full shadow-md z-5 -translate-y-1/2"
          style={{ 
            left: `calc(${((sliderValue[0] - 1) / 7) * 100}% - ${sliderValue[0] === 1 ? '0.75rem' : sliderValue[0] === 8 ? '0.75rem' : '0.75rem'})`,
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

// Dropdown component with the speedometer
export function DifficultyDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { difficulty } = useDifficulty();
  const { toast } = useToast();
  const { currentContent, setCurrentContent } = useReading();
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate new content with the updated difficulty
  const generateContentWithDifficulty = async () => {
    setIsGenerating(true);
    try {
      // Get current topic if exists, otherwise use a default
      const currentTopic = currentContent?.title.split(' ').slice(0, 2).join(' ').toLowerCase() || 'random topics';
      // Convert numeric difficulty to server format
      const serverDifficulty = mapDifficultyToServer(difficulty);

      const content = await generateReadingContent(currentTopic, serverDifficulty);
      setCurrentContent(content);
      
      // Close the dropdown
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to update content with new difficulty.",
        variant: "destructive",
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
        <span>Difficulty: {difficulty}/8</span>
        <Gauge className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="mb-3">
            <h3 className="font-medium">Adjust Difficulty</h3>
          </div>
          
          <SpeedometerDifficulty />
          
          <div className="mt-2 text-xs text-gray-500">
            Adjust the difficulty level to match your speech needs.
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={generateContentWithDifficulty}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white"
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
        </div>
      )}
    </div>
  );
}