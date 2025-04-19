import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LevelIntro } from '@/components/game/LevelIntro';
import { ProgressBar } from '@/components/game/ProgressBar';
import { LevelComplete } from '@/components/game/LevelComplete';
import { GameExerciseRecorder } from '@/components/game/GameExerciseRecorder';
import { ExerciseList } from '@/components/game/ExerciseList';
import { Avatar } from '@/components/game/Avatar';
import { useGame, GameProvider } from '@/contexts/GameContext';
import { PronunciationAssessmentResult } from '@/lib/types';
import { BookOpen, Award, Zap, ChevronRight, ArrowLeft } from 'lucide-react';

// The main component wrapped with GameProvider
export default function RecordingTest() {
  return (
    <GameProvider initialUsername="player1">
      <RecordingTestContent />
    </GameProvider>
  );
}

function RecordingTestContent() {
  const game = useGame();
  const [activeTab, setActiveTab] = useState('levels');
  
  // Handle level selection
  const handleStartLevel = (levelNumber: number) => {
    game.startLevel(levelNumber);
  };
  
  // Get currently active exercise
  const getActiveExercise = () => {
    if (!game.activeExerciseId) return null;
    return game.exercises.find(ex => ex.id === game.activeExerciseId) || null;
  };
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Speech Practice Game</h1>
        
        {game.currentUser && (
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="font-medium">{game.currentUser.username}</div>
              <div className="text-sm text-muted-foreground">
                Level {game.currentUser.level} • {game.currentUser.xp} XP
              </div>
            </div>
            <Avatar size="sm" />
          </div>
        )}
      </div>
      
      {/* Level Intro Modal */}
      {game.isLevelIntroVisible && game.currentLevel && (
        <LevelIntro 
          level={game.currentLevel} 
          onStart={game.closeLevelIntro} 
        />
      )}
      
      {/* Level Complete Modal */}
      {game.isLevelCompleteVisible && game.currentLevel && game.currentUser && game.levelProgress && (
        <LevelComplete
          user={game.currentUser}
          completedLevel={game.currentLevel}
          nextLevel={game.levelProgress.nextLevel}
          stats={{
            exercisesCompleted: game.levelProgress.exercisesCompleted,
            totalExercises: game.levelProgress.totalExercises,
            averageScore: game.userExercises
              .filter(ue => ue.completed && ue.pronunciationScore)
              .reduce((sum, ue) => sum + (ue.pronunciationScore || 0), 0) / 
              Math.max(1, game.userExercises.filter(ue => ue.completed && ue.pronunciationScore).length),
            xpEarned: game.exercises
              .filter(ex => game.userExercises.some(ue => ue.exerciseId === ex.id && ue.completed))
              .reduce((sum, ex) => sum + ex.xpReward, 0)
          }}
          onContinue={game.levelProgress.nextLevel ? game.continueToNextLevel : game.continueToDashboard}
        />
      )}
      
      {/* Exercise Recorder Modal */}
      {game.isExerciseRecorderVisible && getActiveExercise() && (
        <GameExerciseRecorder
          exercise={getActiveExercise()!}
          onClose={game.closeExerciseRecorder}
          onComplete={(result: PronunciationAssessmentResult) => {
            if (game.activeExerciseId) {
              game.completeExercise(game.activeExerciseId, result);
            }
          }}
        />
      )}
      
      {/* Main content */}
      {!game.currentLevel ? (
        // Level selection
        <Tabs defaultValue="levels" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="levels" className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              Levels
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center">
              <Award className="mr-2 h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center">
              <Zap className="mr-2 h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="levels" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Level 1 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Level 1</h3>
                      <p className="text-muted-foreground">Beginner Words</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                      Easy
                    </div>
                  </div>
                  
                  <p className="mb-4">Practice simple words to build your pronunciation skills.</p>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartLevel(1)}
                  >
                    Start Level
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Level 2 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Level 2</h3>
                      <p className="text-muted-foreground">Simple Phrases</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                      Easy
                    </div>
                  </div>
                  
                  <p className="mb-4">Practice short phrases to improve your fluency.</p>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartLevel(2)}
                  >
                    Start Level
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Level 3 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Level 3</h3>
                      <p className="text-muted-foreground">Complete Sentences</p>
                    </div>
                    <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">
                      Medium
                    </div>
                  </div>
                  
                  <p className="mb-4">Practice complete sentences for better speech rhythm.</p>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartLevel(3)}
                  >
                    Start Level
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="rewards">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-6">
                  <Avatar size="xl" />
                </div>
                
                <h3 className="text-xl font-bold mb-4">Avatar Customization</h3>
                <p className="text-muted-foreground mb-6">
                  Complete levels to unlock new customization options for your avatar.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2">Currently Unlocked</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Base Avatar</p>
                    </div>
                    {game.currentUser?.level && game.currentUser.level >= 1 && (
                      <div className="bg-background rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Baseball Cap</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('levels')}>
                  Back to Levels
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="progress">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Your Progress</h3>
                
                {game.currentUser && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-muted-foreground text-sm mb-1">Level</div>
                        <div className="text-2xl font-bold">{game.currentUser.level}</div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-muted-foreground text-sm mb-1">Total XP</div>
                        <div className="text-2xl font-bold text-blue-500">{game.currentUser.xp}</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-muted-foreground text-sm mb-1">Exercises Completed</div>
                      <div className="text-2xl font-bold">{game.currentUser.totalExercisesCompleted}</div>
                    </div>
                    
                    <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('levels')}>
                      Back to Levels
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Level gameplay
        <div className="space-y-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2"
              onClick={game.continueToDashboard}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <h2 className="text-xl font-bold">Level {game.currentLevel.levelNumber}: {game.currentLevel.name}</h2>
          </div>
          
          {/* Progress bar */}
          {game.levelProgress && (
            <ProgressBar progress={game.levelProgress} />
          )}
          
          {/* Exercises list */}
          <ExerciseList
            exercises={game.exercises}
            userExercises={game.userExercises}
            activeExerciseId={game.activeExerciseId}
            onStartExercise={game.startExercise}
            onCompleteExercise={game.completeExercise}
          />
        </div>
      )}
    </div>
  );
}