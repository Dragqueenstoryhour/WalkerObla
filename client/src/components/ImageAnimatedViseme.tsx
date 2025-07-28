import React, { useEffect, useRef, useState } from 'react';

// Import viseme images
import viseme0 from "@/assets/Visemes/viseme-id-0.jpg";
import viseme1 from "@/assets/Visemes/viseme-id-1.jpg";
import viseme2 from "@/assets/Visemes/viseme-id-2.jpg";
import viseme3 from "@/assets/Visemes/viseme-id-3.jpg";
import viseme4 from "@/assets/Visemes/viseme-id-4.jpg";
import viseme5 from "@/assets/Visemes/viseme-id-5.jpg";
import viseme6 from "@/assets/Visemes/viseme-id-6.jpg";
import viseme7 from "@/assets/Visemes/viseme-id-7.jpg";
import viseme8 from "@/assets/Visemes/viseme-id-8.jpg";
import viseme9 from "@/assets/Visemes/viseme-id-9.jpg";
import viseme10 from "@/assets/Visemes/viseme-id-10.jpg";
import viseme11 from "@/assets/Visemes/viseme-id-11.jpg";
import viseme12 from "@/assets/Visemes/viseme-id-12.jpg";
import viseme13 from "@/assets/Visemes/viseme-id-13.jpg";
import viseme14 from "@/assets/Visemes/viseme-id-14.jpg";
import viseme15 from "@/assets/Visemes/viseme-id-15.jpg";
import viseme16 from "@/assets/Visemes/viseme-id-16.jpg";
import viseme17 from "@/assets/Visemes/viseme-id-17.jpg";
import viseme18 from "@/assets/Visemes/viseme-id-18.jpg";
import viseme19 from "@/assets/Visemes/viseme-id-19.jpg";
import viseme20 from "@/assets/Visemes/viseme-id-20.jpg";
import viseme21 from "@/assets/Visemes/viseme-id-21.jpg";

const visemeImages = {
  0: viseme0,
  1: viseme1,
  2: viseme2,
  3: viseme3,
  4: viseme4,
  5: viseme5,
  6: viseme6,
  7: viseme7,
  8: viseme8,
  9: viseme9,
  10: viseme10,
  11: viseme11,
  12: viseme12,
  13: viseme13,
  14: viseme14,
  15: viseme15,
  16: viseme16,
  17: viseme17,
  18: viseme18,
  19: viseme19,
  20: viseme20,
  21: viseme21,
};

interface VisemeFrame {
  time: number;         // Time in seconds (for compatibility)
  audioOffset?: number; // Time in milliseconds (from API)
  visemeId: number;     // Azure viseme ID (0-21)
  svg?: string;         // SVG content (unused in this component)
}

interface ImageAnimatedVisemeProps {
  frames: VisemeFrame[];
  playing: boolean;
  onEnd?: () => void;
  width?: number;
  height?: number;
  audioRef?: React.RefObject<HTMLAudioElement>; // Add audio ref for synchronization
}

export function ImageAnimatedViseme({ 
  frames, 
  playing, 
  onEnd, 
  width = 200, 
  height = 200,
  audioRef
}: ImageAnimatedVisemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [currentVisemeId, setCurrentVisemeId] = useState(0);
  const [preloadedImages, setPreloadedImages] = useState<{ [key: number]: HTMLImageElement }>({});
  const [imagesReady, setImagesReady] = useState(false);
  const currentVisemeIndexRef = useRef(0);
  
  // Initialize canvas with neutral image immediately
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load and draw neutral image immediately
    const neutralImg = new Image();
    neutralImg.crossOrigin = "anonymous";
    neutralImg.onload = () => {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
      ctx.drawImage(neutralImg, 0, 0, canvas.width, canvas.height);
    };
    neutralImg.src = visemeImages[0];
  }, []); // Run once on mount
  
  // Preload viseme images like Words.tsx does
  useEffect(() => {
    if (!frames.length) return;
    
    const preloadImages = async () => {
      const uniqueVisemeIds = Array.from(new Set([0, ...frames.map(f => f.visemeId)])); // Always include neutral viseme 0
      
      // Load neutral image first for immediate display
      const neutralImg = new Image();
      neutralImg.crossOrigin = "anonymous";
      neutralImg.src = visemeImages[0];
      
      const loadNeutralFirst = new Promise<void>((resolve) => {
        neutralImg.onload = () => {
          setPreloadedImages(prev => ({ ...prev, 0: neutralImg }));
          // Draw neutral image immediately
          drawVisemeOnCanvas(0);
          resolve();
        };
      });
      
      // Load remaining images
      const loadPromises = uniqueVisemeIds.filter(id => id !== 0).map(id => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load viseme ${id}`));
          img.crossOrigin = "anonymous";
          img.src = visemeImages[id as keyof typeof visemeImages];
        });
      });
      
      try {
        // Wait for neutral image first
        await loadNeutralFirst;
        
        // Load remaining images
        const loadedImages = await Promise.all(loadPromises);
        const imageMap: { [key: number]: HTMLImageElement } = { 0: neutralImg };
        uniqueVisemeIds.filter(id => id !== 0).forEach((id, index) => {
          imageMap[id] = loadedImages[index];
        });
        setPreloadedImages(imageMap);
        setImagesReady(true);
      } catch (error) {
        console.error('Error preloading viseme images:', error);
        // Even if other images fail, we have the neutral image
        setImagesReady(true);
      }
    };
    
    preloadImages();
  }, [frames]);
  
  // Canvas drawing function like Words.tsx
  const drawVisemeOnCanvas = (visemeId: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = preloadedImages[visemeId] || preloadedImages[0];
    if (img && img.complete) {
      // Add subtle background like Words.tsx
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the viseme image
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };
  
  // Audio-synchronized animation like Words.tsx
  useEffect(() => {
    if (!playing || !frames.length || !imagesReady || !audioRef?.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    currentVisemeIndexRef.current = 0;
    
    const syncVisemeWithAudio = () => {
      const audio = audioRef.current;
      if (!audio || !playing) return;
      
      // Use audio.currentTime for precise synchronization like Words.tsx
      const currentTime = audio.currentTime * 1000; // Convert to milliseconds
      
      // Find current viseme using audio offset timing like Words.tsx
      while (currentVisemeIndexRef.current < frames.length - 1 && 
             currentTime >= (frames[currentVisemeIndexRef.current + 1].audioOffset || frames[currentVisemeIndexRef.current + 1].time * 1000)) {
        currentVisemeIndexRef.current++;
      }
      
      const targetVisemeId = frames[currentVisemeIndexRef.current]?.visemeId || 0;
      
      // Update viseme with canvas rendering for smooth transitions
      setCurrentVisemeId(prevId => {
        if (prevId !== targetVisemeId) {
          drawVisemeOnCanvas(targetVisemeId);
          return targetVisemeId;
        }
        return prevId;
      });
      
      // Continue animation
      if (playing && !audio.ended) {
        animationRef.current = requestAnimationFrame(syncVisemeWithAudio);
      } else {
        // Animation ended
        setCurrentVisemeId(0);
        drawVisemeOnCanvas(0);
        if (onEnd) {
          onEnd();
        }
      }
    };
    
    // Draw initial neutral viseme
    drawVisemeOnCanvas(0);
    
    // Start synchronization
    animationRef.current = requestAnimationFrame(syncVisemeWithAudio);
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [playing, frames, imagesReady, audioRef, onEnd]);
  
  return (
    <div 
      className="image-animated-viseme"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        overflow: 'hidden',
        borderRadius: '8px'
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}