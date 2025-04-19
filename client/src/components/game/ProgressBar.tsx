import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LevelProgress } from '@/lib/types';

interface ProgressBarProps {
  progress: LevelProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const {
    currentLevel,
    nextLevel,
    currentXP,
    xpToNextLevel,
    progress: progressPercentage,
    exercisesCompleted,
    totalExercises
  } = progress;
  
  // Add animation state for water effect
  const [wavingEffect, setWavingEffect] = useState(false);
  
  // Toggle waving effect when progress changes
  useEffect(() => {
    setWavingEffect(true);
    const timer = setTimeout(() => setWavingEffect(false), 2000);
    return () => clearTimeout(timer);
  }, [progressPercentage]);
  
  return (
    <div className="w-full bg-[#fdf1d6] border-2 border-[#f4a261] rounded-lg p-4 mb-6 shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-[#f4a261]"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#e9c46a] rounded-tl-xl"></div>
      
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <Badge variant="outline" className="bg-[#264653] text-white mr-2 border-none">
            Level {currentLevel.levelNumber}
          </Badge>
          <span className="text-sm font-medium text-[#264653]">{currentLevel.name}</span>
        </div>
        
        <div className="text-xs text-[#264653]">
          {exercisesCompleted}/{totalExercises} exercises
        </div>
      </div>
      
      {/* Water pipe progress bar */}
      <div className="relative h-8 mb-3 rounded-full bg-white border-2 border-[#2a9d8f] overflow-hidden">
        {/* Bamboo-style pipe segments */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {Array.from({length: 12}).map((_, i) => (
            <div 
              key={i} 
              className="w-px h-full bg-[#2a9d8f]/20"
              style={{ left: `${(i + 1) * 8}%` }}
            />
          ))}
        </div>
        
        {/* Water level */}
        <motion.div
          className="absolute bottom-0 left-0 w-full"
          style={{ 
            height: '100%',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Water fill with animated wave effect */}
          <div className="relative h-full w-full overflow-hidden">
            <motion.div
              className="absolute bottom-0 left-0 w-[200%] h-full bg-[#2a9d8f]/80"
              style={{
                backgroundImage: `
                  linear-gradient(
                    90deg, 
                    rgba(42, 157, 143, 0.8) 0%, 
                    rgba(72, 202, 185, 0.8) 50%,
                    rgba(42, 157, 143, 0.8) 100%
                  )
                `
              }}
              animate={wavingEffect ? {
                x: ['-25%', '0%', '-25%'],
              } : { x: '-25%' }}
              transition={wavingEffect ? {
                duration: 2,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              } : { duration: 0 }}
            >
              {/* Water surface with bubbles */}
              <div className="absolute top-0 left-0 w-full h-2">
                <motion.div 
                  className="absolute top-0 left-[10%] w-1 h-1 rounded-full bg-white/60"
                  animate={wavingEffect ? {
                    y: [0, -10, -5],
                    opacity: [0.6, 0.9, 0]
                  } : { y: 0, opacity: 0.6 }}
                  transition={wavingEffect ? {
                    duration: 1.5,
                    ease: "easeOut"
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-1 left-[30%] w-1.5 h-1.5 rounded-full bg-white/70"
                  animate={wavingEffect ? {
                    y: [0, -15, -8],
                    opacity: [0.7, 0.9, 0]
                  } : { y: 0, opacity: 0.7 }}
                  transition={wavingEffect ? {
                    duration: 1.8,
                    ease: "easeOut",
                    delay: 0.2
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-0 left-[60%] w-2 h-2 rounded-full bg-white/50"
                  animate={wavingEffect ? {
                    y: [0, -12, -6],
                    opacity: [0.5, 0.8, 0]
                  } : { y: 0, opacity: 0.5 }}
                  transition={wavingEffect ? {
                    duration: 1.2,
                    ease: "easeOut",
                    delay: 0.3
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-1 left-[80%] w-1 h-1 rounded-full bg-white/60"
                  animate={wavingEffect ? {
                    y: [0, -8, -4],
                    opacity: [0.6, 0.9, 0]
                  } : { y: 0, opacity: 0.6 }}
                  transition={wavingEffect ? {
                    duration: 1.4,
                    ease: "easeOut",
                    delay: 0.1
                  } : { duration: 0 }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Progress text */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-xs font-bold text-white drop-shadow">
            {currentXP} / {currentXP + xpToNextLevel} XP
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-[#264653]">
          Current: Level {currentLevel.levelNumber}
        </span>
        
        {nextLevel && (
          <span className="text-xs font-medium text-[#264653]">
            Next: Level {nextLevel.levelNumber}
          </span>
        )}
      </div>
      
      {/* Tiki-style milestone markers */}
      <div className="relative mt-3 mx-1">
        <div className="h-1 bg-[#e9c46a]/50 rounded-full"></div>
        <div className="flex justify-between -mt-2">
          {Array.from({length: 5}).map((_, i) => {
            const milestone = Math.ceil(totalExercises / 4) * i;
            const isCompleted = exercisesCompleted >= milestone;
            const isActive = i === Math.floor((exercisesCompleted / totalExercises) * 4);
            
            return (
              <div key={i} className="flex flex-col items-center">
                <motion.div 
                  className={`w-4 h-4 rounded-full flex items-center justify-center z-10 
                    ${isCompleted 
                      ? 'bg-[#2a9d8f] text-white' 
                      : 'bg-white border border-[#e9c46a] text-[#264653]'
                    }
                    ${isActive ? 'ring-2 ring-[#e76f51] ring-offset-2' : ''}
                  `}
                  whileHover={{ scale: 1.2 }}
                >
                  {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </motion.div>
                {i === 0 && (
                  <div className="mt-1 text-[0.6rem] font-medium text-[#264653]">Start</div>
                )}
                {i === 4 && (
                  <div className="mt-1 text-[0.6rem] font-medium text-[#264653]">Finish</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}