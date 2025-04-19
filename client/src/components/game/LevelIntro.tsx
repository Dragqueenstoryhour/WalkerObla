import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel } from '@/lib/types';
import { Trophy, Star, Zap } from 'lucide-react';

interface LevelIntroProps {
  level: GameLevel;
  onStart: () => void;
}

export function LevelIntro({ level, onStart }: LevelIntroProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show details after a short delay
    const timer = setTimeout(() => {
      setShowDetails(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

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
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-6 text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="flex justify-center mb-4">
                    <div className="bg-background rounded-full p-3 shadow-lg">
                      <Trophy size={48} className="text-primary" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-bold mb-2">Level {level.levelNumber}</h2>
                  <h3 className="text-xl">{level.name}</h3>
                </motion.div>
              </div>

              {/* Content */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    className="p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-center text-muted-foreground mb-6">
                      {level.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <div className="font-medium">Difficulty</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {level.difficulty}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <Zap className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <div className="font-medium">XP Reward</div>
                        <div className="text-sm text-muted-foreground">
                          Up to {level.levelNumber * 100} XP
                        </div>
                      </div>
                    </div>

                    {level.unlockableRewards && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-center mb-2">Unlockable Rewards</h4>
                        <div className="text-sm text-center text-muted-foreground">
                          Complete this level to unlock special customization items!
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full py-6 text-lg" 
                      onClick={onStart}
                    >
                      Start Level
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}