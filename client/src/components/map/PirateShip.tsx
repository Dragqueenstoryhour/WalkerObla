import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type Position = {
  x: number;
  y: number;
};

interface PirateShipProps {
  targetIslandPosition: Position | null;
  isActive: boolean;
  onArrival?: () => void;
}

export function PirateShip({ targetIslandPosition, isActive, onArrival }: PirateShipProps) {
  const [currentPosition, setCurrentPosition] = useState<Position>({ x: 400, y: -50 });
  const [hasArrived, setHasArrived] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (targetIslandPosition && isActive) {
      // Calculate ship position just off the coast of the island (slightly above it)
      const shipDockPosition = {
        x: targetIslandPosition.x,
        y: targetIslandPosition.y - 70
      };

      // Start movement animation
      setCurrentPosition({ x: currentPosition.x, y: currentPosition.y });
      setIsMoving(true);
      setHasArrived(false);
      
      // Simulate ship arriving at island after a delay
      const timer = setTimeout(() => {
        setCurrentPosition(shipDockPosition);
        
        // Ship horn sound after arrival
        const arrivalTimer = setTimeout(() => {
          setHasArrived(true);
          setIsMoving(false);
          if (onArrival) onArrival();
          
          // Play ship horn sound
          try {
            const horn = new Audio('/sounds/ship-horn.mp3');
            horn.volume = 0.4;
            horn.play().catch(err => {
              console.log("Unable to play ship horn sound. Fallback to browser alert sound.");
              try {
                const fallbackSound = new Audio('data:audio/wav;base64,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');
                fallbackSound.play();
              } catch (e) {
                console.log("Fallback sound also failed");
              }
            });
          } catch (err) {
            console.log("Error playing ship horn sound");
          }
        }, 1000);
        
        return () => clearTimeout(arrivalTimer);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [targetIslandPosition, isActive, onArrival]);

  return (
    <motion.div
      className="absolute z-10"
      style={{
        width: 80,
        height: 80,
        x: currentPosition.x - 40, // Center ship on x position
        y: currentPosition.y - 40, // Center ship on y position
      }}
      animate={{
        x: currentPosition.x - 40,
        y: currentPosition.y - 40,
        rotate: isMoving ? [0, -5, 5, 0] : 0
      }}
      transition={{
        type: "tween",
        duration: 1.5,
        rotate: {
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut"
        }
      }}
    >
      {/* Pirate Ship SVG */}
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        className={`${isMoving ? 'animate-bounce-gentle' : ''}`}
      >
        {/* Ship hull */}
        <path
          d="M20,70 Q50,90 80,70 L80,55 L20,55 Z"
          fill="#8B4513"
          stroke="#3E2723"
          strokeWidth="2"
        />
        
        {/* Ship mast */}
        <rect x="48" y="20" width="4" height="40" fill="#5D4037" />
        
        {/* Ship sail */}
        <path
          d="M50,20 L70,30 L70,55 L50,55 Z"
          fill="#ECEFF1"
          stroke="#B0BEC5"
          strokeWidth="1"
        />
        
        {/* Pirate flag */}
        <rect x="46" y="15" width="8" height="6" fill="#000" />
        <circle cx="50" cy="18" r="1" fill="#FFF" />
        <path d="M48,18 L52,18" stroke="#FFF" strokeWidth="0.5" />
        
        {/* Cannon ports */}
        <rect x="25" y="60" width="5" height="3" fill="#263238" />
        <rect x="40" y="60" width="5" height="3" fill="#263238" />
        <rect x="55" y="60" width="5" height="3" fill="#263238" />
        <rect x="70" y="60" width="5" height="3" fill="#263238" />
        
        {/* Water splash effect when moving */}
        {isMoving && (
          <>
            <path
              d="M15,70 Q20,75 25,70 Q30,65 35,70"
              fill="none"
              stroke="#64B5F6"
              strokeWidth="2"
              strokeDasharray="3,2"
              className="animate-wave"
            />
            <path
              d="M65,70 Q70,75 75,70 Q80,65 85,70"
              fill="none"
              stroke="#64B5F6"
              strokeWidth="2"
              strokeDasharray="3,2"
              className="animate-wave"
            />
          </>
        )}
        
        {/* Ship horn animation */}
        {hasArrived && (
          <>
            <circle
              cx="70"
              cy="40"
              r="10"
              fill="rgba(255,255,255,0.6)"
              className="animate-ping"
            />
            <circle
              cx="70"
              cy="40"
              r="5"
              fill="rgba(255,255,255,0.8)"
              className="animate-ping"
              style={{ animationDelay: "0.2s" }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}