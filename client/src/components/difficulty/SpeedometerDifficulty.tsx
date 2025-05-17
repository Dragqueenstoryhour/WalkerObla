import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { useDifficulty, difficultyLevelNames, DifficultyLevel } from '@/contexts/DifficultyContext';
import { cn } from '@/lib/utils';
import { Gauge } from 'lucide-react';

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

  // Calculate needle rotation (from -120deg to 120deg based on difficulty 1-8)
  const needleRotation = -120 + (parseInt(difficulty) - 1) * (240 / 7);
  
  // Get current color based on difficulty level
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
      {/* Speedometer gauge */}
      <div className="relative w-full flex flex-col items-center">
        <div 
          className="w-full h-12 rounded-full overflow-hidden mb-1"
          style={{ background: getBackgroundGradient() }}
        >
          {/* Color segments represented by the background gradient */}
        </div>
        
        {/* Needle indicator */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 origin-top flex flex-col items-center">
          <div 
            className="w-1 h-14 bg-gray-800 rounded"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            <div className="w-3 h-3 rounded-full bg-gray-800 -translate-x-1"></div>
          </div>
          <div className="w-5 h-5 rounded-full bg-gray-300 border-2 border-gray-700 -mt-1"></div>
        </div>
      </div>

      {/* Difficulty level indicator */}
      <div className="w-full flex justify-between text-xs px-1 mt-7 text-gray-700">
        <span>Easy</span>
        <span className="font-semibold">
          {difficultyLevelNames[difficulty as DifficultyLevel]}
        </span>
        <span>Expert</span>
      </div>

      {/* Slider for adjusting difficulty */}
      <Slider 
        value={sliderValue} 
        min={1} 
        max={8} 
        step={1} 
        onValueChange={handleSliderChange} 
        className="mt-3" 
      />
    </div>
  );
}

// Dropdown component with the speedometer
export function DifficultyDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { difficulty } = useDifficulty();

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
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Adjust Difficulty</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <SpeedometerDifficulty />
          <div className="mt-2 text-xs text-gray-500">
            Adjust the difficulty level to match your speech needs. Higher levels provide more challenging content.
          </div>
        </div>
      )}
    </div>
  );
}