import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

// Add MedalType export so we can use it in RecordingTest
export type MedalType = 'bronze' | 'silver' | 'gold';

interface MedalData {
  levelId: number;
  type: MedalType;
  acknowledged: boolean;
}

interface MedalSystemProps {
  medals: MedalData[] | Record<number, MedalType>;
  onMedalAcknowledged: (levelId: number) => void;
}

export function MedalSystem({ medals, onMedalAcknowledged }: MedalSystemProps) {
  const [activeMedal, setActiveMedal] = useState<MedalData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [levelInfo, setLevelInfo] = useState<GameLevel | null>(null);
  
  // Process medals to ensure we have a consistent array format
  const processedMedals: MedalData[] = Array.isArray(medals) 
    ? medals 
    : Object.entries(medals).map(([levelId, type]) => ({
        levelId: Number(levelId),
        type,
        acknowledged: false // Default to unacknowledged
      }));
  
  // Find the first unacknowledged medal to display
  useEffect(() => {
    const unacknowledgedMedal = processedMedals.find(medal => !medal.acknowledged);
    if (unacknowledgedMedal) {
      setActiveMedal(unacknowledgedMedal);
      setShowPopup(true);
      
      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Get level info (this would normally come from a data source)
      // For now we'll mock it
      const mockLevelInfo: GameLevel = {
        id: unacknowledgedMedal.levelId,
        levelNumber: Math.floor(unacknowledgedMedal.levelId),
        name: `Level ${Math.floor(unacknowledgedMedal.levelId)}`,
        description: "Great job on completing this level!",
        difficulty: "medium",
        requiredXP: 100,
        isActive: false,
        isCompleted: true,
        exercises: 5
      };
      setLevelInfo(mockLevelInfo);
    }
  }, [processedMedals]);
  
  // Handle acknowledgment
  const handleAcknowledge = () => {
    if (activeMedal) {
      onMedalAcknowledged(activeMedal.levelId);
      setShowPopup(false);
      setActiveMedal(null);
    }
  };
  
  // Get medal color based on type
  const getMedalColors = (type: MedalType) => {
    switch (type) {
      case 'gold':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-600',
          text: 'text-yellow-100'
        };
      case 'silver':
        return {
          bg: 'bg-gray-300',
          border: 'border-gray-400',
          text: 'text-white'
        };
      case 'bronze':
      default:
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-700',
          text: 'text-amber-200'
        };
    }
  };
  
  // Bronze medal animations
  const bronzeMedalAnimation = {
    hover: { 
      scale: 1.1, 
      rotate: [0, -5, 5, -5, 0],
      transition: { duration: 0.5 }
    },
    tap: { scale: 0.95 }
  };
  
  // Medal display component
  const Medal = ({ type, size = 'md' }: { type: MedalType, size?: 'sm' | 'md' | 'lg' }) => {
    const colors = getMedalColors(type);
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-32 h-32'
    };
    
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-16 w-16'
    };
    
    return (
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center ${colors.bg} border-4 ${colors.border} shadow-lg`}
        whileHover={bronzeMedalAnimation.hover}
        whileTap={bronzeMedalAnimation.tap}
      >
        <Trophy className={`${iconSizes[size]} ${colors.text}`} />
        
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ 
            boxShadow: [
              '0 0 0 0px rgba(255,255,255,0.8)',
              '0 0 0 5px rgba(255,255,255,0)',
              '0 0 0 0px rgba(255,255,255,0)'
            ]
          }}
          transition={{ 
            repeat: Infinity,
            duration: 2,
            repeatDelay: 1
          }}
        />
      </motion.div>
    );
  };
  
  return (
    <>
      {/* Medal achievement popup */}
      <AnimatePresence>
        {showPopup && activeMedal && levelInfo && (
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
                <Medal type={activeMedal.type} size="lg" />
              </div>
              
              <p className="text-center text-gray-700 mb-6">
                You've earned a <span className="font-bold">
                  {activeMedal.type.charAt(0).toUpperCase() + activeMedal.type.slice(1)}
                </span> medal for completing Level {levelInfo.levelNumber}: {levelInfo.name}!
              </p>
              
              <div className="flex justify-center">
                <Button 
                  className="px-8 bg-green-600 hover:bg-green-700"
                  onClick={handleAcknowledge}
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