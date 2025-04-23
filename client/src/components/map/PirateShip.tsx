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
  const initialPosition = { x: -100, y: 300 }; // Starting from left of island 1
  const [currentPosition, setCurrentPosition] = useState<Position>(initialPosition);
  const [hasArrived, setHasArrived] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showWaterRipples, setShowWaterRipples] = useState(true);

  useEffect(() => {
    // Always show water ripples around the initial position when not moving to island
    if (!isMoving && !hasArrived) {
      setCurrentPosition(initialPosition);
      setShowWaterRipples(true);
    }
  }, [isMoving, hasArrived]);

  useEffect(() => {
    if (targetIslandPosition && isActive) {
      // Calculate ship position just off the coast of the island (slightly above it)
      const shipDockPosition = {
        x: targetIslandPosition.x,
        y: targetIslandPosition.y - 70
      };

      // Start movement animation
      setIsMoving(true);
      setHasArrived(false);
      
      // Play sail sound as ship starts moving
      try {
        const sailSound = new Audio('/sounds/sail.mp3');
        sailSound.volume = 0.3;
        sailSound.play().catch(err => console.log("Unable to play sail sound"));
      } catch (err) {
        console.log("Error playing sail sound");
      }
      
      // Simulate ship arriving at island after a delay
      const timer = setTimeout(() => {
        setCurrentPosition(shipDockPosition);
        
        // Ship horn sound after arrival
        const arrivalTimer = setTimeout(() => {
          setHasArrived(true);
          setIsMoving(false);
          setShowWaterRipples(false);
          if (onArrival) onArrival();
          
          // Play ship horn sound
          try {
            const horn = new Audio('/sounds/ship-horn.mp3');
            horn.volume = 0.4;
            horn.play().catch(err => {
              console.log("Unable to play ship horn sound. Using fallback.");
              try {
                // Use a simple beep as fallback
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.value = 800; // Higher pitch for a horn
                gainNode.gain.value = 0.1;
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start();
                setTimeout(() => oscillator.stop(), 800);
              } catch (e) {
                console.log("Fallback sound also failed");
              }
            });
          } catch (err) {
            console.log("Error playing ship horn sound");
          }
        }, 1000);
        
        return () => clearTimeout(arrivalTimer);
      }, 2000);
      
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
      initial={{ x: initialPosition.x - 40, y: initialPosition.y - 40 }}
      animate={{
        x: currentPosition.x - 40,
        y: currentPosition.y - 40,
        rotate: isMoving ? [0, -5, 5, 0] : 0
      }}
      transition={{
        type: "tween",
        duration: 2,
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