import { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';

export function OceanBackground() {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioPool = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (pixiContainer.current && !isInitialized) {
      try {
        console.log("Initializing PIXI container");

        // Initialize PIXI app with Application.init()
        const options = {
          width: pixiContainer.current.clientWidth,
          height: pixiContainer.current.clientHeight,
          backgroundColor: 0x90caf9,
          antialias: true,
        };

        PIXI.Application.init(options).then((app) => {
          pixiApp.current = app;
          console.log("PIXI Application initialized");

          if (pixiContainer.current && pixiApp.current?.canvas) {
            pixiContainer.current.appendChild(pixiApp.current.canvas);
            console.log("Canvas appended to container");

            // Create simple ocean background
            const ocean = new PIXI.Graphics();
            ocean.beginFill(0x1976d2);
            ocean.drawRect(0, 0, app.screen.width, app.screen.height);
            ocean.endFill();
            app.stage.addChild(ocean);

            // Create waves with proper cleanup
            const waves: PIXI.Graphics[] = [];
            for (let i = 0; i < 3; i++) {
              const wave = new PIXI.Graphics();
              const y = 100 + i * 80;
              wave.lineStyle(3, 0x64b5f6, 0.5);
              app.stage.addChild(wave);
              waves.push(wave);

              let offset = i * 100;
              app.ticker.add(() => {
                wave.clear();
                wave.lineStyle(3, 0x64b5f6, 0.5);
                wave.moveTo(0, y);

                for (let x = 0; x < app.screen.width; x += 10) {
                  const height = 10 + i * 5;
                  const freq = 0.02 - (i * 0.005);
                  wave.lineTo(x, y + Math.sin(x * freq + offset * 0.01) * height);
                }

                offset += 1;
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

            // Cleanup function
            return () => {
              window.removeEventListener('resize', handleResize);
              if (pixiApp.current) {
                waves.forEach(wave => wave.destroy());
                pixiApp.current.destroy(true);
                pixiApp.current = null;
              }
              // Clean up audio pool
              audioPool.current.forEach(audio => {
                audio.pause();
                audio.src = '';
              });
              audioPool.current.clear();
            };
          }
        }).catch(error => {
          console.error("Error initializing PIXI application:", error);
          if (pixiContainer.current) {
            pixiContainer.current.style.background = 'linear-gradient(180deg, #90caf9 0%, #1976d2 100%)';
          }
        });

      } catch (error) {
        console.error("Error in ocean background setup:", error);
        if (pixiContainer.current) {
          pixiContainer.current.style.background = 'linear-gradient(180deg, #90caf9 0%, #1976d2 100%)';
        }
      }
    }
  }, [isInitialized]);

  // Audio pooling helper
  const playSound = (soundName: string) => {
    if (!audioPool.current.has(soundName)) {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.3;
      audioPool.current.set(soundName, audio);
    }
    const audio = audioPool.current.get(soundName);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log(`Could not play ${soundName} sound:`, e));
    }
  };

  const createDolphin = () => {
    const dolphin = new PIXI.Graphics();

    // Dolphin body (blue-gray)
    dolphin.beginFill(0x6082B6);
    dolphin.drawEllipse(0, 0, 30, 12);
    dolphin.endFill();

    // Dolphin tail
    dolphin.beginFill(0x6082B6);
    dolphin.drawPolygon([
      12, 0,
      30, -15,
      40, 0,
      30, 15
    ]);
    dolphin.endFill();

    // Dolphin fin
    dolphin.beginFill(0x6082B6);
    dolphin.drawPolygon([
      -5, 0,
      -10, -15,
      0, -8
    ]);
    dolphin.endFill();

    // Dolphin face
    dolphin.beginFill(0x456892);
    dolphin.drawEllipse(-20, 0, 12, 8);
    dolphin.endFill();

    // Dolphin eye
    dolphin.beginFill(0x000000);
    dolphin.drawCircle(-20, -3, 2);
    dolphin.endFill();

    dolphin.x = 525; // Position between islands 2 and 3
    dolphin.y = 350;

    pixiApp.current!.stage.addChild(dolphin);

    // Dolphin jumping animation loop
    let jumpPhase = 0;
    let isJumping = false;
    const startJumpInterval = 10000; // 10 seconds

    // Start jump after random delay
    setTimeout(() => {
      isJumping = true;
    }, Math.random() * 2000);

    // Animation frame handler
    pixiApp.current!.ticker.add(() => {
      if (isJumping) {
        // Jump arc trajectory
        jumpPhase += 0.05;
        if (jumpPhase <= Math.PI) {
          const height = 100;
          dolphin.y = 350 - Math.sin(jumpPhase) * height;

          // Rotate dolphin based on position in jump arc
          dolphin.rotation = Math.sin(jumpPhase - Math.PI / 4) * 0.5;
        } else {
          // Reset jump
          jumpPhase = 0;
          dolphin.y = 350;
          dolphin.rotation = 0;
          isJumping = false;

          // Schedule next jump
          setTimeout(() => {
            isJumping = true;
            // Play splash sound
            playSound('splash');
          }, startJumpInterval + Math.random() * 2000);
        }
      }
    });
  };

  const createBuoy = () => {
    const buoy = new PIXI.Container();

    // Buoy body
    const buoyBody = new PIXI.Graphics();
    buoyBody.beginFill(0xE74C3C); // Red color
    buoyBody.drawRect(-5, 0, 10, 25);
    buoyBody.endFill();

    // Buoy top
    buoyBody.beginFill(0xD5DBDB); // Light gray
    buoyBody.drawCircle(0, 0, 8);
    buoyBody.endFill();

    // Buoy light
    const buoyLight = new PIXI.Graphics();
    buoyLight.beginFill(0xFF0000); // Bright red
    buoyLight.drawCircle(0, -7, 3);
    buoyLight.endFill();

    buoy.addChild(buoyBody);
    buoy.addChild(buoyLight);

    buoy.x = 1275; // Between islands 5 and 6
    buoy.y = 275;

    pixiApp.current!.stage.addChild(buoy);

    // Blinking light animation and buoy bobbing
    let lightOn = true;
    let bobPhase = 0;

    pixiApp.current!.ticker.add(() => {
      // Buoy bobbing in water
      bobPhase += 0.02;
      buoy.y = 275 + Math.sin(bobPhase) * 3;

      // Blink light every second
      if (Math.floor(pixiApp.current!.ticker.lastTime / 1000) % 2 === 0) {
        if (!lightOn) {
          buoyLight.clear();
          buoyLight.beginFill(0xFF0000);
          buoyLight.drawCircle(0, -7, 3);
          buoyLight.endFill();
          lightOn = true;
        }
      } else {
        if (lightOn) {
          buoyLight.clear();
          buoyLight.beginFill(0x990000);
          buoyLight.drawCircle(0, -7, 3);
          buoyLight.endFill();
          lightOn = false;
        }
      }
    });
  };

  useEffect(() => {
    if (pixiApp.current) {
      createDolphin();
      createBuoy();

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
    }
  }, [pixiApp.current]);


  return (
    <div
      ref={pixiContainer}
      className="absolute inset-0 bg-blue-100"
      style={{ zIndex: 0 }}
    />
  );
}