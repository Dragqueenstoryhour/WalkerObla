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
import { LevelPath } from '@/components/game/LevelPath';
import { MedalSystem, MedalType } from '@/components/game/MedalSystem';
import { useGame } from '@/contexts/GameContext';
import { PronunciationAssessmentResult } from '@/lib/types';
import { BookOpen, Award, Zap, ChevronRight, ArrowLeft, Medal, Trophy, Coins } from 'lucide-react';

export default function RecordingTest() {
  const game = useGame();
  const [activeTab, setActiveTab] = useState('levels');
  const [awardedMedals, setAwardedMedals] = useState<Record<number, MedalType>>({});
  const [savedProgress, setSavedProgress] = useState<boolean>(false);
  
  // Handle level selection
  const handleStartLevel = (levelNumber: number) => {
    game.startLevel(levelNumber);
  };
  
  // Get currently active exercise
  const getActiveExercise = () => {
    if (!game.activeExerciseId) return null;
    return game.exercises.find(ex => ex.id === game.activeExerciseId) || null;
  };
  
  // Calculate and award medals when level is completed
  useEffect(() => {
    if (!game.currentUser || !game.levelProgress || !game.levelProgress.isLevelCompleted) return;
    
    // If level was just completed, check for medal award
    const levelId = game.currentLevel?.id;
    if (!levelId) return;
    
    // Get all exercises for this level
    const levelExercises = game.userExercises.filter(ex => ex.levelId === levelId && ex.isCompleted);
    if (levelExercises.length === 0) return;
    
    // Calculate average score
    const totalScore = levelExercises.reduce((sum, ex) => sum + (ex.score || ex.pronunciationScore || 0), 0);
    const avgScore = totalScore / levelExercises.length;
    
    // Determine medal type
    let medalType: MedalType | null = null;
    if (avgScore >= 90) medalType = 'gold';
    else if (avgScore >= 80) medalType = 'silver';
    else if (avgScore >= 70) medalType = 'bronze';
    
    // Award medal if earned
    if (medalType) {
      setAwardedMedals(prev => ({ ...prev, [levelId]: medalType as MedalType }));
    }
  }, [game.levelProgress?.isLevelCompleted, game.currentLevel?.id]);
  
  // Function to save user progress
  const saveProgress = () => {
    // In a real application, this would save to a database
    // For now, we'll just simulate saving
    setSavedProgress(true);
    
    // Show saved notification
    setTimeout(() => {
      setSavedProgress(false);
    }, 3000);
    
    // Could also be implemented using localStorage for demonstration
    try {
      const progressData = {
        user: game.currentUser,
        currentLevel: game.currentLevel,
        userExercises: game.userExercises,
        medals: awardedMedals
      };
      localStorage.setItem('speechGameProgress', JSON.stringify(progressData));
    } catch (error) {
      console.error("Could not save progress to localStorage:", error);
    }
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
          nextLevel={game.levelProgress.nextLevel || undefined}
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
            {/* Save Progress Button */}
            <div className="flex justify-end mb-4">
              <Button 
                variant={savedProgress ? "outline" : "default"}
                size="sm" 
                className="flex items-center gap-2" 
                onClick={saveProgress}
              >
                {savedProgress ? (
                  <>
                    <span className="text-green-600">✓</span> Progress Saved
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 21V13H7V21M7 3V11H17V3M7 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Save Progress
                  </>
                )}
              </Button>
            </div>
            
            {/* Level Path (Vertical journey map) */}
            <LevelPath onSelectLevel={handleStartLevel} />
            
            {/* Medal system popup */}
            <MedalSystem 
              medals={awardedMedals} 
              onMedalAcknowledged={(levelId) => {
                console.log('Medal acknowledged for level:', levelId);
              }}
            />
            
            {/* Legacy grid of levels (can be kept as alternative view) */}
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-4">Classic Level Selection</h3>
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
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Your Tokens</h4>
                    <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 13.5C14.5 12 14.5 9.5 12 8C9.5 6.5 9.5 9 12 10.5C14.5 12 14.5 15 12 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {game.currentUser?.tokens || 0} Tokens
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-6 border border-primary/20">
                  <h4 className="font-medium mb-4">Avatar Customization</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-background rounded-lg p-4 text-center relative opacity-100">
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                        ✓
                      </div>
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        👤
                      </div>
                      <p className="text-sm">Base Avatar</p>
                      <p className="text-xs text-muted-foreground">Unlocked</p>
                    </div>
                    
                    <div className={`bg-background rounded-lg p-4 text-center relative ${(game.currentUser?.level || 0) >= 1 ? "opacity-100" : "opacity-50"}`}>
                      {(game.currentUser?.level || 0) >= 1 ? (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                          ✓
                        </div>
                      ) : (
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full px-2 py-1 text-center text-[10px]">
                          Lvl 1
                        </div>
                      )}
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        🧢
                      </div>
                      <p className="text-sm">Baseball Cap</p>
                      <p className="text-xs text-muted-foreground">
                        {(game.currentUser?.level || 0) >= 1 ? "Unlocked" : "Locked"}
                      </p>
                    </div>
                    
                    <div className={`bg-background rounded-lg p-4 text-center relative cursor-pointer hover:bg-primary/5 transition-colors`}>
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                        25 🪙
                      </div>
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        🕶️
                      </div>
                      <p className="text-sm">Sunglasses</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    
                    <div className={`bg-background rounded-lg p-4 text-center relative cursor-pointer hover:bg-primary/5 transition-colors`}>
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                        40 🪙
                      </div>
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        👑
                      </div>
                      <p className="text-sm">Crown</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    
                    <div className={`bg-background rounded-lg p-4 text-center relative cursor-pointer hover:bg-primary/5 transition-colors`}>
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                        30 🪙
                      </div>
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        🎭
                      </div>
                      <p className="text-sm">Mask</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    
                    <div className={`bg-background rounded-lg p-4 text-center relative opacity-70`}>
                      <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full px-2 py-1 text-center text-[10px]">
                        Lvl 3
                      </div>
                      <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center">
                        🎸
                      </div>
                      <p className="text-sm">Guitar</p>
                      <p className="text-xs text-muted-foreground">Locked</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-center text-muted-foreground">
                    Complete exercises to earn tokens and unlock new items!
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
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-muted-foreground text-xs mb-1">Level</div>
                        <div className="text-2xl font-bold">{game.currentUser.level || 1}</div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-muted-foreground text-xs mb-1">Total XP</div>
                        <div className="text-2xl font-bold text-blue-500">{game.currentUser.xp}</div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-muted-foreground text-xs mb-1">Tokens</div>
                        <div className="text-2xl font-bold text-amber-500">{game.currentUser.tokens || 0}</div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border p-4 mb-6">
                      <h4 className="font-medium text-sm mb-4">Pronunciation Progress</h4>
                      <div className="h-[200px] mb-4 relative">
                        {/* Simple chart using div heights */}
                        <div className="absolute bottom-0 left-0 w-full flex items-end justify-between h-[180px] pr-8">
                          {/* X Axis labels */}
                          <div className="absolute bottom-0 left-0 w-full flex justify-between px-6 border-t pt-1 text-xs text-muted-foreground">
                            <div>Day 1</div>
                            <div>Day 2</div>
                            <div>Day 3</div>
                            <div>Day 4</div>
                            <div>Day 5</div>
                            <div>Today</div>
                          </div>
                          
                          {/* Y Axis labels */}
                          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
                            <div>100%</div>
                            <div>75%</div>
                            <div>50%</div>
                            <div>25%</div>
                            <div>0%</div>
                          </div>
                          
                          {/* Fake chart bars */}
                          <div className="flex items-end justify-between w-full pl-8">
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '50px'}}></div>
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '65px'}}></div>
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '60px'}}></div>
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '85px'}}></div>
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '95px'}}></div>
                            <div className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm mx-1" style={{height: '110px'}}></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        Your pronunciation score is improving over time!
                      </div>
                    </div>
                    
                    <div className="rounded-lg border p-4 mb-6">
                      <h4 className="font-medium text-sm mb-4">Performance Breakdown</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-medium mb-1">Average Pronunciation</h5>
                          <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-green-500 rounded-full" style={{width: '78%'}}></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>78%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs font-medium mb-1">Average Fluency</h5>
                          <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-blue-500 rounded-full" style={{width: '72%'}}></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>72%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs font-medium mb-1">Average Completeness</h5>
                          <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-amber-500 rounded-full" style={{width: '83%'}}></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>83%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs font-medium mb-1">Average Accuracy</h5>
                          <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-purple-500 rounded-full" style={{width: '76%'}}></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>76%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center mb-6">
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