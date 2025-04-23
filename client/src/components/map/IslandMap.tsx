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
    { id: 1, levelNumber: 1, name: "Mixed Easy Words Island", difficulty: "easy", requiredXP: 0, isActive: true, isCompleted: false, exercises: 10 },
    { id: 2, levelNumber: 2, name: "Trickier Words Isle", difficulty: "easy", requiredXP: 100, isActive: false, isCompleted: false, exercises: 10 },
    { id: 3, levelNumber: 3, name: "Multisyllabic Atoll", difficulty: "medium", requiredXP: 200, isActive: false, isCompleted: false, exercises: 10 },
    { id: 4, levelNumber: 4, name: "Complex Words Cay", difficulty: "medium", requiredXP: 300, isActive: false, isCompleted: false, exercises: 9 },
    { id: 5, levelNumber: 5, name: "Fun Phrases Bay", difficulty: "medium", requiredXP: 400, isActive: false, isCompleted: false, exercises: 10 },
    { id: 6, levelNumber: 6, name: "Expressive Phrases Peninsula", difficulty: "medium", requiredXP: 500, isActive: false, isCompleted: false, exercises: 10 },
    { id: 7, levelNumber: 7, name: "Advanced Phrases Archipelago", difficulty: "hard", requiredXP: 600, isActive: false, isCompleted: false, exercises: 10 },
    { id: 8, levelNumber: 8, name: "Simple Sentences Isle", difficulty: "medium", requiredXP: 700, isActive: false, isCompleted: false, exercises: 10 },
    { id: 9, levelNumber: 9, name: "Creative Sentences Reef", difficulty: "hard", requiredXP: 800, isActive: false, isCompleted: false, exercises: 10 },
    { id: 10, levelNumber: 10, name: "Whimsical Sentences Lagoon", difficulty: "hard", requiredXP: 900, isActive: false, isCompleted: false, exercises: 10 },
  ]), []);

  const islandPositions = useMemo(() => {
    return [
      { x: 150, y: 250 },   // Island 1 - Starting point
      { x: 400, y: 300 },   // Island 2
      { x: 650, y: 350 },   // Island 3
      { x: 900, y: 300 },   // Island 4
      { x: 1150, y: 250 },  // Island 5
      { x: 1400, y: 300 },  // Island 6
      { x: 1650, y: 350 },  // Island 7
      { x: 1900, y: 300 },  // Island 8 - Moved right
      { x: 2150, y: 250 },  // Island 9 - Moved right
      { x: 2400, y: 200 }   // Island 10 - Moved right
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

  return (
    <div className="relative w-full h-[700px] overflow-hidden bg-blue-50">
      <OceanBackground />

      {/* Left scroll arrow */}
      <button
        className="absolute left-4 bottom-4 z-20 bg-blue-500/80 hover:bg-blue-600/80 text-white rounded-full p-3 transition-all"
        onClick={() => {
          if (containerRef.current) {
            const currentX = parseInt(containerRef.current.style.transform.replace(/[^\d-]/g, '') || '0');
            const newX = Math.min(-150, currentX + 700); // Move right by 700px, but keep island 1 visible
            containerRef.current.style.transform = `translate(${newX}px, 0px)`;
          }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Right scroll arrow */}
      <button
        className="absolute right-4 bottom-4 z-20 bg-blue-500/80 hover:bg-blue-600/80 text-white rounded-full p-3 transition-all"
        onClick={() => {
          if (containerRef.current) {
            const currentX = parseInt(containerRef.current.style.transform.replace(/[^\d-]/g, '') || '0');
            const newX = Math.max(-2000, currentX - 700); // Move left by 700px
            containerRef.current.style.transform = `translate(${newX}px, 0px)`;
          }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <Draggable
        nodeRef={containerRef}
        bounds={{ left: -2000, top: -200, right: 0, bottom: 200 }}
        onStart={() => { setIsDragging(true); soundManager.current.playSound('drag'); }}
        onStop={() => setIsDragging(false)}
      >
        <div
          ref={containerRef}
          className="absolute top-20"
          style={{ width: 2600, height: 800, touchAction: 'none' }}
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
