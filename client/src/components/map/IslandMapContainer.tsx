import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { TabsTrigger, Tabs, TabsList, TabsContent } from '@/components/ui/tabs';
import { IslandMap } from './IslandMap';
import { IslandCarousel } from './IslandCarousel';
import { Map, Compass, Menu } from 'lucide-react';

interface IslandMapContainerProps {
  onSelectLevel: (levelId: number) => void;
}

export function IslandMapContainer({ onSelectLevel }: IslandMapContainerProps) {
  const [view, setView] = useState<'map' | 'carousel'>('map');
  
  // Parallax effect for background
  const [{ xy }, set] = useSpring(() => ({ xy: [0, 0] }));
  const calculateParallax = (x: number, y: number) => {
    return xy.to((x, y) => `translate3d(${x / 20}px, ${y / 20}px, 0)`);
  };
  
  // Handle mouse move for parallax effect
  const handleMouseMove = ({ clientX: x, clientY: y }: React.MouseEvent) => {
    // Get the center of the screen
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Calculate the offset from center
    const offsetX = (x - centerX) / 5;
    const offsetY = (y - centerY) / 5;
    
    set({ xy: [offsetX, offsetY] });
  };
  
  return (
    <div 
      className="relative w-full min-h-[700px] overflow-hidden bg-gradient-to-b from-sky-200 to-blue-400 rounded-lg shadow-lg"
      onMouseMove={handleMouseMove}
    >
      {/* Animated sky effect */}
      <animated.div
        className="absolute inset-0 z-0"
        style={{ transform: calculateParallax(0, 0) }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-transparent opacity-70"></div>
        
        {/* Sun */}
        <motion.div
          className="absolute top-10 right-20 w-32 h-32 rounded-full bg-yellow-200 opacity-80"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 0.9, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
          }}
        />
        
        {/* Clouds */}
        <motion.div
          className="absolute top-12 left-10 w-64 h-32"
          animate={{ x: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 15 }}
        >
          <div className="absolute top-0 left-0 w-32 h-16 rounded-full bg-white opacity-70"></div>
          <div className="absolute top-8 left-16 w-40 h-24 rounded-full bg-white opacity-80"></div>
          <div className="absolute top-4 left-40 w-24 h-16 rounded-full bg-white opacity-70"></div>
        </motion.div>
        
        <motion.div
          className="absolute top-20 right-64 w-48 h-24"
          animate={{ x: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 20 }}
        >
          <div className="absolute top-0 left-0 w-24 h-12 rounded-full bg-white opacity-60"></div>
          <div className="absolute top-6 left-12 w-36 h-18 rounded-full bg-white opacity-70"></div>
        </motion.div>
      </animated.div>
      
      {/* View selector tabs */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <Tabs
          defaultValue="map"
          value={view}
          onValueChange={(v) => setView(v as 'map' | 'carousel')}
          className="w-64"
        >
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger 
              value="map" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Map className="h-4 w-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger 
              value="carousel" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Menu className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Content */}
      <div className="relative z-0 w-full h-full">
        {view === 'map' ? (
          <IslandMap onSelectLevel={onSelectLevel} />
        ) : (
          <IslandCarousel 
            onSelectLevel={onSelectLevel} 
            onSwitchToMap={() => setView('map')} 
          />
        )}
      </div>
    </div>
  );
}