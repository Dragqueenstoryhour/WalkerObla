import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel } from '@/lib/types';
import { Trophy, Star, Zap, Palmtree, Umbrella, Sun, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Avatar } from './Avatar';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface LevelIntroProps {
  level: GameLevel;
  onStart: () => void;
}

// Decorative floating elements
const FloatingElement = ({ children, delay, x, y }: { 
  children: React.ReactNode;
  delay: number;
  x: number;
  y: number;
}) => (
  <motion.div
    className="absolute"
    style={{ x, y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [y, y - 15, y],
      rotate: [0, x > 0 ? 10 : -10, 0]
    }}
    transition={{ 
      delay, 
      duration: 3,
      repeat: Infinity,
      repeatType: 'reverse'
    }}
  >
    {children}
  </motion.div>
);

export function LevelIntro({ level, onStart }: LevelIntroProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey'>('coolChicken');

  // Cycle through characters every few seconds
  useEffect(() => {
    const characters: ('chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey')[] = ['coolChicken', 'chicken', 'penguin', 'frog', 'tiger', 'monkey'];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % characters.length;
      setCurrentCharacter(characters[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#264653]/80 backdrop-blur-sm overflow-y-auto py-6 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Tiki-themed decorative elements */}
        <FloatingElement delay={0.2} x={-150} y={-100}>
          <Palmtree className="h-12 w-12 text-[#2a9d8f]" />
        </FloatingElement>
        <FloatingElement delay={0.8} x={150} y={-80}>
          <Umbrella className="h-10 w-10 text-[#e9c46a]" />
        </FloatingElement>
        <FloatingElement delay={0.5} x={-120} y={120}>
          <Sun className="h-14 w-14 text-[#e76f51]" />
        </FloatingElement>

        <motion.div
          className="max-w-lg w-full mx-4 relative"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Card className="border-4 border-[#f4a261] overflow-hidden bg-[#fdf1d6] shadow-2xl">
            <CardContent className="p-0">
              {/* Header */}
              <div 
                className="bg-gradient-to-r from-[#2a9d8f] to-[#264653] text-white p-8 text-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(to right, #2a9d8f, #264653)`
                }}
              >
                {/* Decorative wave pattern */}
                <div className="absolute -bottom-8 left-0 right-0 h-16">
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
                    <path 
                      d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
                      className="fill-[#fdf1d6]"
                    ></path>
                  </svg>
                </div>

                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="flex justify-center mb-6">
                    <motion.div 
                      className="bg-[#fdf1d6] rounded-full p-4 shadow-lg"
                      whileHover={{ rotate: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } }}
                    >
                      <Trophy size={60} className="text-[#e76f51]" />
                    </motion.div>
                  </div>

                  <motion.h2 
                    className="text-5xl font-bold mb-2"
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatType: "reverse", 
                      duration: 2
                    }}
                  >
                    Level {level.levelNumber}
                  </motion.h2>

                  <motion.h3 
                    className="text-2xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {level.name}
                  </motion.h3>
                </motion.div>
              </div>

              {/* Content */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    className="p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex justify-center -mt-16 mb-4">
                      <motion.div 
                        className="bg-white rounded-full p-1 shadow-xl"
                        animate={{ 
                          y: [0, -5, 0],
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          repeatType: "reverse", 
                          duration: 1.5,
                          delay: 1
                        }}
                      >
                        <Avatar 
                          size="lg" 
                          character={currentCharacter}
                          selectedRewards={{ accessory: 'sunglasses' }}
                        />
                      </motion.div>
                    </div>

                    <p className="text-center text-[#264653] mb-6 font-medium text-lg">
                      {level.description}
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="bg-white rounded-lg p-4 text-center shadow-md border-2 border-[#e9c46a]">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, 0, -10, 0],
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            repeatType: "reverse", 
                            duration: 3,
                            delay: 0.5
                          }}
                          className="mb-2"
                        >
                          <Star className="h-8 w-8 mx-auto text-[#e9c46a]" />
                        </motion.div>
                        <div className="font-bold text-[#264653]">Difficulty</div>
                        <div className="text-sm text-[#2a9d8f] capitalize font-medium">
                          {level.difficulty}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 text-center shadow-md border-2 border-[#e9c46a]">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.2, 1],
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            repeatType: "reverse", 
                            duration: 2,
                            delay: 0.2
                          }}
                          className="mb-2"
                        >
                          <Zap className="h-8 w-8 mx-auto text-[#e76f51]" />
                        </motion.div>
                        <div className="font-bold text-[#264653]">XP Reward</div>
                        <div className="text-sm text-[#2a9d8f] font-medium">
                          Up to {level.levelNumber * 100} XP
                        </div>
                      </div>
                    </div>

                    {level.unlockableRewards && (
                      <motion.div 
                        className="bg-gradient-to-r from-[#f4a261]/30 to-[#e9c46a]/30 rounded-lg p-5 mb-8 border-2 border-[#f4a261]"
                        animate={{ 
                          boxShadow: [
                            '0 0 0 rgba(228, 155, 15, 0)',
                            '0 0 20px rgba(228, 155, 15, 0.5)',
                            '0 0 0 rgba(228, 155, 15, 0)'
                          ]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 3
                        }}
                      >
                        <h4 className="font-bold text-center mb-2 text-[#264653] text-lg">Unlockable Rewards</h4>
                        <div className="text-center text-[#264653]">
                          Complete this level to unlock special customization items!
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        className="w-full py-6 text-xl bg-gradient-to-r from-[#2a9d8f] to-[#264653] hover:from-[#264653] hover:to-[#2a9d8f] text-white border-none shadow-lg" 
                        onClick={onStart}
                      >
                        Start Level
                      </Button>
                    </motion.div>
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