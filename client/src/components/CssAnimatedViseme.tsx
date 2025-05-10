import React, { useEffect, useRef, useState } from 'react';
import { VISEME_DESCRIPTIONS } from './FacialAnimation';

// We'll use the file paths without import
const visemeImagePaths = [
  '/assets/Visemes/viseme-id-0.jpg',
  '/assets/Visemes/viseme-id-1.jpg',
  '/assets/Visemes/viseme-id-2.jpg',
  '/assets/Visemes/viseme-id-3.jpg',
  '/assets/Visemes/viseme-id-4.jpg',
  '/assets/Visemes/viseme-id-5.jpg',
  '/assets/Visemes/viseme-id-6.jpg',
  '/assets/Visemes/viseme-id-7.jpg',
  '/assets/Visemes/viseme-id-8.jpg',
  '/assets/Visemes/viseme-id-9.jpg',
  '/assets/Visemes/viseme-id-10.jpg',
  '/assets/Visemes/viseme-id-11.jpg',
  '/assets/Visemes/viseme-id-12.jpg',
  '/assets/Visemes/viseme-id-13.jpg',
  '/assets/Visemes/viseme-id-14.jpg',
  '/assets/Visemes/viseme-id-15.jpg',
  '/assets/Visemes/viseme-id-16.jpg',
  '/assets/Visemes/viseme-id-17.jpg',
  '/assets/Visemes/viseme-id-18.jpg',
  '/assets/Visemes/viseme-id-19.jpg',
  '/assets/Visemes/viseme-id-20.jpg',
  '/assets/Visemes/viseme-id-21.jpg'
];

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
    
    // Create a container for the viseme images
    const visemeContainer = document.createElement('div');
    visemeContainer.className = 'viseme-container';
    visemeContainer.style.position = 'absolute';
    visemeContainer.style.top = '0';
    visemeContainer.style.left = '0';
    visemeContainer.style.width = '100%';
    visemeContainer.style.height = '100%';
    containerRef.current.appendChild(visemeContainer);
    
    // Create each viseme image and position it with CSS animation
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
      
      // Add the viseme image
      visemeElement.innerHTML = generateVisemeHtml(frame.visemeId);
      
      // Add to container
      visemeContainer.appendChild(visemeElement);
      
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

// Function to generate HTML for a specific viseme ID
function generateVisemeHtml(visemeId: number): string {
  // Ensure visemeId is in valid range
  const safeVisemeId = Math.min(Math.max(0, visemeId), 21);
  
  // Return an img tag for the viseme
  return `<img src="${visemeImagePaths[safeVisemeId]}" alt="Viseme ${safeVisemeId}" 
    style="width: 100%; height: 100%; object-fit: contain;" />`;
}