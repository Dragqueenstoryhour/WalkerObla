import { useRef, useEffect } from 'react';
import Slider from 'react-slick';
import { motion } from 'framer-motion';
import { GameLevel } from '@/lib/types';
import { useGame } from '@/contexts/GameContext';
import { SoundManager } from './SoundManager';
import { ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react';

// Import slick carousel CSS
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface IslandCarouselProps {
  onSelectLevel: (levelId: number) => void;
  onSwitchToMap: () => void;
}

export function IslandCarousel({ onSelectLevel, onSwitchToMap }: IslandCarouselProps) {
  const { 
    currentUser, 
    currentLevel,
    levelProgress,
    userExercises 
  } = useGame();
  
  const sliderRef = useRef<Slider | null>(null);
  const soundManager = useRef<SoundManager>(new SoundManager());
  
  useEffect(() => {
    soundManager.current.initialize();
  }, []);
  
  // Generate levels with island theme - same as IslandMap for consistency
  const islandLevels: GameLevel[] = [
    { id: 1, levelNumber: 1, name: "Alphabet Atoll", description: "Practice simple words like 'hello', 'thank you', and 'goodbye'", difficulty: "easy", requiredXP: 100, isActive: true, isCompleted: false, exercises: 3 },
    { id: 2, levelNumber: 2, name: "Phrase Pier", description: "Practice everyday phrases like 'How are you?' and 'My name is...'", difficulty: "easy", requiredXP: 200, isActive: false, isCompleted: false, exercises: 3 },
    { id: 3, levelNumber: 3, name: "Sentence Shores", description: "Practice complete sentences like 'I would like a glass of water'", difficulty: "easy", requiredXP: 300, isActive: false, isCompleted: false, exercises: 3 },
    { id: 4, levelNumber: 4, name: "Dialog Delta", description: "Practice challenging phrases like 'Could you please help me find the nearest pharmacy?'", difficulty: "medium", requiredXP: 400, isActive: false, isCompleted: false, exercises: 4 },
    { id: 5, levelNumber: 5, name: "Conversation Cove", description: "Practice sentences with multiple parts like 'When I finish my therapy today, I would like to go to the park'", difficulty: "medium", requiredXP: 500, isActive: false, isCompleted: false, exercises: 4 },
    { id: 6, levelNumber: 6, name: "Fluency Falls", description: "Practice fluid conversation patterns and improve overall speech rhythm and fluency", difficulty: "hard", requiredXP: 600, isActive: false, isCompleted: false, exercises: 5 }
  ];
  
  // Determine level status
  const getLevelStatus = (level: GameLevel) => {
    // Current active level
    if (currentLevel?.id === level.id) {
      return 'active';
    }
    
    // Count completed exercises for this level
    const completedExercises = userExercises.filter(
      ex => ex.levelId === level.id && ex.isCompleted
    ).length;
    
    // Level specific exercises
    const levelExercises = userExercises.filter(
      ex => ex.levelId === level.id
    );
    
    // If all exercises are completed, level is complete
    if (levelExercises.length > 0 && completedExercises === levelExercises.length) {
      return 'completed';
    }
    
    // If some exercises are completed, level is in progress
    if (completedExercises > 0) {
      return 'inProgress';
    }
    
    // Locked or not started
    return 'notStarted';
  };
  
  // Handle level selection with sound effect
  const handleLevelSelect = (levelId: number) => {
    soundManager.current.playSound('select');
    onSelectLevel(levelId);
  };
  
  // Slider settings
  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: '50px',
    arrows: false,
    beforeChange: () => soundManager.current.playSound('hover'),
    responsive: [
      {
        breakpoint: 768,
        settings: {
          centerPadding: '20px',
        }
      }
    ]
  };
  
  return (
    <div className="relative pb-12 max-w-3xl mx-auto">
      <div className="relative pt-6 pb-10 bg-gradient-to-b from-blue-100 to-blue-300 rounded-b-3xl shadow-inner overflow-hidden">
        {/* Ocean wave overlay */}
        <svg className="absolute left-0 right-0 bottom-0 w-full" height="50" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path 
            d="M0,0 Q5,5 10,0 Q15,5 20,0 Q25,5 30,0 Q35,5 40,0 Q45,5 50,0 Q55,5 60,0 Q65,5 70,0 Q75,5 80,0 Q85,5 90,0 Q95,5 100,0 V20 H0 Z" 
            fill="#2563EB" 
            fillOpacity="0.3"
          />
          <path 
            d="M0,5 Q7,10 15,5 Q22,0 30,5 Q37,10 45,5 Q52,0 60,5 Q67,10 75,5 Q82,0 90,5 Q95,10 100,5 V20 H0 Z" 
            fill="#1D4ED8" 
            fillOpacity="0.4"
          />
        </svg>
      
        {/* Switch to map view button */}
        <motion.button
          className="absolute top-3 right-3 bg-white/80 rounded-full p-2 z-10 shadow-md"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            soundManager.current.playSound('click');
            onSwitchToMap();
          }}
        >
          <MapIcon size={20} className="text-blue-800" />
        </motion.button>
        
        {/* Slider with islands */}
        <Slider ref={sliderRef} {...settings} className="island-carousel">
          {islandLevels.map((level) => {
            const status = getLevelStatus(level);
            
            // Determine card colors based on status
            const cardColors = {
              active: 'bg-blue-50 border-blue-400 shadow-blue-300/50',
              completed: 'bg-green-50 border-green-400 shadow-green-300/50',
              inProgress: 'bg-amber-50 border-amber-400 shadow-amber-300/50',
              notStarted: 'bg-white border-gray-200 shadow-gray-300/30',
              locked: 'bg-gray-100 border-gray-300 shadow-none opacity-60'
            };
            
            return (
              <div key={level.id} className="px-2 py-1">
                <motion.div 
                  className={`
                    relative p-5 rounded-xl border-2 shadow-lg h-80
                    ${cardColors[status]}
                  `}
                  whileHover={status !== 'locked' ? { y: -5, scale: 1.02 } : {}}
                  onClick={() => status !== 'locked' && handleLevelSelect(level.id)}
                >
                  {/* Island icon or illustration */}
                  <div className="flex justify-center mb-5">
                    <div className="relative w-32 h-32">
                      {/* SVG island */}
                      <svg viewBox="0 0 100 100" width="100%" height="100%">
                        {/* Island shape */}
                        <path 
                          d="M20,50 Q30,40 45,45 Q60,50 75,45 Q90,40 90,60 Q90,80 70,80 Q50,85 30,75 Q15,65 20,50 Z" 
                          fill={status === 'locked' ? '#D1D5DB' : '#60A5FA'} 
                          strokeWidth="1"
                          stroke={status === 'locked' ? '#9CA3AF' : '#3B82F6'}
                        />
                        
                        {/* Sand */}
                        <path 
                          d="M30,75 Q45,78 60,75 Q70,73 75,65 L78,75 Q60,82 40,80 Q33,78 30,75 Z" 
                          fill={status === 'locked' ? '#E5E7EB' : '#FBBF24'} 
                          fillOpacity="0.8"
                        />
                        
                        {/* Palm tree */}
                        <g transform="translate(65, 40) scale(0.15)">
                          <rect x="-10" y="0" width="20" height="100" fill={status === 'locked' ? '#9CA3AF' : '#92400E'} />
                          <path 
                            d="M0,-60 L-60,-20 L-70,0 L-30,-10 L-50,20 L-30,30 L-10,10 L-5,40 L5,40 L10,10 L30,30 L50,20 L30,-10 L70,0 L60,-20 L0,-60"
                            fill={status === 'locked' ? '#9CA3AF' : '#22C55E'} 
                          />
                        </g>
                      </svg>
                      
                      {/* Level number */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${status === 'locked' 
                            ? 'bg-gray-300 text-gray-600' 
                            : 'bg-white text-blue-800 font-bold shadow-md'
                          }
                        `}>
                          {level.levelNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Level details */}
                  <h3 className={`text-center text-xl font-bold mb-2 ${status === 'locked' ? 'text-gray-500' : 'text-blue-800'}`}>
                    {level.name}
                  </h3>
                  
                  <p className={`text-center mb-4 text-sm ${status === 'locked' ? 'text-gray-500' : 'text-blue-700'}`}>
                    {level.description}
                  </p>
                  
                  {/* Level stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className={`rounded-lg p-2 text-center ${status === 'locked' ? 'bg-gray-200' : 'bg-white/80'}`}>
                      <div className="text-xs uppercase font-medium text-gray-500">Difficulty</div>
                      <div className={`font-medium capitalize ${status === 'locked' ? 'text-gray-500' : 'text-blue-700'}`}>
                        {level.difficulty}
                      </div>
                    </div>
                    
                    <div className={`rounded-lg p-2 text-center ${status === 'locked' ? 'bg-gray-200' : 'bg-white/80'}`}>
                      <div className="text-xs uppercase font-medium text-gray-500">Exercises</div>
                      <div className={`font-medium ${status === 'locked' ? 'text-gray-500' : 'text-blue-700'}`}>
                        {level.exercises}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  {status !== 'notStarted' && status !== 'locked' && (
                    <div className={`
                      absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium
                      ${status === 'active' ? 'bg-blue-100 text-blue-800' : 
                        status === 'completed' ? 'bg-green-100 text-green-800' : 
                        'bg-amber-100 text-amber-800'}
                    `}>
                      {status === 'active' ? 'Active' : 
                       status === 'completed' ? 'Completed' : 
                       'In Progress'}
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </Slider>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-4 px-4">
        <motion.button
          className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            soundManager.current.playSound('click');
            sliderRef.current?.slickPrev();
          }}
        >
          <ChevronLeft size={20} />
        </motion.button>
        
        <motion.button
          className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            soundManager.current.playSound('click');
            sliderRef.current?.slickNext();
          }}
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>
      
      {/* Custom CSS for carousel */}
      <style jsx global>{`
        .island-carousel .slick-dots li button:before {
          color: #3B82F6;
          opacity: 0.25;
        }
        
        .island-carousel .slick-dots li.slick-active button:before {
          color: #3B82F6;
          opacity: 0.75;
        }
        
        .island-carousel .slick-dots {
          bottom: -30px;
        }
        
        .island-carousel .slick-slide {
          transition: transform 0.3s ease;
        }
        
        .island-carousel .slick-center {
          transform: scale(1.05);
          z-index: 1;
        }
      `}</style>
    </div>
  );
}