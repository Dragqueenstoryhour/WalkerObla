import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Draggable from 'react-draggable';
import { useGame } from '@/contexts/GameContext';
import { GameLevel } from '@/lib/types';
import { Island } from './Island';
import { OceanBackground } from './OceanBackground';
import { SoundManager } from './SoundManager';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface IslandMapProps {
  onSelectLevel: (levelId: number) => void;
}

export function IslandMap({ onSelectLevel }: IslandMapProps) {
  const { 
    currentUser, 
    currentLevel,
    levelProgress,
    userExercises 
  } = useGame();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const soundManager = useRef<SoundManager>(new SoundManager());
  
  // Setup islands positions along a curved path
  const getIslandPosition = (index: number, totalLevels: number) => {
    // Create a curved path for island positioning
    const pathWidth = 800;
    const pathHeight = 500;
    
    // Calculate position based on curved path
    const progress = index / (totalLevels - 1);
    const x = pathWidth * 0.5 + Math.sin(progress * Math.PI * 2) * (pathWidth * 0.4);
    const y = progress * pathHeight;
    
    return { x, y };
  };
  
  // Determine level status
  const getLevelStatus = (level: GameLevel): 'active' | 'completed' | 'inProgress' | 'notStarted' | 'locked' => {
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
    
    // For simplicity, we're not implementing locked levels
    return 'notStarted';
  };
  
  // Handle level selection with sound effect
  const handleLevelSelect = (levelId: number) => {
    soundManager.current.playSound('select');
    setActiveLevelId(levelId);
    onSelectLevel(levelId);
  };

  // Generate levels with island theme
  const islandLevels: GameLevel[] = [
    { id: 1, levelNumber: 1, name: "Alphabet Atoll", description: "Practice simple words like 'hello', 'thank you', and 'goodbye'", difficulty: "easy", requiredXP: 100, isActive: true, isCompleted: false, exercises: 3 },
    { id: 2, levelNumber: 2, name: "Phrase Pier", description: "Practice everyday phrases like 'How are you?' and 'My name is...'", difficulty: "easy", requiredXP: 200, isActive: false, isCompleted: false, exercises: 3 },
    { id: 3, levelNumber: 3, name: "Sentence Shores", description: "Practice complete sentences like 'I would like a glass of water'", difficulty: "easy", requiredXP: 300, isActive: false, isCompleted: false, exercises: 3 },
    { id: 4, levelNumber: 4, name: "Dialog Delta", description: "Practice challenging phrases like 'Could you please help me find the nearest pharmacy?'", difficulty: "medium", requiredXP: 400, isActive: false, isCompleted: false, exercises: 4 },
    { id: 5, levelNumber: 5, name: "Conversation Cove", description: "Practice sentences with multiple parts like 'When I finish my therapy today, I would like to go to the park'", difficulty: "medium", requiredXP: 500, isActive: false, isCompleted: false, exercises: 4 },
    { id: 6, levelNumber: 6, name: "Fluency Falls", description: "Practice fluid conversation patterns and improve overall speech rhythm and fluency", difficulty: "hard", requiredXP: 600, isActive: false, isCompleted: false, exercises: 5 }
  ];

  // Initialize sounds and effects
  useEffect(() => {
    if (!isInitialized) {
      // Initialize sound effects
      soundManager.current.initialize();
      
      // Setup keyboard events for map navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          const currentIndex = islandLevels.findIndex(level => level.id === (activeLevelId || 1));
          if (currentIndex < islandLevels.length - 1) {
            const nextLevel = islandLevels[currentIndex + 1];
            handleLevelSelect(nextLevel.id);
          }
        } else if (e.key === 'ArrowLeft') {
          const currentIndex = islandLevels.findIndex(level => level.id === (activeLevelId || 1));
          if (currentIndex > 0) {
            const prevLevel = islandLevels[currentIndex - 1];
            handleLevelSelect(prevLevel.id);
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      setIsInitialized(true);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isInitialized, islandLevels, activeLevelId]);

  // Play hover sound
  const handleIslandHover = () => {
    soundManager.current.playSound('hover');
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden bg-blue-50">
      {/* Ocean Background */}
      <OceanBackground />
      
      {/* Main draggable map container */}
      <Draggable
        nodeRef={containerRef}
        bounds={{ left: -1000, top: -500, right: 500, bottom: 200 }}
        onStart={() => {
          setIsDragging(true);
          soundManager.current.playSound('drag');
        }}
        onStop={() => setIsDragging(false)}
      >
        <div 
          ref={containerRef}
          className="absolute left-1/4 top-20 w-[1200px] h-[800px]"
          style={{ 
            transform: `scale(${scale})`,
            touchAction: 'none'
          }}
        >
          {/* Islands */}
          {islandLevels.map((level, index) => {
            const position = getIslandPosition(index, islandLevels.length);
            const status = getLevelStatus(level);
            
            return (
              <Island
                key={level.id}
                level={level}
                status={status}
                position={position}
                onSelect={() => handleLevelSelect(level.id)}
                onHover={handleIslandHover}
                isActive={level.id === (activeLevelId || currentLevel?.id)}
              />
            );
          })}
          
          {/* Curved path connecting all islands */}
          <svg className="absolute inset-0 z-0 pointer-events-none" width="1200" height="800">
            <path
              d="M400,50 C500,100 300,150 450,200 C600,250 350,300 500,350 C650,400 400,450 550,500 C700,550 450,600 600,650"
              fill="none"
              stroke="#2C5282"
              strokeWidth="5"
              strokeDasharray="10,10"
              strokeLinecap="round"
              className="animate-dash"
            />
            {/* Decorative elements */}
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.circle
                key={i}
                cx={300 + (i * 100) % 400}
                cy={100 + (i * 90)}
                r="4"
                fill="#90CDF4"
                initial={{ opacity: 0.6 }}
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  y: [0, -10, 0]
                }}
                transition={{ 
                  duration: 3, 
                  delay: i * 0.5,
                  repeat: Infinity 
                }}
              />
            ))}
          </svg>
        </div>
      </Draggable>
      
      {/* Zoom controls */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2 z-20">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full bg-blue-500 text-white hover:bg-blue-600"
          onClick={() => {
            setScale(Math.min(2, scale + 0.1));
            soundManager.current.playSound('click');
          }}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full bg-blue-500 text-white hover:bg-blue-600"
          onClick={() => {
            setScale(Math.max(0.5, scale - 0.1));
            soundManager.current.playSound('click');
          }}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Compass */}
      <motion.div 
        className="absolute top-5 right-5 bg-white/80 rounded-full p-3 shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [-5, 5, -5] }}
        transition={{ 
          scale: { type: 'spring', damping: 15, delay: 0.5 },
          rotate: { repeat: Infinity, duration: 5 }
        }}
      >
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 border-4 border-blue-900 rounded-full"></div>
          <div className="absolute left-1/2 top-0 w-1 h-1/2 bg-red-500 rounded-full transform -translate-x-1/2 origin-bottom"></div>
          <div className="absolute left-1/2 top-1/2 w-1 h-1/2 bg-blue-500 rounded-full transform -translate-x-1/2 rotate-180 origin-top"></div>
          <div className="absolute top-1/2 left-0 h-1 w-1/2 bg-blue-700 rounded-full transform -translate-y-1/2 origin-right"></div>
          <div className="absolute top-1/2 left-1/2 h-1 w-1/2 bg-blue-700 rounded-full transform -translate-y-1/2 origin-left"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-900 rounded-full"></div>
          </div>
        </div>
      </motion.div>
      
      {/* Mobile instruction */}
      <motion.div
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/70 rounded-lg px-4 py-2 text-sm text-blue-900 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        Drag to explore the ocean • Tap islands to select levels
      </motion.div>
    </div>
  );
}