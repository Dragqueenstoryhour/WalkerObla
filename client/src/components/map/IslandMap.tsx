import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Draggable from 'react-draggable';
import { useGame } from '@/contexts/GameContext';
import { GameLevel } from '@/lib/types';
import { Island } from './Island';
import { OceanBackground } from './OceanBackground';
import { SoundManager } from './SoundManager';
import { PirateShip } from './PirateShip';

interface IslandMapProps {
  onSelectLevel: (levelId: number) => void;
}

export function IslandMap({ onSelectLevel }: IslandMapProps) {
  const { currentLevel, userExercises } = useGame();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  const [selectedIslandPosition, setSelectedIslandPosition] = useState<{ x: number, y: number } | null>(null);
  const [showShip, setShowShip] = useState(false);
  const soundManager = useRef<SoundManager>(new SoundManager());

  const islandLevels: GameLevel[] = useMemo(() => ([
    { id: 1, levelNumber: 1, name: "Mixed Easy Words Island", description: "Practice basic pronunciation", difficulty: "easy", requiredXP: 0, isActive: true, isCompleted: false, exercises: 10 },
    { id: 2, levelNumber: 2, name: "Trickier Words Isle", description: "Challenge yourself with harder words", difficulty: "easy", requiredXP: 100, isActive: false, isCompleted: false, exercises: 10 },
    { id: 3, levelNumber: 3, name: "Multisyllabic Atoll", description: "Master words with multiple syllables", difficulty: "medium", requiredXP: 200, isActive: false, isCompleted: false, exercises: 10 },
    { id: 4, levelNumber: 4, name: "Complex Words Cay", description: "Navigate complex pronunciation challenges", difficulty: "medium", requiredXP: 300, isActive: false, isCompleted: false, exercises: 9 },
    { id: 5, levelNumber: 5, name: "Fun Phrases Bay", description: "Begin forming simple phrases", difficulty: "medium", requiredXP: 400, isActive: false, isCompleted: false, exercises: 10 },
    { id: 6, levelNumber: 6, name: "Expressive Phrases Peninsula", description: "Add emotion to your speech", difficulty: "medium", requiredXP: 500, isActive: false, isCompleted: false, exercises: 10 },
    { id: 7, levelNumber: 7, name: "Advanced Phrases Archipelago", description: "Master complex expressions", difficulty: "hard", requiredXP: 600, isActive: false, isCompleted: false, exercises: 10 },
    { id: 8, levelNumber: 8, name: "Simple Sentences Isle", description: "Form complete thoughts fluently", difficulty: "medium", requiredXP: 700, isActive: false, isCompleted: false, exercises: 10 },
    { id: 9, levelNumber: 9, name: "Creative Sentences Reef", description: "Express yourself with flair", difficulty: "hard", requiredXP: 800, isActive: false, isCompleted: false, exercises: 10 },
    { id: 10, levelNumber: 10, name: "Whimsical Sentences Lagoon", description: "Have fun with creative language", difficulty: "hard", requiredXP: 900, isActive: false, isCompleted: false, exercises: 10 },
  ]), []);

  const islandPositions = useMemo(() => {
    return [
      { x: 150, y: 150 },   // Island 1 - Starting point - centered higher
      { x: 400, y: 180 },   // Island 2 - centered higher
      { x: 650, y: 210 },   // Island 3 - centered higher
      { x: 900, y: 180 },   // Island 4 - centered higher
      { x: 1150, y: 150 },  // Island 5 - centered higher
      { x: 1400, y: 180 },  // Island 6 - centered higher
      { x: 1650, y: 210 },  // Island 7 - centered higher
      { x: 1900, y: 180 },  // Island 8 - centered higher
      { x: 2150, y: 150 },  // Island 9 - centered higher
      { x: 2400, y: 120 }   // Island 10 - centered higher
    ];
  }, []);

  const pathData = useMemo(() => {
    return `M${islandPositions[0].x},${islandPositions[0].y} ` +
      islandPositions.slice(1).map((p, i) => {
        const prev = islandPositions[i];
        const midX = (prev.x + p.x) / 2;
        const midY = (prev.y + p.y) / 2 - 30;
        return `Q${midX},${midY} ${p.x},${p.y}`;
      }).join(' ');
  }, [islandPositions]);

  // Function to log line segments
  useEffect(() => {
    const logLineSegments = () => {
      const segments = islandPositions.map((pos, i) => ({
        position: i + 1,
        coordinates: pos,
        nextIsland: i < islandPositions.length - 1 ? islandPositions[i + 1] : null
      }));
      console.log('Island positions:', segments);
    };
    logLineSegments();
  }, [islandPositions]);

  const getIslandPosition = (index: number) => islandPositions[index] || { x: 0, y: 0 };

  const getLevelStatus = (level: GameLevel) => {
    if (currentLevel?.id === level.id) return 'active';
    const completed = userExercises.filter(ex => ex.levelId === level.id && ex.isCompleted).length;
    const total = userExercises.filter(ex => ex.levelId === level.id).length;
    if (total > 0 && completed === total) return 'completed';
    if (completed > 0) return 'inProgress';
    return 'notStarted';
  };

  const handleLevelSelect = (levelId: number) => {
    soundManager.current.playSound('select');
    setActiveLevelId(levelId);
    const idx = islandLevels.findIndex(l => l.id === levelId);
    if (idx >= 0) {
      setSelectedIslandPosition(getIslandPosition(idx));
      setShowShip(true);
    }
    onSelectLevel(levelId);
  };

  useEffect(() => {
    if (!isInitialized) {
      soundManager.current.initialize();
      const onKey = (e: KeyboardEvent) => {
        const curIdx = islandLevels.findIndex(l => l.id === (activeLevelId ?? currentLevel?.id ?? 1));
        if (e.key === 'ArrowRight' && curIdx < islandLevels.length - 1) {
          handleLevelSelect(islandLevels[curIdx + 1].id);
        }
        if (e.key === 'ArrowLeft' && curIdx > 0) {
          handleLevelSelect(islandLevels[curIdx - 1].id);
        }
      };
      window.addEventListener('keydown', onKey);
      setIsInitialized(true);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [isInitialized, activeLevelId, currentLevel, islandLevels]);

  const handleIslandHover = () => {
    soundManager.current.playSound('hover');
  };

  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Update container position when scroll changes
  useEffect(() => {
    if (containerRef.current) {
      // We're mapping 0-100 to our actual scroll range (0 to -2400)
      const newX = Math.max(-2400, -scrollPosition * 24);
      containerRef.current.style.transform = `translate(${newX}px, 0px)`;
    }
  }, [scrollPosition]);
  
  // Map island position to scroll value for selection
  const scrollToIsland = (levelId: number) => {
    const idx = islandLevels.findIndex(l => l.id === levelId);
    if (idx >= 0) {
      const scrollValue = Math.min(100, Math.max(0, (idx * 12) + 5));
      setScrollPosition(scrollValue);
    }
  };
  
  // Make layout responsive based on screen size
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });
  
  // Update screen dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine map height based on screen size
  const mapHeight = useMemo(() => {
    // Use screen height for calculating the map size to maintain proportion
    const baseHeight = 700;
    if (screenSize.height < 800) {
      return Math.max(500, screenSize.height * 0.7); // Minimum 500px, maximum 70% of screen height
    }
    return baseHeight;
  }, [screenSize]);
  
  return (
    <div className="relative w-full overflow-hidden bg-blue-50" style={{ height: `${mapHeight}px` }}>
      <OceanBackground />

      {/* Horizontal Scroll Bar */}
      <div className="absolute left-4 right-4 bottom-6 z-20">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={scrollPosition} 
          onChange={(e) => {
            setScrollPosition(parseInt(e.target.value));
            soundManager.current.playSound('drag');
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-blue-300 accent-blue-600"
        />
        <div className="flex justify-between text-xs text-blue-700 mt-1 px-2">
          <span>Island 1</span>
          <span>Island 10</span>
        </div>
      </div>

      <Draggable
        nodeRef={containerRef}
        bounds={{ left: -2000, top: -200, right: 0, bottom: 200 }}
        onStart={() => { setIsDragging(true); soundManager.current.playSound('drag'); }}
        onStop={() => setIsDragging(false)}
      >
        <div
          ref={containerRef}
          className="absolute top-1/2 -translate-y-1/2"
          style={{ 
            width: 2600, 
            height: Math.max(600, mapHeight + 100), 
            touchAction: 'none'
          }}
        >
          {islandLevels.map((level, idx) => {
            const pos = getIslandPosition(idx);
            return (
              <Island
                key={level.id}
                level={level}
                status={getLevelStatus(level)}
                position={pos}
                onSelect={() => handleLevelSelect(level.id)}
                onHover={handleIslandHover}
                isActive={level.id === (activeLevelId ?? currentLevel?.id)}
              />
            );
          })}

          <svg className="absolute inset-0 z-0 pointer-events-none" width={2600} height={800}>
            <path
              d={pathData}
              fill="none"
              stroke="#2C5282"
              strokeWidth="6"
              strokeDasharray="12,12"
              strokeLinecap="round"
              className="animate-dash"
            />
            {islandPositions.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#90CDF4"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: [0.3, 0.9, 0.3], y: [0, -8, 0] }}
                transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </svg>
        </div>
      </Draggable>

      {showShip && selectedIslandPosition && (
        <PirateShip
          targetIslandPosition={selectedIslandPosition}
          isActive
          onArrival={() => soundManager.current.playSound('transition')}
        />
      )}

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
