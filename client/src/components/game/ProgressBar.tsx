import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
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
  
  return (
    <div className="w-full bg-muted rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Badge variant="outline" className="bg-primary/10 text-primary mr-2">
            Level {currentLevel.levelNumber}
          </Badge>
          <span className="text-sm font-medium">{currentLevel.name}</span>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {exercisesCompleted}/{totalExercises} exercises
        </div>
      </div>
      
      <div className="relative mb-1">
        <Progress 
          value={progressPercentage} 
          className="h-4"
        />
        
        {/* Only show animation when progress increases */}
        {progressPercentage > 0 && (
          <motion.div
            className="absolute top-0 left-0 h-full bg-blue-500/20"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progressPercentage}%`,
              transition: { duration: 0.5 }
            }}
            style={{ 
              borderTopRightRadius: '9999px', 
              borderBottomRightRadius: '9999px'
            }}
          />
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium">
          {currentXP} XP
        </span>
        
        {nextLevel && (
          <span className="text-xs font-medium">
            {xpToNextLevel} XP to Level {nextLevel.levelNumber}
          </span>
        )}
      </div>
      
      {/* Show milestone markers */}
      <div className="relative mt-1 mx-1">
        <div className="flex justify-between">
          {Array.from({length: 5}).map((_, i) => {
            const milestone = Math.ceil(totalExercises / 4) * i;
            const isCompleted = exercisesCompleted >= milestone;
            
            return (
              <div key={i} className="flex flex-col items-center">
                {i > 0 && i < 4 && (
                  <div 
                    className={`w-2 h-2 rounded-full mb-1 ${
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
                {i === 0 || i === 4 ? (
                  <div className={`w-2 h-2 rounded-full mb-1 ${
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}