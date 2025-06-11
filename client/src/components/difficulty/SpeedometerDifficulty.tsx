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
        className="flex items-center justify-between gap-3 px-6 py-3 min-w-[160px] border-2 border-blue-300 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-blue-900">Level</span>
          <span className="text-xs text-blue-700">{difficultyLevelNames[difficulty as DifficultyLevel]}</span>
        </div>
        <Gauge className="h-5 w-5 text-blue-600" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border-2 border-blue-200 rounded-xl shadow-2xl p-6 z-50 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Adjust Difficulty Level</h3>
            <p className="text-sm text-gray-600">Choose the level that matches your reading ability</p>
          </div>
          
          <div className="mb-6">
            <SpeedometerDifficulty />
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Current Level:</strong> {difficultyLevelNames[difficulty as DifficultyLevel]}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Higher levels include more complex vocabulary and longer sentences
            </p>
          </div>
          
          <div className="flex justify-between items-center gap-3">
            <Button 
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={generateContentWithDifficulty}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Apply Level"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}