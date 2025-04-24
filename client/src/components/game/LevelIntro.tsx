import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel } from '@/lib/types';
import { Trophy, Star, Zap, Palmtree, Umbrella, Sun, ChevronLeft, ChevronRight, Lock, X as XIcon, Save } from 'lucide-react';
import { Avatar } from './Avatar';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { useAuth } from '../../hooks/useAuth';

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
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Try to get the saved character from localStorage, default to coolChicken
  const savedCharacter = localStorage.getItem('selectedCharacter') as 'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey' | null;
  const [currentCharacter, setCurrentCharacter] = useState<'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey'>(savedCharacter || 'coolChicken');
  const [selectedCharacter, setSelectedCharacter] = useState<'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey'>(savedCharacter || 'coolChicken');

  // Available characters based on level
  const characters: {
    type: 'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey';
    name: string;
    unlockLevel: number;
  }[] = [
    { type: 'coolChicken', name: 'Rubber Chicken', unlockLevel: 1 },
    { type: 'chicken', name: 'Basic Chicken', unlockLevel: 1 },
    { type: 'penguin', name: 'Cool Penguin', unlockLevel: 2 },
    { type: 'frog', name: 'Friendly Frog', unlockLevel: 3 },
    { type: 'tiger', name: 'Tough Tiger', unlockLevel: 4 },
    { type: 'monkey', name: 'Magical Monkey', unlockLevel: 5 },
  ];

  useEffect(() => {
    // Show details after a short delay
    const timer = setTimeout(() => {
      setShowDetails(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);
  
  // Handle character selection
  const handleSelectCharacter = (character: 'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey') => {
    setSelectedCharacter(character);
    setCurrentCharacter(character);
    setShowAvatarSelection(false);
    localStorage.setItem('selectedCharacter', character);
    
    toast({
      title: "Avatar Selected!",
      description: `You've chosen a new companion for your journey!`,
      variant: "default",
    });
    
    // Trigger confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

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
                className="bg-gradient-to-r from-[#2a9d8f] to-[#264653] text-white p-4 pb-2 text-center relative"
                style={{
                  background: `linear-gradient(to right, #2a9d8f, #264653)`
                }}
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <div className="flex justify-center mb-2">
                    <motion.div 
                      className="bg-[#fdf1d6] rounded-full p-2 shadow-lg"
                      whileHover={{ rotate: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } }}
                    >
                      <Trophy size={30} className="text-[#e76f51]" />
                    </motion.div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <motion.h2 
                      className="text-3xl font-bold mb-0.5"
                      animate={{ 
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        repeatType: "reverse", 
                        duration: 2
                      }}
                    >
                      Level {level.levelNumber}:
                    </motion.h2>

                    <motion.h3 
                      className="text-xl font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      {level.name}
                    </motion.h3>
                  </div>
                </motion.div>
              </div>

              {/* Content */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    className="p-5 max-h-[70vh] overflow-y-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {/* Avatar Display or Selection */}
                    {!showAvatarSelection ? (
                      <div className="flex justify-center -mt-12 mb-4 relative z-10">
                        <motion.div 
                          className="bg-white rounded-full p-0.5 shadow-xl"
                          animate={{ 
                            y: [0, -5, 0],
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            repeatType: "reverse", 
                            duration: 1.5,
                            delay: 1
                          }}
                          onClick={() => setShowAvatarSelection(true)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Avatar 
                            size="lg" 
                            character={currentCharacter}
                            selectedRewards={{ accessory: 'sunglasses' }}
                          />
                          <div className="absolute bottom-0 right-0 bg-[#57cc99] rounded-full p-1 shadow-md border-2 border-white">
                            <Star className="h-4 w-4 text-white" />
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 shadow-md border-2 border-[#57cc99] mb-6 -mt-10 relative max-h-52 overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-[#264653] text-md">Select Your Character</h4>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 rounded-full" 
                            onClick={() => setShowAvatarSelection(false)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {characters.map((char) => {
                            const isUnlocked = char.unlockLevel <= level.levelNumber;
                            return (
                              <motion.div
                                key={char.type}
                                className={`
                                  border-2 rounded-lg p-2 flex flex-col items-center relative
                                  ${isUnlocked ? 'border-[#57cc99] cursor-pointer' : 'border-gray-300 opacity-70'}
                                `}
                                whileHover={isUnlocked ? { scale: 1.05 } : {}}
                                onClick={() => isUnlocked && handleSelectCharacter(char.type)}
                              >
                                <Avatar size="md" character={char.type} />
                                <div className="text-xs mt-1 font-medium text-center">{char.name}</div>
                                {!isUnlocked && (
                                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                                    <div className="bg-[#264653] text-white text-xs px-2 py-1 rounded flex items-center">
                                      <Lock className="h-3 w-3 mr-1" />
                                      Level {char.unlockLevel}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-center text-[#264653] mb-4 font-medium text-md">
                      {level.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center shadow-md border-2 border-[#57cc99]">
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
                          className="mb-1"
                        >
                          <Star className="h-6 w-6 mx-auto text-[#57cc99]" />
                        </motion.div>
                        <div className="font-bold text-[#264653] text-sm">Difficulty</div>
                        <div className="text-xs text-[#2a9d8f] capitalize font-medium">
                          {level.difficulty}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 text-center shadow-md border-2 border-[#57cc99]">
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
                          className="mb-1"
                        >
                          <Zap className="h-6 w-6 mx-auto text-[#57cc99]" />
                        </motion.div>
                        <div className="font-bold text-[#264653] text-sm">XP Reward</div>
                        <div className="text-xs text-[#2a9d8f] font-medium">
                          Up to {level.levelNumber * 100} XP
                        </div>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-4"
                    >
                      <Button 
                        className="w-full py-4 text-lg bg-[#57cc99] hover:bg-[#38b37a] text-white border-none shadow-lg" 
                        onClick={onStart}
                      >
                        Start Level
                      </Button>
                    </motion.div>
                    
                    {!isAuthenticated && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-3"
                      >
                        <Button 
                          variant="outline"
                          className="w-full flex items-center justify-center gap-2 py-2 border-[#2a9d8f] text-[#2a9d8f] hover:bg-[#2a9d8f]/10" 
                          onClick={() => window.location.href = "/api/login"}
                        >
                          <Save className="h-4 w-4" />
                          Sign in to save progress
                        </Button>
                      </motion.div>
                    )}
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