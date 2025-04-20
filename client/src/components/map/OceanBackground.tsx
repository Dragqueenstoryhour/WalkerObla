import { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';

export function OceanBackground() {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (pixiContainer.current && !isInitialized) {
      try {
        // Create a simple blue background instead of PIXI to avoid compatibility issues
        console.log("Initializing ocean background");
        
        // Initialize PIXI app safely
        pixiApp.current = new PIXI.Application({
          width: pixiContainer.current.clientWidth,
          height: pixiContainer.current.clientHeight,
          backgroundColor: 0x90caf9,
          antialias: true,
        });
        
        // Add canvas to DOM
        if (pixiApp.current.view) {
          pixiContainer.current.appendChild(pixiApp.current.view);
        }
        
        // Create simple ocean background
        const ocean = new PIXI.Graphics();
        ocean.beginFill(0x1976d2);
        ocean.drawRect(0, 0, pixiApp.current.screen.width, pixiApp.current.screen.height);
        ocean.endFill();
        pixiApp.current.stage.addChild(ocean);
        
        // Create waves
        for (let i = 0; i < 3; i++) {
          const wave = new PIXI.Graphics();
          const y = 100 + i * 80;
          
          wave.lineStyle(3, 0x64b5f6, 0.5);
          pixiApp.current.stage.addChild(wave);
          
          // Animate wave
          let offset = i * 100;
          pixiApp.current.ticker.add(() => {
            wave.clear();
            wave.lineStyle(3, 0x64b5f6, 0.5);
            wave.moveTo(0, y);
            
            for (let x = 0; x < pixiApp.current!.screen.width; x += 10) {
              const height = 10 + i * 5;
              const freq = 0.02 - (i * 0.005);
              wave.lineTo(x, y + Math.sin(x * freq + offset * 0.01) * height);
            }
            
            offset += 1;
          });
        }
        
        // Add a few fish
        for (let i = 0; i < 5; i++) {
          const fish = new PIXI.Graphics();
          const size = 5 + Math.random() * 8;
          
          fish.beginFill(0xffeb3b);
          fish.drawEllipse(size, 0, size * 2, size);
          fish.beginFill(0xffa000);
          fish.moveTo(size * 2, 0);
          fish.lineTo(size * 3, size);
          fish.lineTo(size * 3, -size);
          fish.lineTo(size * 2, 0);
          fish.endFill();
          
          fish.x = Math.random() * pixiApp.current.screen.width;
          fish.y = 200 + Math.random() * 300;
          
          pixiApp.current.stage.addChild(fish);
          
          // Animate fish
          const speed = 0.5 + Math.random() * 1;
          pixiApp.current.ticker.add(() => {
            fish.x += speed;
            if (fish.x > pixiApp.current!.screen.width + size * 3) {
              fish.x = -size * 3;
            }
          });
        }
        
        // Handle resize
        const handleResize = () => {
          if (pixiContainer.current && pixiApp.current) {
            const width = pixiContainer.current.clientWidth;
            const height = pixiContainer.current.clientHeight;
            pixiApp.current.renderer.resize(width, height);
          }
        };
        
        window.addEventListener('resize', handleResize);
        setIsInitialized(true);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          if (pixiApp.current) {
            pixiApp.current.destroy(true);
            pixiApp.current = null;
          }
        };
      } catch (error) {
        console.error("Error initializing ocean background:", error);
        // Provide a fallback rendering in case PIXI fails
        if (pixiContainer.current) {
          pixiContainer.current.style.background = 'linear-gradient(180deg, #90caf9 0%, #1976d2 100%)';
        }
      }
    }
  }, [isInitialized]);
  
  return (
    <div 
      ref={pixiContainer} 
      className="absolute inset-0 bg-blue-100"
      style={{ zIndex: 0 }}
    />
  );
}