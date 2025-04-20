import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palmtree, Star, Award, Lock, Flag } from 'lucide-react';
import { GameLevel } from '@/lib/types';

interface IslandProps {
  level: GameLevel;
  status: 'active' | 'completed' | 'inProgress' | 'notStarted' | 'locked';
  position: { x: number; y: number };
  onSelect: () => void;
  onHover: () => void;
  isActive: boolean;
}

export function Island({ level, status, position, onSelect, onHover, isActive }: IslandProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pixiContainer = useRef<HTMLDivElement>(null);
  
  // Determine island size based on level difficulty
  const getIslandSize = () => {
    switch (level.difficulty) {
      case 'hard': return { width: 180, height: 120 };
      case 'medium': return { width: 160, height: 100 };
      default: return { width: 140, height: 80 };
    }
  };
  
  // Determine island color based on status
  const getIslandColor = () => {
    switch (status) {
      case 'completed': return '#10B981'; // Green for completed
      case 'active': return '#3B82F6';    // Blue for active
      case 'inProgress': return '#F59E0B'; // Yellow for in progress
      case 'locked': return '#6B7280';    // Gray for locked
      default: return '#60A5FA';          // Default blue shade
    }
  };
  
  // Island SVG paths for different island shapes
  const islandPaths = [
    // Small rounded island
    "M10,50 Q20,35 40,40 Q60,42 70,35 Q85,25 100,30 Q120,40 130,35 Q140,30 150,40 Q160,55 150,70 Q130,85 100,80 Q70,85 50,75 Q20,70 10,50 Z",
    // Medium island with cove
    "M10,50 Q15,30 40,25 Q60,22 80,15 Q100,10 120,15 Q140,25 155,20 Q170,25 175,45 Q180,65 170,80 Q155,90 140,85 Q130,95 110,100 Q80,105 60,95 Q30,85 20,70 Q10,60 10,50 Z",
    // Larger island with multiple bays
    "M10,60 Q5,40 20,30 Q35,15 60,10 Q90,5 120,10 Q145,20 170,10 Q190,15 200,35 Q205,55 190,80 Q175,100 145,105 Q120,115 90,110 Q50,105 25,90 Q10,75 10,60 Z"
  ];
  
  // Select island path based on level
  const islandPath = islandPaths[Math.min(2, Math.floor((level.levelNumber - 1) / 2))];
  const size = getIslandSize();
  const color = getIslandColor();
  
  // Animation variants for island
  const islandVariants = {
    idle: { 
      y: [0, -5, 0],
      transition: { 
        y: { repeat: Infinity, duration: 3 + (level.levelNumber % 3), ease: "easeInOut" }
      }
    },
    active: {
      scale: [1, 1.05, 1],
      boxShadow: ['0 0 0px rgba(59, 130, 246, 0)', '0 0 20px rgba(59, 130, 246, 0.6)', '0 0 0px rgba(59, 130, 246, 0)'],
      transition: { 
        repeat: Infinity, 
        duration: 2
      }
    },
    hover: { 
      scale: 1.1,
      y: -10,
      transition: { type: 'spring', stiffness: 300, damping: 10 }
    },
    tap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };
  
  return (
    <motion.div
      className="absolute"
      style={{ 
        left: position.x, 
        top: position.y, 
        width: size.width, 
        height: size.height,
        zIndex: isActive || isHovered ? 10 : 1
      }}
      animate={isActive ? "active" : "idle"}
      variants={islandVariants}
      whileHover="hover"
      whileTap={status !== 'locked' ? "tap" : undefined}
      onHoverStart={() => {
        setIsHovered(true);
        onHover();
      }}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => status !== 'locked' && onSelect()}
    >
      {/* Island SVG Shape */}
      <svg 
        width={size.width} 
        height={size.height} 
        viewBox="0 0 200 120" 
        className="absolute pointer-events-none"
      >
        {/* Island shadow */}
        <path 
          d={islandPath} 
          fill="rgba(0,0,0,0.2)" 
          transform="translate(5, 8)" 
        />
        
        {/* Island base */}
        <path 
          d={islandPath} 
          fill={color} 
        />
        
        {/* Island highlight/sand edges */}
        <path 
          d={islandPath} 
          fill="none" 
          stroke="#F9FAFB" 
          strokeWidth="3" 
          strokeOpacity="0.6" 
          strokeDasharray="2,5" 
        />
        
        {/* Island details (dots for sand/vegetation) */}
        {Array.from({ length: 10 }).map((_, i) => (
          <circle 
            key={i} 
            cx={40 + (i * 15) % 140} 
            cy={30 + (i * 7) % 60} 
            r="1.5" 
            fill={status === 'locked' ? "#9CA3AF" : "#064E3B"} 
            opacity="0.6" 
          />
        ))}
      </svg>
      
      {/* Island decorations */}
      <div className="absolute inset-0">
        {/* Palm trees */}
        <motion.div
          className="absolute"
          style={{ top: '10%', left: '15%' }}
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Palmtree 
            size={status === 'locked' ? 16 : 20} 
            className={status === 'locked' ? "text-gray-500" : "text-green-800"} 
          />
        </motion.div>
        
        <motion.div
          className="absolute"
          style={{ top: '5%', right: '20%' }}
          animate={{ rotate: [3, -3, 3] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          <Palmtree 
            size={status === 'locked' ? 14 : 18} 
            className={status === 'locked' ? "text-gray-500" : "text-green-800"} 
          />
        </motion.div>
        
        {/* Level number or lock in the center of island */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className={`
            flex items-center justify-center 
            w-12 h-12 rounded-full
            ${status === 'locked' 
              ? 'bg-gray-300 border-gray-400' 
              : 'bg-white shadow-md border-2 border-blue-100'}
          `}>
            {status === 'locked' ? (
              <Lock size={18} className="text-gray-500" />
            ) : (
              <span className={`
                text-xl font-bold
                ${status === 'active' ? 'text-blue-600' :
                status === 'completed' ? 'text-green-600' :
                status === 'inProgress' ? 'text-amber-600' :
                'text-blue-500'}
              `}>
                {level.levelNumber}
              </span>
            )}
          </div>
        </div>
        
        {/* Achievements flag for completed islands */}
        {status === 'completed' && (
          <motion.div
            className="absolute"
            style={{ top: '-5%', right: '10%' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <div className="bg-green-100 rounded-full p-1.5 shadow-md border border-green-200">
              <Flag size={14} className="text-green-700" />
            </div>
          </motion.div>
        )}
        
        {/* Beach area */}
        <div 
          className="absolute" 
          style={{ 
            bottom: '20%', 
            left: '20%', 
            width: '30%', 
            height: '10%', 
            background: status === 'locked' ? '#D1D5DB' : '#FBBF24', 
            borderRadius: '100%',
            transform: 'scaleY(0.3) rotate(-10deg)',
            opacity: 0.6
          }}
        />
      </div>
      
      {/* Level label on hover */}
      <motion.div
        className="absolute left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg text-sm whitespace-nowrap z-20"
        style={{ bottom: -30 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: isHovered || isActive ? 1 : 0, y: isHovered || isActive ? 0 : -10 }}
        transition={{ duration: 0.2 }}
      >
        <span className={`font-medium ${status === 'locked' ? 'text-gray-500' : 'text-blue-800'}`}>
          {level.name}
        </span>
      </motion.div>
      
      {/* PIXI.js container for additional effects */}
      <div ref={pixiContainer} className="absolute inset-0 pointer-events-none"></div>
    </motion.div>
  );
}