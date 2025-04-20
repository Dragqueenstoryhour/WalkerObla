import { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';

export function OceanBackground() {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (pixiContainer.current && !isInitialized) {
      // Create PIXI Application for ocean background
      pixiApp.current = new PIXI.Application({
        width: pixiContainer.current.clientWidth,
        height: pixiContainer.current.clientHeight,
        backgroundColor: 0xbde0fe,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      
      // Add PIXI view to DOM
      pixiContainer.current.appendChild(pixiApp.current.view as HTMLCanvasElement);
      
      // Create ocean gradient
      const ocean = new PIXI.Graphics();
      ocean.beginFill(0x0077b6);
      ocean.drawRect(0, 0, pixiApp.current.screen.width, pixiApp.current.screen.height);
      ocean.endFill();
      pixiApp.current.stage.addChild(ocean);
      
      // Create wave patterns
      const createWaves = () => {
        const wavesContainer = new PIXI.Container();
        pixiApp.current?.stage.addChild(wavesContainer);
        
        // Wave patterns
        const waveCount = 10;
        const waves: PIXI.Graphics[] = [];
        
        for (let i = 0; i < waveCount; i++) {
          const wave = new PIXI.Graphics();
          const alpha = 0.1 + (i * 0.05);
          const waveHeight = 20 + (i * 2);
          const waveFrequency = 0.01 - (i * 0.001);
          const waveOffset = i * 10;
          const speed = 0.2 + (i * 0.05);
          
          wave.lineStyle(3, 0x90e0ef, alpha);
          waves.push(wave);
          wavesContainer.addChild(wave);
          
          // Draw wave path
          const drawWave = (offset = 0) => {
            wave.clear();
            wave.lineStyle(3, 0x90e0ef, alpha);
            wave.moveTo(0, 200 + Math.sin(offset) * waveHeight);
            
            for (let x = 0; x < pixiApp.current!.screen.width; x += 10) {
              const y = 200 + Math.sin(waveFrequency * x + offset + waveOffset) * waveHeight;
              wave.lineTo(x, y);
            }
          };
          
          // Initial draw
          drawWave();
          
          // Animate wave
          let offset = 0;
          pixiApp.current?.ticker.add(() => {
            offset += 0.01 * speed;
            drawWave(offset);
          });
        }
      };
      
      // Add some sparse clouds and seagulls
      const createClouds = () => {
        // Add 5 clouds with different sizes and positions
        for (let i = 0; i < 5; i++) {
          const cloud = new PIXI.Graphics();
          cloud.beginFill(0xffffff, 0.8);
          
          // Draw cloud shape (multiple circles)
          const cloudWidth = 70 + Math.random() * 100;
          const cloudHeight = 30 + Math.random() * 20;
          
          cloud.drawCircle(0, 0, cloudHeight);
          cloud.drawCircle(cloudWidth * 0.3, -5, cloudHeight * 0.7);
          cloud.drawCircle(cloudWidth * 0.6, 0, cloudHeight * 0.9);
          cloud.drawCircle(cloudWidth * 0.9, -5, cloudHeight * 0.6);
          
          cloud.endFill();
          
          // Position cloud
          cloud.x = Math.random() * pixiApp.current!.screen.width;
          cloud.y = 20 + Math.random() * 100;
          
          // Add to stage
          pixiApp.current?.stage.addChild(cloud);
          
          // Animate cloud
          const speed = 0.1 + Math.random() * 0.2;
          pixiApp.current?.ticker.add(() => {
            cloud.x += speed;
            if (cloud.x > pixiApp.current!.screen.width + cloudWidth) {
              cloud.x = -cloudWidth;
            }
          });
        }
      };
      
      // Add some random fish
      const createFish = () => {
        for (let i = 0; i < 7; i++) {
          const fishSize = 5 + Math.random() * 10;
          const fish = new PIXI.Graphics();
          
          // Fish color
          const fishColors = [0xffb703, 0xfb8500, 0x8ecae6, 0x219ebc, 0x023047];
          const fishColor = fishColors[Math.floor(Math.random() * fishColors.length)];
          
          // Draw fish
          fish.beginFill(fishColor);
          fish.moveTo(0, 0);
          fish.lineTo(-fishSize * 2, fishSize);
          fish.lineTo(-fishSize * 2, -fishSize);
          fish.lineTo(0, 0);
          
          // Fish body
          fish.drawEllipse(fishSize, 0, fishSize * 2, fishSize);
          fish.endFill();
          
          // Position fish
          fish.x = Math.random() * pixiApp.current!.screen.width;
          fish.y = 250 + Math.random() * (pixiApp.current!.screen.height - 300);
          
          // Add to stage
          pixiApp.current?.stage.addChild(fish);
          
          // Animate fish
          const speed = 0.5 + Math.random() * 1;
          const amplitude = 10 + Math.random() * 20;
          const frequency = 0.02 + Math.random() * 0.02;
          let time = Math.random() * 100;
          
          pixiApp.current?.ticker.add(() => {
            time += 0.1;
            fish.x += speed;
            fish.y += Math.sin(time * frequency) * 0.5;
            
            if (fish.x > pixiApp.current!.screen.width + fishSize * 3) {
              fish.x = -fishSize * 3;
              fish.y = 250 + Math.random() * (pixiApp.current!.screen.height - 300);
            }
          });
        }
      };
      
      // Add sparkles to water
      const createSparkles = () => {
        const sparklesContainer = new PIXI.ParticleContainer(200, {
          position: true,
          rotation: true,
          scale: true,
          alpha: true
        });
        
        pixiApp.current?.stage.addChild(sparklesContainer);
        
        // Create a star shape for sparkles
        const starTexture = createStarTexture();
        
        // Add sparkles
        for (let i = 0; i < 50; i++) {
          const sparkle = new PIXI.Sprite(starTexture);
          sparkle.anchor.set(0.5);
          sparkle.x = Math.random() * pixiApp.current!.screen.width;
          sparkle.y = 100 + Math.random() * (pixiApp.current!.screen.height - 150);
          sparkle.scale.set(0.05 + Math.random() * 0.1);
          sparkle.alpha = 0.3 + Math.random() * 0.4;
          sparkle.tint = 0xffffff;
          
          sparklesContainer.addChild(sparkle);
          
          // Animate sparkle
          const originalY = sparkle.y;
          const originalScale = sparkle.scale.x;
          const timeOffset = Math.random() * 100;
          
          pixiApp.current?.ticker.add((delta) => {
            const time = pixiApp.current!.ticker.lastTime * 0.001 + timeOffset;
            
            // Make sparkle pulse
            sparkle.alpha = 0.3 + Math.sin(time * 2) * 0.2;
            sparkle.scale.set(originalScale + Math.sin(time * 3) * 0.02);
            
            // Small vertical movement
            sparkle.y = originalY + Math.sin(time) * 2;
          });
        }
      };
      
      // Helper function to create a star texture for sparkles
      const createStarTexture = () => {
        const g = new PIXI.Graphics();
        g.beginFill(0xffffff);
        
        const starPoints = 5;
        const outerRadius = 10;
        const innerRadius = 5;
        
        for (let i = 0; i < starPoints * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i / (starPoints * 2)) * Math.PI * 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        
        g.endFill();
        
        // Generate texture from graphics
        return pixiApp.current!.renderer.generateTexture(g);
      };
      
      // Initialize all components
      createWaves();
      createClouds();
      createFish();
      createSparkles();
      
      // Handle resize events
      const handleResize = () => {
        if (pixiContainer.current && pixiApp.current) {
          const width = pixiContainer.current.clientWidth;
          const height = pixiContainer.current.clientHeight;
          
          pixiApp.current.renderer.resize(width, height);
          
          // Update ocean size
          const ocean = pixiApp.current.stage.getChildAt(0) as PIXI.Graphics;
          ocean.clear();
          ocean.beginFill(0x0077b6);
          ocean.drawRect(0, 0, width, height);
          ocean.endFill();
        }
      };
      
      window.addEventListener('resize', handleResize);
      setIsInitialized(true);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        
        if (pixiApp.current) {
          pixiApp.current.destroy(true, true);
          pixiApp.current = null;
        }
      };
    }
  }, [pixiContainer, isInitialized]);
  
  return (
    <div 
      ref={pixiContainer} 
      className="absolute inset-0 bg-blue-100"
      style={{ zIndex: 0 }}
    />
  );
}