import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameLevel, Exercise, UserExercise, MedalType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Coins, Trophy, Lock, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Avatar } from './Avatar';

interface LevelPathProps {
  onSelectLevel: (levelId: number) => void;
}

export function LevelPath({ onSelectLevel }: LevelPathProps) {
  const { 
    currentUser, 
    currentLevel, 
    levelProgress, 
    userExercises 
  } = useGame();

  const [showMedalPopup, setShowMedalPopup] = useState(false);
  const [medalType, setMedalType] = useState<'bronze' | 'silver' | 'gold' | null>(null);
  const [medalLevel, setMedalLevel] = useState<GameLevel | null>(null);

  // Function to determine if a level is locked
  const isLevelLocked = (levelNumber: number) => {
    // Level 1 is always unlocked
    if (levelNumber === 1) return false;
    
    // If previous level is completed, this level is unlocked
    const previousLevelCompleted = userExercises.some(ex => 
      ex.levelId === levelNumber - 1 && ex.isCompleted
    );
    
    return !previousLevelCompleted;
  };
  
  // Function to determine level status
  const getLevelStatus = (level: GameLevel) => {
    // Current active level
    if (currentLevel?.id === level.id) {
      return 'active';
    }
    
    // Count completed exercises for this level
    const completedExercises = userExercises.filter(
      ex => ex.levelId === level.id && ex.isCompleted
    ).length;
    
    // Level specific exercises
    const levelExercises = userExercises.filter(
      ex => ex.levelId === level.id
    );
    
    // If all exercises are completed, level is complete
    if (levelExercises.length > 0 && completedExercises === levelExercises.length) {
      return 'completed';
    }
    
    // If some exercises are completed, level is in progress
    if (completedExercises > 0) {
      return 'inProgress';
    }
    
    // Locked or not started
    return isLevelLocked(level.levelNumber) ? 'locked' : 'notStarted';
  };
  
  // Function to determine medal for a level
  const getLevelMedal = (level: GameLevel): 'bronze' | 'silver' | 'gold' | null => {
    // Get exercises for this level
    const levelExercises = userExercises.filter(ex => ex.levelId === level.id);
    
    // If no exercises or not all completed, no medal
    if (levelExercises.length === 0) return null;
    const allCompleted = levelExercises.every(ex => ex.isCompleted);
    if (!allCompleted) return null;
    
    // Calculate average score
    const totalScore = levelExercises.reduce((sum, ex) => sum + (ex.score || ex.pronunciationScore || 0), 0);
    const avgScore = totalScore / levelExercises.length;
    
    // Determine medal based on average score
    if (avgScore >= 90) return 'gold';
    if (avgScore >= 80) return 'silver';
    if (avgScore >= 70) return 'bronze';
    return null;
  };
  
  // Function to handle level click
  const handleLevelClick = (level: GameLevel) => {
    const status = getLevelStatus(level);
    if (status === 'locked') return;
    
    onSelectLevel(level.id);
  };
  
  // Function to show medal award animation
  const showMedalAward = (type: 'bronze' | 'silver' | 'gold', level: GameLevel) => {
    setMedalType(type);
    setMedalLevel(level);
    setShowMedalPopup(true);
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Close after 5 seconds
    setTimeout(() => {
      setShowMedalPopup(false);
    }, 5000);
  };
  
  // Generate mock levels for demonstration
  const mockLevels: GameLevel[] = [
    { id: 1, levelNumber: 1, name: "Basic Greetings", description: "Practice simple hello and goodbye phrases", difficulty: "easy", requiredXP: 100, isActive: true, isCompleted: false, exercises: 3 },
    { id: 2, levelNumber: 2, name: "Personal Info", description: "Learn to share your name and basic details", difficulty: "easy", requiredXP: 200, isActive: false, isCompleted: false, exercises: 3 },
    { id: 3, levelNumber: 3, name: "Daily Routines", description: "Practice describing your daily activities", difficulty: "easy", requiredXP: 300, isActive: false, isCompleted: false, exercises: 3 },
    { id: 4, levelNumber: 4, name: "Food & Dining", description: "Learn food vocabulary and ordering phrases", difficulty: "medium", requiredXP: 400, isActive: false, isCompleted: false, exercises: 3 },
    { id: 5, levelNumber: 5, name: "Directions", description: "Practice asking for and giving directions", difficulty: "medium", requiredXP: 500, isActive: false, isCompleted: false, exercises: 3 },
    { id: 6, levelNumber: 6, name: "Health", description: "Learn to describe symptoms and emergency phrases", difficulty: "hard", requiredXP: 600, isActive: false, isCompleted: false, exercises: 3 }
  ];
  
  return (
    <div className="w-full mx-auto max-w-3xl px-4 pb-20">
      <h1 className="text-2xl font-bold text-center text-green-800 my-6">
        Recovery Journey
      </h1>
      
      <div className="relative w-full py-10">
        {/* Winding curved path SVG */}
        <svg 
          className="absolute h-full w-full top-0 left-0" 
          viewBox="0 0 100 540" 
          preserveAspectRatio="none"
        >
          {/* Main curved path */}
          <path 
            d="M50,0 Q70,60 30,120 Q10,180 50,240 Q80,300 40,360 Q15,420 50,480 Q75,540 50,540" 
            className="stroke-green-200" 
            strokeWidth="3" 
            fill="none" 
            strokeLinecap="round"
            strokeDasharray="5,2.5"
          />
          {/* Path overlay for animation effect */}
          <path 
            d="M50,0 Q70,60 30,120 Q10,180 50,240 Q80,300 40,360 Q15,420 50,480 Q75,540 50,540" 
            className="stroke-green-300" 
            strokeWidth="3" 
            fill="none" 
            strokeLinecap="round"
            strokeDasharray="2,20"
          >
            <animate 
              attributeName="stroke-dashoffset" 
              from="0" 
              to="50" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          </path>
        </svg>
        
        {/* Levels arranged along the path */}
        <div className="relative z-10">
          {mockLevels.map((level, index) => {
            const status = getLevelStatus(level);
            const medal = getLevelMedal(level);
            
            // Calculate position along winding path
            const positionStyles = {
              left: index % 2 === 0 ? '50%' : index % 3 === 0 ? '65%' : '35%',
              top: `${20 + index * 90}px`,
              transform: index % 2 === 0 ? 'translateX(-50%)' : index % 3 === 0 ? 'translateX(-65%)' : 'translateX(-35%)'
            };
            
            return (
              <div key={level.id} className="absolute" style={positionStyles}>
                <div className="relative flex items-center justify-center">
                  {/* Floating coins/rewards (only show if not locked and not on all levels to reduce clutter) */}
                  {(index === 1 || index === 4) && status !== 'locked' && (
                    <motion.div 
                      className="absolute -top-12 -right-8"
                      initial={{ y: 0 }}
                      animate={{ y: [-4, 4, -4] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <div className="relative flex items-center justify-center bg-yellow-400 rounded-full p-2 shadow-lg">
                        <Coins className="h-5 w-5 text-yellow-800" />
                        <span className="absolute -top-2 -right-2 bg-white rounded-full text-xs font-bold w-5 h-5 flex items-center justify-center border border-yellow-400">
                          {level.levelNumber * 5}
                        </span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Level Button with animation */}
                  <motion.button
                    className={`
                      relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-10
                      ${status === 'locked' ? 'bg-gray-300 cursor-not-allowed' : 
                      status === 'completed' ? 'bg-green-500 text-white' :
                      status === 'active' ? 'bg-blue-500 text-white' :
                      status === 'inProgress' ? 'bg-yellow-400 text-yellow-900' :
                      'bg-white border-2 border-green-400 text-green-800'}
                    `}
                    whileHover={status !== 'locked' ? { 
                      scale: 1.1,
                      boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)'
                    } : {}}
                    whileTap={status !== 'locked' ? { 
                      scale: 0.95,
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)' 
                    } : {}}
                    animate={status === 'active' ? {
                      boxShadow: ['0 0 0 4px rgba(59, 130, 246, 0.3)', '0 0 0 8px rgba(59, 130, 246, 0)', '0 0 0 4px rgba(59, 130, 246, 0.3)']
                    } : {}}
                    transition={status === 'active' ? {
                      duration: 2,
                      repeat: Infinity
                    } : {}}
                    onClick={() => handleLevelClick(level)}
                  >
                    {status === 'locked' ? (
                      <Lock className="h-6 w-6 text-gray-500" />
                    ) : (
                      <motion.span 
                        className="text-xl font-bold"
                        animate={status === 'active' ? {
                          scale: [1, 1.1, 1],
                        } : {}}
                        transition={status === 'active' ? {
                          duration: 2,
                          repeat: Infinity
                        } : {}}
                      >
                        {level.levelNumber}
                      </motion.span>
                    )}
                    
                    {/* Level name label */}
                    <div className={`absolute ${index % 2 === 0 ? 'left-20' : '-left-40'} whitespace-nowrap`}>
                      <span className={`font-medium ${status === 'locked' ? 'text-gray-400' : 'text-green-800'}`}>
                        {level.name}
                      </span>
                    </div>
                    
                    {/* Show current user avatar at active level */}
                    {status === 'active' && (
                      <motion.div 
                        className="absolute -right-8 transform scale-75"
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Avatar />
                      </motion.div>
                    )}
                    
                    {/* Medal for completed levels */}
                    {medal && (
                      <motion.div 
                        className="absolute -right-5 -bottom-2"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                      >
                        {medal === 'gold' && (
                          <div className="flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full border-2 border-yellow-600 shadow-md">
                            <Trophy className="h-4 w-4 text-yellow-100" />
                          </div>
                        )}
                        {medal === 'silver' && (
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full border-2 border-gray-400 shadow-md">
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        )}
                        {medal === 'bronze' && (
                          <div className="flex items-center justify-center w-8 h-8 bg-amber-600 rounded-full border-2 border-amber-700 shadow-md">
                            <Trophy className="h-4 w-4 text-amber-200" />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Medal award popup */}
      <AnimatePresence>
        {showMedalPopup && medalType && medalLevel && (
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
                    ${medalType === 'gold' ? 'bg-yellow-500 border-yellow-600' : 
                    medalType === 'silver' ? 'bg-gray-300 border-gray-400' : 
                    'bg-amber-600 border-amber-700'}
                    border-4 shadow-lg
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
                  <Trophy className={`h-16 w-16 ${
                    medalType === 'gold' ? 'text-yellow-100' : 
                    medalType === 'silver' ? 'text-white' : 
                    'text-amber-200'
                  }`} />
                  
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
                  {medalType === 'gold' ? 'Gold' : medalType === 'silver' ? 'Silver' : 'Bronze'}
                </span> medal for completing Level {medalLevel.levelNumber}: {medalLevel.name}!
              </p>
              
              <div className="flex justify-center">
                <Button 
                  className="px-8"
                  onClick={() => setShowMedalPopup(false)}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}