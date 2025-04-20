import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import { MedalType } from '@/lib/types';

export type { MedalType };

interface MedalAward {
  levelId: number;
  levelNumber: number;
  levelName: string;
  medalType: MedalType;
}

interface MedalSystemProps {
  medals: Record<number, MedalType>;  // levelId -> medalType
  onMedalAcknowledged?: (levelId: number) => void;
}

export function MedalSystem({ medals, onMedalAcknowledged }: MedalSystemProps) {
  const [displayedMedal, setDisplayedMedal] = useState<MedalAward | null>(null);
  const [acknowledgedMedals, setAcknowledgedMedals] = useState<Record<number, boolean>>({});
  
  // Mock level data for demonstration purposes
  const mockLevelData: Record<number, { levelNumber: number, name: string }> = {
    1: { levelNumber: 1, name: "Basic Greetings" },
    2: { levelNumber: 2, name: "Personal Info" },
    3: { levelNumber: 3, name: "Daily Routines" },
    4: { levelNumber: 4, name: "Food & Dining" },
    5: { levelNumber: 5, name: "Directions" },
    6: { levelNumber: 6, name: "Health" }
  };
  
  // Function to get level info
  const getLevelInfo = (levelId: number) => {
    return mockLevelData[levelId] || { levelNumber: levelId, name: `Level ${levelId}` };
  };
  
  // Function to handle medal styles based on type
  const getMedalStyles = (medalType: MedalType) => {
    switch(medalType) {
      case 'gold':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-600',
          icon: 'text-yellow-100',
          name: 'Gold',
          textColor: 'text-yellow-700'
        };
      case 'silver':
        return {
          bg: 'bg-gray-300',
          border: 'border-gray-400',
          icon: 'text-white',
          name: 'Silver',
          textColor: 'text-gray-700'
        };
      case 'bronze':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-700',
          icon: 'text-amber-200',
          name: 'Bronze',
          textColor: 'text-amber-700'
        };
    }
  };
  
  // Check for unacknowledged medals whenever the medals prop changes
  useEffect(() => {
    const unacknowledgedMedalIds = Object.keys(medals)
      .filter(levelId => !acknowledgedMedals[parseInt(levelId)])
      .map(levelId => parseInt(levelId));
    
    if (unacknowledgedMedalIds.length > 0 && !displayedMedal) {
      const levelId = unacknowledgedMedalIds[0];
      const levelInfo = getLevelInfo(levelId);
      
      setDisplayedMedal({
        levelId,
        levelNumber: levelInfo.levelNumber,
        levelName: levelInfo.name,
        medalType: medals[levelId]
      });
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [medals, acknowledgedMedals, displayedMedal]);
  
  // Function to acknowledge a medal
  const acknowledgeMedal = (levelId: number) => {
    setAcknowledgedMedals(prev => ({
      ...prev,
      [levelId]: true
    }));
    
    setDisplayedMedal(null);
    
    if (onMedalAcknowledged) {
      onMedalAcknowledged(levelId);
    }
  };
  
  return (
    <>
      {/* Medal Collection/Summary (can be shown in a separate tab) */}
      {Object.keys(medals).length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Your Medal Collection
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(medals).map(([levelId, medalType]) => {
                const levelInfo = getLevelInfo(parseInt(levelId));
                const styles = getMedalStyles(medalType);
                
                return (
                  <div 
                    key={levelId} 
                    className="flex items-center p-3 bg-background rounded-lg border border-border"
                  >
                    <div className={`${styles.bg} ${styles.border} h-8 w-8 rounded-full flex items-center justify-center border-2 mr-3`}>
                      <Trophy className={`h-4 w-4 ${styles.icon}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Level {levelInfo.levelNumber}</p>
                      <p className={`text-xs ${styles.textColor} font-semibold`}>
                        {styles.name} Medal
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Medal Award Popup */}
      <AnimatePresence>
        {displayedMedal && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <h2 className="text-2xl font-bold text-center text-green-800 mb-4">
                Congratulations!
              </h2>
              
              <div className="flex justify-center mb-6">
                <motion.div
                  className={`
                    relative w-32 h-32 rounded-full flex items-center justify-center
                    ${getMedalStyles(displayedMedal.medalType).bg} 
                    border-4 ${getMedalStyles(displayedMedal.medalType).border}
                    shadow-lg
                  `}
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ 
                    type: 'spring', 
                    damping: 10, 
                    stiffness: 100,
                    duration: 1 
                  }}
                >
                  <Trophy className={`h-16 w-16 ${getMedalStyles(displayedMedal.medalType).icon}`} />
                  
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0px rgba(255,255,255,0.8)',
                        '0 0 0 10px rgba(255,255,255,0)',
                        '0 0 0 0px rgba(255,255,255,0)'
                      ]
                    }}
                    transition={{ 
                      repeat: 2,
                      duration: 1.5,
                      delay: 0.3
                    }}
                  />
                </motion.div>
              </div>
              
              <p className="text-center text-gray-700 mb-6">
                You've earned a <span className="font-bold">
                  {getMedalStyles(displayedMedal.medalType).name}
                </span> medal for completing Level {displayedMedal.levelNumber}: {displayedMedal.levelName}!
              </p>
              
              <div className="flex justify-center">
                <Button 
                  className="px-8"
                  onClick={() => acknowledgeMedal(displayedMedal.levelId)}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}