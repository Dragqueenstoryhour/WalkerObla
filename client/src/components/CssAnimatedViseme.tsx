import React, { useEffect, useRef, useState } from 'react';
import { VISEME_DESCRIPTIONS } from './FacialAnimation';

interface VisemeFrame {
  time: number;      // Time in seconds
  visemeId: number;  // Azure viseme ID (0-21)
  svg?: string;      // SVG content
}

interface CssAnimatedVisemeProps {
  frames: VisemeFrame[];
  playing: boolean;
  onEnd?: () => void;
  width?: number;
  height?: number;
}

export function CssAnimatedViseme({ 
  frames, 
  playing, 
  onEnd, 
  width = 200, 
  height = 200 
}: CssAnimatedVisemeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Set up the animation when frames change or playing state changes
  useEffect(() => {
    if (!frames.length || !containerRef.current) return;
    
    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    // Create a container for the face elements (that won't change)
    const faceContainer = document.createElement('div');
    faceContainer.className = 'face-container';
    faceContainer.style.position = 'absolute';
    faceContainer.style.top = '0';
    faceContainer.style.left = '0';
    faceContainer.style.width = '100%';
    faceContainer.style.height = '100%';
    
    // Add face outline SVG (this stays consistent)
    faceContainer.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="100%" height="100%">
        <rect width="100%" height="100%" fill="none" />
        <ellipse cx="65" cy="65" rx="45" ry="55" stroke="black" stroke-width="1.5" fill="none" />
        <circle cx="48" cy="50" r="3" fill="black" /> <!-- left eye -->
        <circle cx="82" cy="50" r="3" fill="black" /> <!-- right eye -->
        <path d="M65,42 L65,55 M55,95 Q65,100 75,95" stroke="black" stroke-width="1" fill="none" /> <!-- nose and chin -->
      </svg>
    `;
    
    containerRef.current.appendChild(faceContainer);
    
    // Create a container for the mouth animations
    const mouthContainer = document.createElement('div');
    mouthContainer.className = 'mouth-container';
    mouthContainer.style.position = 'absolute';
    mouthContainer.style.top = '0';
    mouthContainer.style.left = '0';
    mouthContainer.style.width = '100%';
    mouthContainer.style.height = '100%';
    containerRef.current.appendChild(mouthContainer);
    
    // Create each viseme mouth shape and position it with CSS animation
    frames.forEach((frame, index) => {
      // Create div for this viseme frame
      const visemeElement = document.createElement('div');
      visemeElement.className = `viseme-frame viseme-${frame.visemeId}`;
      visemeElement.style.position = 'absolute';
      visemeElement.style.top = '0';
      visemeElement.style.left = '0';
      visemeElement.style.width = '100%';
      visemeElement.style.height = '100%';
      visemeElement.style.opacity = '0'; // Start hidden
      
      // Add the mouth shape SVG for this viseme
      if (frame.svg) {
        visemeElement.innerHTML = frame.svg;
      } else {
        // Fallback to predefined SVG shape based on viseme ID
        visemeElement.innerHTML = generateVisemeSvg(frame.visemeId);
      }
      
      // Add to container
      mouthContainer.appendChild(visemeElement);
      
      // Add CSS animation for timing
      const isLastFrame = index === frames.length - 1;
      const nextFrameTime = isLastFrame ? 
        frame.time + 0.5 : // Last frame stays visible for half a second
        frames[index + 1].time;
      
      const animationDuration = nextFrameTime - frame.time;
      
      // Set animation properties for proper timing
      visemeElement.style.animation = `viseme-fade ${animationDuration}s forwards`;
      visemeElement.style.animationDelay = `${frame.time}s`;
      
      // For the last frame, trigger onEnd callback when animation completes
      if (isLastFrame && onEnd) {
        visemeElement.addEventListener('animationend', onEnd);
      }
    });
    
    // Add the animation keyframes style
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes viseme-fade {
        0% { opacity: 1; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Set the animation play state based on playing prop
    setPlayState(playing);
    
    // Mark as initialized
    setInitialized(true);
    
    // Cleanup function
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [frames]);
  
  // Update play state when playing prop changes
  useEffect(() => {
    if (initialized) {
      setPlayState(playing);
    }
  }, [playing, initialized]);
  
  // Helper function to set play state for all animations
  const setPlayState = (isPlaying: boolean) => {
    if (!containerRef.current) return;
    
    const visemeElements = containerRef.current.querySelectorAll('.viseme-frame');
    visemeElements.forEach(element => {
      (element as HTMLElement).style.animationPlayState = isPlaying ? 'running' : 'paused';
    });
  };
  
  return (
    <div 
      ref={containerRef} 
      className="css-animated-viseme"
      style={{ 
        position: 'relative', 
        width: `${width}px`, 
        height: `${height}px`,
        overflow: 'hidden'
      }}
    />
  );
}

// Function to generate SVG for a specific viseme ID
function generateVisemeSvg(visemeId: number): string {
  // Define mouth shapes for each viseme ID (0-21)
  const visemePaths = [
    // 0: Silence - closed mouth
    `<path d="M45,70 Q65,72 85,70" stroke="black" stroke-width="2" fill="none" />`,
    
    // 1: æ, ə, ʌ - as in "bat", "about", "cut"
    `<path d="M45,65 Q65,75 85,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 2: ɑ - as in "father" - wide open mouth
    `<path d="M45,60 Q65,85 85,60" stroke="black" stroke-width="2" fill="none" />`,
    
    // 3: ɔ - as in "dog" - rounded open mouth 
    `<path d="M50,65 Q65,78 80,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 4: ɛ, ʊ - as in "pet", "book"
    `<path d="M45,65 Q65,72 85,65" stroke="black" stroke-width="2" fill="none" />`,
    
    // 5: ɝ - as in "bird"
    `<path d="M50,68 Q65,75 80,68" stroke="black" stroke-width="2" fill="none" />`,
    
    // 6: j, i, ɪ - as in "yes", "see", "sit" - slight smile
    `<path d="M45,68 Q65,72 85,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M45,68 C50,65 80,65 85,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 7: w, u - as in "we", "blue" - pursed lips
    `<circle cx="65" cy="70" r="5" stroke="black" stroke-width="2" fill="none" />`,
    
    // 8: o - as in "show" - rounded o shape
    `<circle cx="65" cy="70" r="8" stroke="black" stroke-width="2" fill="none" />`,
    
    // 9: aʊ - as in "how" - larger rounded shape
    `<circle cx="65" cy="70" r="12" stroke="black" stroke-width="2" fill="none" />`,
    
    // 10: ɔɪ - as in "boy" - transition from o to y
    `<path d="M50,65 Q65,75 80,65" stroke="black" stroke-width="2" fill="none" />
     <path d="M55,65 C60,63 70,63 75,65" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 11: aɪ - as in "fly" - transition from a to y
    `<path d="M45,65 Q65,75 85,65" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,65 C55,63 75,63 80,65" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 12: h - as in "help" - slight opening
    `<path d="M50,68 Q65,73 80,68" stroke="black" stroke-width="2" fill="none" />`,
    
    // 13: ɹ - as in "red" - rounded with slight protrusion
    `<path d="M55,68 Q65,73 75,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,68 Q65,73 70,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 14: l - as in "look" - tongue against upper palate
    `<path d="M50,68 Q65,72 80,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M58,68 H72" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,68 L65,73" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 15: s, z - as in "say", "zoo" - teeth almost closed
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,69 L80,69" stroke="black" stroke-width="1" stroke-dasharray="2,1" fill="none" />`,
    
    // 16: ʃ, tʃ, dʒ, ʒ - as in "show", "cheese", "judge" - rounded pursed
    `<path d="M55,68 Q65,72 75,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,68 Q65,71 70,68" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 17: ð - as in "then" - tongue between teeth
    `<path d="M50,69 Q65,70 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M58,69 L72,69" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,69 L65,74" stroke="black" stroke-width="2" fill="none" />`,
    
    // 18: f, v - as in "fan", "van" - lower lip against upper teeth
    `<path d="M50,68 Q65,70 80,68" stroke="black" stroke-width="2" fill="none" />
     <path d="M50,65 L80,65" stroke="black" stroke-width="1" stroke-dasharray="2,1" fill="none" />
     <path d="M55,68 H75" stroke="black" stroke-width="1.5" fill="none" />`,
    
    // 19: d, t, n, θ - as in "did", "talk", "now", "thin"
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M60,69 L70,69" stroke="black" stroke-width="1" fill="none" />
     <path d="M65,66 L65,69" stroke="black" stroke-width="1" fill="none" />`,
    
    // 20: k, g, ŋ - as in "cat", "guest", "sing" - back of tongue against palate
    `<path d="M50,69 Q65,71 80,69" stroke="black" stroke-width="2" fill="none" />
     <path d="M55,69 C60,66 70,66 75,69" stroke="black" stroke-width="1" fill="none" />`,
    
    // 21: p, b, m - as in "put", "big", "mat" - lips pressed together
    `<path d="M50,70 L80,70" stroke="black" stroke-width="2.5" fill="none" />`,
  ];
  
  // Return the SVG with the appropriate mouth shape
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="100%" height="100%">
    <rect width="100%" height="100%" fill="none" />
    ${visemePaths[visemeId] || visemePaths[0]}
  </svg>`;
}