import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { GameLevel, User } from '@/lib/types';
import { Award, Star, Sparkles, Gift, Palmtree, PartyPopper, Trophy, Zap } from 'lucide-react';
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

// Decorative floating particle component
const FloatingParticle = ({ 
  x, 
  y, 
  delay, 
  duration, 
  children 
}: { 
  x: number; 
  y: number; 
  delay: number; 
  duration: number; 
  children: React.ReactNode;
}) => (
  <motion.div
    className="absolute"
    style={{ x, y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 0],
      scale: [0.3, 1, 0.5],
      y: [y, y - 100],
      x: [x, x + (Math.random() > 0.5 ? 50 : -50)]
    }}
    transition={{ 
      duration,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 2 + 1
    }}
  >
    {children}
  </motion.div>
);

export function LevelComplete({
  user,
  completedLevel,
  nextLevel,
  stats,
  onContinue
}: LevelCompleteProps) {
  const [showRewards, setShowRewards] = useState(false);
  const [showNextLevel, setShowNextLevel] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey'>('coolChicken');
  
  useEffect(() => {
    // Show rewards after a delay
    const rewardsTimer = setTimeout(() => {
      setShowRewards(true);
    }, 1000);
    
    // Show next level info after another delay
    const nextLevelTimer = setTimeout(() => {
      setShowNextLevel(true);
    }, 2000);
    
    // Cycle through the characters
    const characters: ('chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey')[] = 
      ['coolChicken', 'chicken', 'penguin', 'frog', 'tiger', 'monkey'];
    let index = 0;
    
    const characterTimer = setInterval(() => {
      index = (index + 1) % characters.length;
      setSelectedCharacter(characters[index]);
    }, 3000);
    
    // Hide confetti after some time
    const confettiTimer = setTimeout(() => {
      setConfettiVisible(false);
    }, 5000);
    
    return () => {
      clearTimeout(rewardsTimer);
      clearTimeout(nextLevelTimer);
      clearTimeout(confettiTimer);
      clearInterval(characterTimer);
    };
  }, []);
  
  // Calculate a rating based on average score (1-5 stars)
  const rating = Math.max(1, Math.min(5, Math.floor(stats.averageScore / 20)));
  
  // Create particles for the confetti effect
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const x = (Math.random() - 0.5) * window.innerWidth * 0.8;
    const y = (Math.random() - 0.5) * window.innerHeight * 0.8;
    const delay = Math.random() * 2;
    const duration = Math.random() * 3 + 2;
    
    // Choose a random color
    const colors = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return { x, y, delay, duration, color };
  });
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#264653]/80 backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Confetti particles */}
        {confettiVisible && particles.map((particle, i) => (
          <FloatingParticle 
            key={i} 
            x={particle.x} 
            y={particle.y} 
            delay={particle.delay} 
            duration={particle.duration}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: particle.color }}
            />
          </FloatingParticle>
        ))}
        
        {/* Celebration icons */}
        {confettiVisible && (
          <>
            <FloatingParticle x={-150} y={-100} delay={0.2} duration={3}>
              <Sparkles className="h-8 w-8 text-[#e9c46a]" />
            </FloatingParticle>
            <FloatingParticle x={150} y={-120} delay={0.5} duration={3.5}>
              <PartyPopper className="h-8 w-8 text-[#e76f51]" />
            </FloatingParticle>
            <FloatingParticle x={-120} y={150} delay={0.7} duration={2.8}>
              <Zap className="h-8 w-8 text-[#2a9d8f]" />
            </FloatingParticle>
            <FloatingParticle x={130} y={130} delay={1} duration={3.2}>
              <Trophy className="h-8 w-8 text-[#f4a261]" />
            </FloatingParticle>
          </>
        )}
        
        <motion.div
          className="max-w-lg w-full mx-4 relative"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Card className="border-4 border-[#f4a261] overflow-hidden bg-[#fdf1d6] shadow-2xl">
            <CardContent className="p-0">
              {/* Header - Celebration */}
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
                  <div className="flex justify-center mb-4 relative">
                    <motion.div 
                      className="absolute -inset-4"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        repeatType: 'reverse'
                      }}
                    >
                      <Sparkles className="absolute top-0 left-0 h-6 w-6 text-[#e9c46a]" />
                      <Sparkles className="absolute top-0 right-4 h-8 w-8 text-[#e9c46a]" />
                      <Sparkles className="absolute bottom-2 right-0 h-6 w-6 text-[#e9c46a]" />
                      <Sparkles className="absolute bottom-0 left-4 h-7 w-7 text-[#e9c46a]" />
                    </motion.div>
                    
                    <motion.div 
                      className="bg-[#fdf1d6] rounded-full p-4 shadow-lg relative z-10"
                      animate={{ 
                        rotate: [0, -5, 0, 5, 0],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 5,
                      }}
                    >
                      <Award size={60} className="text-[#e76f51]" />
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
                    Level Complete!
                  </motion.h2>
                  
                  <motion.h3 
                    className="text-2xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    You've mastered Level {completedLevel.levelNumber}: {completedLevel.name}
                  </motion.h3>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="p-8">
                <div className="flex justify-center -mt-16 mb-8">
                  <motion.div 
                    className="bg-white rounded-full p-2 shadow-xl"
                    animate={{ 
                      y: [0, -5, 0],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatType: "reverse", 
                      duration: 2,
                    }}
                  >
                    <Avatar 
                      size="lg" 
                      character={selectedCharacter}
                      selectedRewards={{ 
                        accessory: 'sunglasses',
                        hat: 'party'
                      }}
                    />
                  </motion.div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-lg p-4 text-center shadow-md border-2 border-[#e9c46a]">
                    <div className="font-bold text-[#264653] text-lg">Exercises</div>
                    <motion.div 
                      className="text-3xl font-bold text-[#2a9d8f] mt-2"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    >
                      {stats.exercisesCompleted}/{stats.totalExercises}
                    </motion.div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-center shadow-md border-2 border-[#e9c46a]">
                    <div className="font-bold text-[#264653] text-lg">XP Earned</div>
                    <motion.div 
                      className="text-3xl font-bold text-[#e76f51] mt-2"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8, type: 'spring' }}
                    >
                      +{stats.xpEarned}
                    </motion.div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 mb-8 text-center shadow-md border-2 border-[#e9c46a]">
                  <div className="font-bold text-[#264653] text-lg mb-3">Performance</div>
                  <div className="flex justify-center space-x-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ 
                          scale: i < rating ? 1 : 0.6,
                          rotate: 0
                        }}
                        transition={{ 
                          delay: 0.5 + (i * 0.2),
                          type: 'spring',
                          bounce: 0.5
                        }}
                      >
                        <Star 
                          fill={i < rating ? "currentColor" : "none"} 
                          className={`h-8 w-8 ${i < rating ? 'text-[#e9c46a]' : 'text-gray-300'}`} 
                        />
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-[#264653] mt-2 font-medium">
                    Average Score: {stats.averageScore.toFixed(0)}%
                  </div>
                </div>
                
                {/* Rewards */}
                <AnimatePresence>
                  {showRewards && completedLevel.unlockableRewards && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-[#f4a261]/30 to-[#e9c46a]/30 rounded-lg p-5 mb-8 border-2 border-[#f4a261]"
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div 
                        className="flex items-center justify-center gap-3 mb-2"
                        animate={{ 
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          repeatType: "reverse", 
                          duration: 1.5
                        }}
                      >
                        <Gift className="h-7 w-7 text-[#e76f51]" />
                        <h4 className="font-bold text-center text-[#264653] text-lg">Rewards Unlocked!</h4>
                      </motion.div>
                      <div className="text-center text-[#264653]">
                        New avatar customization items are now available!
                      </div>
                      <div className="mt-4 flex justify-center gap-4">
                        <motion.div 
                          className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          🕶️
                        </motion.div>
                        <motion.div 
                          className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          👑
                        </motion.div>
                        <motion.div 
                          className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          🧢
                        </motion.div>
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
                      transition={{ duration: 0.5 }}
                    >
                      {nextLevel ? (
                        <div className="text-center mb-6 bg-white rounded-lg p-4 shadow-md border-2 border-[#e9c46a]">
                          <h4 className="font-bold text-[#264653] text-lg">Next Challenge</h4>
                          <p className="text-[#2a9d8f] font-medium mt-1">
                            Level {nextLevel.levelNumber}: {nextLevel.name}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center mb-6 bg-white rounded-lg p-4 shadow-md border-2 border-[#e9c46a]">
                          <h4 className="font-bold text-[#264653] text-lg">Congratulations!</h4>
                          <p className="text-[#2a9d8f] font-medium mt-1">
                            You've completed all available levels!
                          </p>
                        </div>
                      )}
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          className="w-full py-6 text-xl bg-gradient-to-r from-[#2a9d8f] to-[#264653] hover:from-[#264653] hover:to-[#2a9d8f] text-white border-none shadow-lg" 
                          onClick={onContinue}
                        >
                          {nextLevel ? 'Continue to Next Level' : 'Back to Home'}
                        </Button>
                      </motion.div>
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