import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameLevel } from '@/lib/types';
import { Island } from './Island';
import { OceanBackground } from './OceanBackground';
import { SoundManager } from './SoundManager';
import './islandMap.css';

interface IslandMapProps {
  onSelectLevel: (levelId: number) => void;
}

export function IslandMap({ onSelectLevel }: IslandMapProps) {
  const { currentLevel, userExercises } = useGame();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  const soundManager = useRef<SoundManager>(new SoundManager());

  // Generate levels for islands A through X (24 islands)
  const islandLevels: GameLevel[] = useMemo(() => {
    const levels: GameLevel[] = [];
    // Generate letter-themed levels (A through X - 24 levels)
    for (let i = 1; i <= 24; i++) {
      const letter = String.fromCharCode(64 + i); // Convert to uppercase letter (A=1, B=2, etc.)
      levels.push({
        id: i,
        levelNumber: i,
        name: `Letter ${letter} Island`,
        description: `Practice words that start with the letter ${letter}`,
        difficulty: i <= 8 ? "easy" : (i <= 16 ? "medium" : "hard"),
        requiredXP: (i - 1) * 100,
        isActive: i === 1,
        isCompleted: false,
        exercises: 10 // Each level has 10 exercises
      });
    }
    return levels;
  }, []);

  const islandPositions = useMemo(() => {
    // Create a 6x4 grid layout for islands A through X (24 islands)
    const positions = [];
    const gridRows = 6;
    const gridCols = 4;
    const baseX = 180; // Starting X position
    const baseY = 150; // Starting Y position
    const colSpacing = 300; // Horizontal spacing between islands
    const rowSpacing = 250; // Vertical spacing between rows
    
    // Generate positions for all islands in a grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;
        if (index < 24) { // Ensure we only create 24 islands (A-X)
          // Add slight variations to positions to make the layout more natural
          const variationX = Math.sin(index * 0.7) * 20;
          const variationY = Math.cos(index * 0.5) * 15;
          
          positions.push({
            x: baseX + (col * colSpacing) + variationX,
            y: baseY + (row * rowSpacing) + variationY
          });
        }
      }
    }
    
    return positions;
  }, []);

  const pathData = useMemo(() => {
    // Create a path that connects islands in each row left to right, then continues to next row
    let path = `M${islandPositions[0].x},${islandPositions[0].y}`;
    
    for (let i = 1; i < islandPositions.length; i++) {
      const prev = islandPositions[i-1];
      const current = islandPositions[i];
      
      // Check if we're moving to a new row (every 4 islands)
      if (i % 4 === 0 && i > 0) {
        // Connect last island of previous row to first island of next row
        const lastInRow = islandPositions[i-1];
        const firstInNextRow = current;
        
        // Create a diagonal curve between rows
        const controlX = (lastInRow.x + firstInNextRow.x) / 2;
        const controlY = (lastInRow.y + firstInNextRow.y) / 2 + 30;
        
        path += ` Q${controlX},${controlY} ${firstInNextRow.x},${firstInNextRow.y}`;
      } else {
        // Normal path within a row
        const midX = (prev.x + current.x) / 2;
        const midY = (prev.y + current.y) / 2 - 10;
        path += ` Q${midX},${midY} ${current.x},${current.y}`;
      }
    }
    
    return path;
  }, [islandPositions]);

  // Initialize sound manager
  useEffect(() => {
    soundManager.current.initialize();
    setIsInitialized(true);
  }, []);

  // Handle level selection with visual feedback
  const handleLevelSelect = (levelId: number) => {
    setActiveLevelId(levelId);
    soundManager.current.playSound('select');
    
    // Delay before calling the parent handler for transition effect
    setTimeout(() => {
      onSelectLevel(levelId);
      setActiveLevelId(null);
    }, 500);
  };

  const handleIslandHover = () => {
    soundManager.current.playSound('hover');
  };

  // Get status for level display
  const getLevelStatus = (level: GameLevel): 'active' | 'completed' | 'inProgress' | 'notStarted' | 'locked' => {
    // Currently selected level is active
    if (level.id === activeLevelId) return 'active';
    
    // Current user's active level is 'active'
    if (currentLevel && level.id === currentLevel.id) return 'active';
    
    // Levels that are complete (all exercises finished)
    const levelExercises = userExercises.filter(ex => ex.levelId === level.id);
    if (levelExercises.length > 0 && levelExercises.every(ex => ex.completed)) return 'completed';
    
    // Levels with some progress
    if (levelExercises.length > 0) return 'inProgress';
    
    // Lock levels more than 2 ahead of current level
    if (currentLevel && level.levelNumber > currentLevel.levelNumber + 2) return 'locked';
    
    // Default to not started
    return 'notStarted';
  };

  const getIslandPosition = (index: number) => islandPositions[index] || { x: 0, y: 0 };
  
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
    const baseHeight = 1800; // Increased height for vertical scrolling of 6 rows
    if (screenSize.height < 800) {
      return Math.max(1600, screenSize.height * 2); // Adjusted for vertical scrolling
    }
    return baseHeight;
  }, [screenSize]);
  
  return (
    <div className="relative w-full overflow-hidden bg-blue-50" style={{ maxHeight: `${screenSize.height * 0.8}px` }}>
      <OceanBackground />

      {/* Vertical scroll container */}
      <div 
        className="map-vertical-scroll relative w-full" 
        style={{ height: `${screenSize.height * 0.7}px`, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <div
          ref={containerRef}
          className="relative min-h-full"
          style={{ 
            width: '100%', 
            height: mapHeight,
            position: 'relative'
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

          <svg className="absolute inset-0 z-0 pointer-events-none" width="100%" height="100%">
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
      </div>

      <motion.div
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/70 rounded-lg px-4 py-2 text-sm text-blue-900 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        Scroll to explore islands • Tap islands to select levels
      </motion.div>
    </div>
  );
}