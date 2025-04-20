import { useState } from 'react';
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

  const isLocked = status === 'locked';
  
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
      whileTap={!isLocked ? "tap" : undefined}
      onHoverStart={() => {
        setIsHovered(true);
        onHover();
      }}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => !isLocked && onSelect()}
    >
      {/* Island SVG Shape */}
      <svg 
        width={size.width} 
        height={size.height} 
        viewBox="0 0 200 120" 
        className="absolute pointer-events-none"
      >
        {/* Island shadow */}
        <ellipse 
          cx="100" 
          cy="70" 
          rx="70" 
          ry="40" 
          fill="rgba(0,0,0,0.2)" 
          transform="translate(5, 8)" 
        />
        
        {/* Island base */}
        <ellipse 
          cx="100" 
          cy="70" 
          rx="70" 
          ry="40" 
          fill={color} 
        />
        
        {/* Island highlight/sand edges */}
        <ellipse 
          cx="100" 
          cy="70" 
          rx="70" 
          ry="40" 
          fill="none" 
          stroke="#F9FAFB" 
          strokeWidth="3" 
          strokeOpacity="0.6" 
          strokeDasharray="2,5" 
        />
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
            size={isLocked ? 16 : 20} 
            className={isLocked ? "text-gray-500" : "text-green-800"} 
          />
        </motion.div>
        
        <motion.div
          className="absolute"
          style={{ top: '5%', right: '20%' }}
          animate={{ rotate: [3, -3, 3] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          <Palmtree 
            size={isLocked ? 14 : 18} 
            className={isLocked ? "text-gray-500" : "text-green-800"} 
          />
        </motion.div>
        
        {/* Level number or lock in the center of island */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className={`
            flex items-center justify-center 
            w-12 h-12 rounded-full
            ${isLocked
              ? 'bg-gray-300 border-gray-400' 
              : 'bg-white shadow-md border-2 border-blue-100'}
          `}>
            {isLocked ? (
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
            background: isLocked ? '#D1D5DB' : '#FBBF24', 
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
        <span className={`font-medium ${isLocked ? 'text-gray-500' : 'text-blue-800'}`}>
          {level.name}
        </span>
      </motion.div>
    </motion.div>
  );
}