import React from 'react';
import { cn } from '@/lib/utils';
import { useDifficulty, difficultyLevelNames, DifficultyLevel } from '@/contexts/DifficultyContext';

interface DifficultySpeedometerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export function DifficultySpeedometer({ 
  className, 
  size = 'md', 
  showLevel = true 
}: DifficultySpeedometerProps) {
  const { difficulty } = useDifficulty();
  
  // Calculate needle rotation based on difficulty (1-8 scale)
  // Map from -120 degrees to +120 degrees to cover the semi-circle
  const needleRotation = -120 + (parseInt(difficulty) - 1) * (240 / 7);
  
  // Size classes
  const sizeClasses = {
    sm: {
      container: 'w-32 h-20',
      needle: 'h-10 w-0.5',
      needleCap: 'w-3 h-3',
      level: 'text-xs mt-1',
    },
    md: {
      container: 'w-48 h-28',
      needle: 'h-16 w-1',
      needleCap: 'w-4 h-4',
      level: 'text-sm mt-2',
    },
    lg: {
      container: 'w-64 h-36',
      needle: 'h-20 w-1.5',
      needleCap: 'w-5 h-5',
      level: 'text-base mt-3',
    }
  };
  
  return (
    <div className={cn("relative", className, sizeClasses[size].container)}>
      {/* Speedometer background - flipped from the image with green on left and red on right */}
      <div 
        className="absolute inset-0 rounded-t-full overflow-hidden" 
        style={{ 
          background: 'linear-gradient(90deg, #4ade80 0%, #a3e635 25%, #facc15 50%, #fb923c 75%, #ef4444 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
        }}
      />

      {/* Speedometer border */}
      <div 
        className="absolute inset-0 rounded-t-full border-8 border-b-0 border-gray-200"
        style={{ borderWidth: size === 'sm' ? '4px' : size === 'md' ? '8px' : '10px' }}
      />

      {/* Needle center point */}
      <div className="absolute left-1/2 top-[calc(50%-2px)] -translate-x-1/2">
        <div className={cn("bg-gray-300 border-2 border-gray-700 rounded-full", sizeClasses[size].needleCap)}></div>
      </div>
      
      {/* Needle */}
      <div 
        className="absolute left-1/2 top-[calc(50%-2px)] -translate-x-1/2 origin-bottom"
        style={{ transform: `rotate(${needleRotation}deg)` }}
      >
        <div className={cn("bg-gray-800 rounded mx-auto -translate-y-full", sizeClasses[size].needle)}></div>
      </div>

      {/* Difficulty level indicator */}
      {showLevel && (
        <div className={cn("absolute bottom-0 left-0 right-0 text-center font-medium", sizeClasses[size].level)}>
          {difficultyLevelNames[difficulty as DifficultyLevel]}
        </div>
      )}
      
      {/* Easy/Expert labels */}
      <div className="absolute bottom-1 left-1 text-xs font-medium text-green-700">Easy</div>
      <div className="absolute bottom-1 right-1 text-xs font-medium text-red-700">Expert</div>
    </div>
  );
}