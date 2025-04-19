import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel, User } from '@/lib/types';
import { Award, Star, Sparkles, Gift } from 'lucide-react';
import { Avatar } from './Avatar';

interface LevelCompleteProps {
  user: User;
  completedLevel: GameLevel;
  nextLevel?: GameLevel;
  stats: {
    exercisesCompleted: number;
    totalExercises: number;
    averageScore: number;
    xpEarned: number;
  };
  onContinue: () => void;
}

export function LevelComplete({
  user,
  completedLevel,
  nextLevel,
  stats,
  onContinue
}: LevelCompleteProps) {
  const [showRewards, setShowRewards] = useState(false);
  const [showNextLevel, setShowNextLevel] = useState(false);
  
  useEffect(() => {
    // Show rewards after a delay
    const rewardsTimer = setTimeout(() => {
      setShowRewards(true);
    }, 1000);
    
    // Show next level info after another delay
    const nextLevelTimer = setTimeout(() => {
      setShowNextLevel(true);
    }, 2000);
    
    return () => {
      clearTimeout(rewardsTimer);
      clearTimeout(nextLevelTimer);
    };
  }, []);
  
  // Calculate a rating based on average score (1-5 stars)
  const rating = Math.max(1, Math.min(5, Math.floor(stats.averageScore / 20)));
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="max-w-lg w-full mx-4"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Card className="border-4 border-primary/20 overflow-hidden">
            <CardContent className="p-0">
              {/* Header - Celebration */}
              <div className="bg-primary text-primary-foreground p-6 text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="flex justify-center mb-4 relative">
                    <motion.div 
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        repeatType: 'reverse'
                      }}
                    >
                      <Sparkles className="absolute top-0 left-0 h-6 w-6 text-yellow-300" />
                      <Sparkles className="absolute bottom-0 right-0 h-6 w-6 text-yellow-300" />
                    </motion.div>
                    
                    <div className="bg-background rounded-full p-3 shadow-lg relative">
                      <Award size={48} className="text-primary" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-2">Level Complete!</h2>
                  <h3 className="text-xl">
                    You've mastered Level {completedLevel.levelNumber}: {completedLevel.name}
                  </h3>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  <Avatar size="lg" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="font-medium">Exercises</div>
                    <div className="text-2xl font-bold">
                      {stats.exercisesCompleted}/{stats.totalExercises}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="font-medium">XP Earned</div>
                    <div className="text-2xl font-bold text-blue-500">
                      +{stats.xpEarned}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 mb-6 text-center">
                  <div className="font-medium mb-2">Performance</div>
                  <div className="flex justify-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        fill={i < rating ? "currentColor" : "none"} 
                        className={`h-6 w-6 ${i < rating ? 'text-yellow-500' : 'text-muted-foreground/40'}`} 
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Average Score: {stats.averageScore.toFixed(0)}%
                  </div>
                </div>
                
                {/* Rewards */}
                <AnimatePresence>
                  {showRewards && completedLevel.unlockableRewards && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-4 mb-6"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-yellow-600" />
                        <h4 className="font-medium text-center">Rewards Unlocked!</h4>
                      </div>
                      <div className="text-sm text-center">
                        New avatar customization items are now available!
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Next Level Info */}
                <AnimatePresence>
                  {showNextLevel && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {nextLevel ? (
                        <div className="text-center mb-6">
                          <h4 className="font-bold">Next Challenge</h4>
                          <p className="text-muted-foreground">
                            Level {nextLevel.levelNumber}: {nextLevel.name}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center mb-6">
                          <h4 className="font-bold">Congratulations!</h4>
                          <p className="text-muted-foreground">
                            You've completed all available levels!
                          </p>
                        </div>
                      )}
                      
                      <Button 
                        className="w-full py-6 text-lg" 
                        onClick={onContinue}
                      >
                        {nextLevel ? 'Continue to Next Level' : 'Back to Home'}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}