import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { IslandMapContainer } from '../map/IslandMapContainer';

export function LevelPath() {
  const { 
    currentUser, 
    currentLevel, 
    startLevel, 
    startExercise, 
    userExercises, 
    exercises,
    isLevelIntroVisible,
    isLevelCompleteVisible
  } = useGame();
  
  const [isLevelSelectionVisible, setIsLevelSelectionVisible] = useState(false);

  // Handle level selection
  const handleLevelSelect = async (levelId: number) => {
    try {
      await startLevel(levelId);
      setIsLevelSelectionVisible(false);
    } catch (error) {
      console.error("Error starting level:", error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            {/* Header with user info */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
              <h2 className="text-2xl font-bold">Welcome to Speech Island</h2>
              <p className="text-blue-100 mt-1">
                A tropical adventure to improve your speech recovery
              </p>
            </div>
            
            {/* Island Map Container */}
            <IslandMapContainer onSelectLevel={handleLevelSelect} />
            
            {/* Instructions */}
            <div className="p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Explore Islands
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Each island represents a speech level. Drag to explore the map
                    and tap on islands to practice different skills.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Complete Exercises
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Each island contains pronunciation exercises designed to help
                    you recover your speech ability step by step.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Earn Achievements
                  </h3>
                  <p className="text-blue-700 text-sm">
                    As you complete exercises, you'll unlock achievements and
                    see your progress improve over time.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}