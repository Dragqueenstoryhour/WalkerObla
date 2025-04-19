import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LevelProgress } from '@/lib/types';
import { Avatar } from './Avatar';

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
  const [showAchievement, setShowAchievement] = useState(false);
  
  // Toggle waving effect when progress changes
  useEffect(() => {
    setWavingEffect(true);
    const timer = setTimeout(() => setWavingEffect(false), 2000);
    return () => clearTimeout(timer);
  }, [progressPercentage]);
  
  // Show achievement animation briefly when opening the page
  useEffect(() => {
    setShowAchievement(true);
    const timer = setTimeout(() => setShowAchievement(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="w-full bg-[#f5f7fa] border-2 border-[#57cc99] rounded-lg p-3 mb-6 shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#57cc99]"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#c2f8d7] rounded-tl-xl"></div>
      
      <div className="flex items-center mb-3 gap-3">
        <div className="flex-shrink-0">
          <Avatar character="coolChicken" size="sm" selectedRewards={{ accessory: 'sunglasses' }} />
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-[#57cc99] text-white mr-2 border-none">
                Level {currentLevel.levelNumber}
              </Badge>
              <span className="text-sm font-medium text-[#264653]">{currentLevel.name}</span>
            </div>
            
            <div className="text-xs text-[#264653]">
              {exercisesCompleted}/{totalExercises} exercises
            </div>
          </div>
        </div>
      </div>
      
      {/* Water pipe progress bar - Duolingo style with green colors */}
      <div className="relative h-8 mb-3 rounded-full bg-[#e9e9e9] overflow-hidden border border-[#d9d9d9]">
        {/* Segment patterns */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {Array.from({length: 10}).map((_, i) => (
            <div 
              key={i} 
              className="w-px h-full bg-[#d9d9d9]"
              style={{ left: `${(i + 1) * 10}%` }}
            />
          ))}
        </div>
        
        {/* Liquid progress fill */}
        <motion.div
          className="absolute bottom-0 left-0 w-full"
          style={{ 
            height: '100%',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Liquid fill with animated wave effect */}
          <div className="relative h-full w-full overflow-hidden">
            <motion.div
              className="absolute bottom-0 left-0 w-[200%] h-full"
              style={{
                backgroundImage: `
                  linear-gradient(
                    90deg, 
                    rgba(87, 204, 153, 0.9) 0%, 
                    rgba(87, 224, 153, 0.9) 50%,
                    rgba(87, 204, 153, 0.9) 100%
                  )
                `,
                boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.3)'
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
                  className="absolute top-0 left-[10%] w-1 h-1 rounded-full bg-white/70"
                  animate={wavingEffect ? {
                    y: [0, -10, -5],
                    opacity: [0.7, 0.9, 0]
                  } : { y: 0, opacity: 0.7 }}
                  transition={wavingEffect ? {
                    duration: 1.5,
                    ease: "easeOut"
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-1 left-[30%] w-1.5 h-1.5 rounded-full bg-white/80"
                  animate={wavingEffect ? {
                    y: [0, -15, -8],
                    opacity: [0.8, 0.9, 0]
                  } : { y: 0, opacity: 0.8 }}
                  transition={wavingEffect ? {
                    duration: 1.8,
                    ease: "easeOut",
                    delay: 0.2
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-0 left-[60%] w-2 h-2 rounded-full bg-white/60"
                  animate={wavingEffect ? {
                    y: [0, -12, -6],
                    opacity: [0.6, 0.8, 0]
                  } : { y: 0, opacity: 0.6 }}
                  transition={wavingEffect ? {
                    duration: 1.2,
                    ease: "easeOut",
                    delay: 0.3
                  } : { duration: 0 }}
                />
                <motion.div 
                  className="absolute top-1 left-[80%] w-1 h-1 rounded-full bg-white/70"
                  animate={wavingEffect ? {
                    y: [0, -8, -4],
                    opacity: [0.7, 0.9, 0]
                  } : { y: 0, opacity: 0.7 }}
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
          <span className="text-sm font-bold text-white drop-shadow">
            {currentXP} / {currentXP + xpToNextLevel} XP
          </span>
        </div>
      </div>
      
      {/* Level indicators */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-[#264653]">
          Current: Level {currentLevel.levelNumber}
        </span>
        
        {nextLevel && (
          <span className="text-xs font-medium text-[#264653]">
            Next: Level {nextLevel.levelNumber}
          </span>
        )}
      </div>
      
      {/* Milestone progression dots */}
      <div className="relative mt-2 mx-1">
        <div className="h-1 bg-[#d9d9d9] rounded-full"></div>
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
                      ? 'bg-[#57cc99] text-white' 
                      : 'bg-white border border-[#d9d9d9] text-[#264653]'
                    }
                    ${isActive ? 'ring-2 ring-[#44a37a] ring-offset-1' : ''}
                  `}
                  whileHover={{ scale: 1.2 }}
                  animate={isActive && showAchievement ? {
                    scale: [1, 1.3, 1],
                    boxShadow: [
                      '0 0 0 rgba(87, 204, 153, 0)',
                      '0 0 15px rgba(87, 204, 153, 0.7)',
                      '0 0 0 rgba(87, 204, 153, 0)'
                    ]
                  } : {}}
                  transition={{ 
                    duration: 1.5, 
                    repeat: showAchievement ? 2 : 0, 
                    repeatType: 'loop' 
                  }}
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
      
      {/* Achievement popup that shows only initially */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div 
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#57cc99] text-white px-4 py-2 rounded-full shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-xs font-bold whitespace-nowrap">Keep it up! 🎯</div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#57cc99]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}