import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  GameLevel, 
  Exercise, 
  UserExercise,
  LevelProgress,
  PronunciationAssessmentResult
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { levelWords, getWordsForLevel } from '@/lib/levelWords';

// Define the types for our context
interface GameContextType {
  // State
  currentUser: User | null;
  currentLevel: GameLevel | null;
  exercises: Exercise[];
  userExercises: UserExercise[];
  activeExerciseId: number | null;
  levelProgress: LevelProgress | null;
  isLevelIntroVisible: boolean;
  isLevelCompleteVisible: boolean;
  isExerciseRecorderVisible: boolean;
  
  // Actions
  loginUser: (username: string) => Promise<User>;
  startLevel: (levelNumber: number) => Promise<void>;
  completeLevel: () => Promise<void>;
  startExercise: (exerciseId: number) => void;
  completeExercise: (exerciseId: number, result: PronunciationAssessmentResult) => Promise<void>;
  closeLevelIntro: () => void;
  closeExerciseRecorder: () => void;
  continueToDashboard: () => void;
  continueToNextLevel: () => Promise<void>;
}

// Default empty implementation
const defaultContext: GameContextType = {
  currentUser: null,
  currentLevel: null,
  exercises: [],
  userExercises: [],
  activeExerciseId: null,
  levelProgress: null,
  isLevelIntroVisible: false,
  isLevelCompleteVisible: false,
  isExerciseRecorderVisible: false,
  
  loginUser: async () => ({ id: 0 } as User),
  startLevel: async () => {},
  completeLevel: async () => {},
  startExercise: () => {},
  completeExercise: async () => {},
  closeLevelIntro: () => {},
  closeExerciseRecorder: () => {},
  continueToDashboard: () => {},
  continueToNextLevel: async () => {},
};

// Create the context
const GameContext = createContext<GameContextType>(defaultContext);

// Define a custom hook to access the context
export const useGame = () => useContext(GameContext);

interface GameProviderProps {
  children: ReactNode;
  initialUsername?: string;
}

// Temporary mock data
const mockUser: User = {
  id: 1,
  username: 'player1',
  level: 1,
  xp: 0,
  tokens: 30,
  totalExercisesCompleted: 0,
  streakDays: 0,
  createdAt: new Date().toISOString()
};

// Helper function to calculate XP needed for next level
const calculateXpForLevel = (level: number) => {
  return level * 100;
};

export function GameProvider({ children, initialUsername = 'player1' }: GameProviderProps) {
  const { toast } = useToast();
  
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLevel, setCurrentLevel] = useState<GameLevel | null>(null);
  const [nextLevel, setNextLevel] = useState<GameLevel | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userExercises, setUserExercises] = useState<UserExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  
  // UI visibility states
  const [isLevelIntroVisible, setIsLevelIntroVisible] = useState(false);
  const [isLevelCompleteVisible, setIsLevelCompleteVisible] = useState(false);
  const [isExerciseRecorderVisible, setIsExerciseRecorderVisible] = useState(false);
  
  // Helper function to update level progress
  const updateLevelProgress = () => {
    if (!currentLevel || !currentUser) return;
    
    const exercisesCompleted = userExercises.filter(ue => ue.completed).length;
    const totalExercises = exercises.length;
    const nextLevelXP = nextLevel?.requiredXP || (currentLevel.requiredXP + 100);
    const xpToNextLevel = nextLevelXP - currentUser.xp;
    const progress = Math.min(100, Math.floor((currentUser.xp - currentLevel.requiredXP) / (nextLevelXP - currentLevel.requiredXP) * 100));
    
    // Calculate average score
    const averageScore = userExercises.filter(ue => ue.completed && ue.pronunciationScore)
      .reduce((sum, ue) => sum + (ue.pronunciationScore || 0), 0) / Math.max(1, userExercises.filter(ue => ue.completed && ue.pronunciationScore).length);
    
    setLevelProgress({
      currentLevel,
      nextLevel,
      currentXP: currentUser.xp,
      xpToNextLevel,
      progress,
      exercisesCompleted,
      totalExercises,
    });
    
    // Check if level is complete (all exercises done)
    if (exercisesCompleted === totalExercises && totalExercises > 0 && !isLevelCompleteVisible) {
      setIsLevelCompleteVisible(true);
    }
  };
  
  // Login or create a user
  const loginUser = async (username: string): Promise<User> => {
    try {
      // In a real app, you would make an API call here
      // For now, we'll just use our mock data
      const user = { ...mockUser, username };
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Login Error',
        description: 'Failed to log in or create user account',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  // Start a specific level
  const startLevel = async (levelNumber: number): Promise<void> => {
    try {
      // Only allow levels 1-24 (A-X)
      if (levelNumber < 1 || levelNumber > 24) {
        throw new Error("Invalid level number. Must be between 1 and 24.");
      }
      
      // Generate the letter for the level (A=1, B=2, etc.)
      const letter = String.fromCharCode(64 + levelNumber);
      
      // "Get" the current level
      const level: GameLevel = {
        id: levelNumber,
        levelNumber,
        name: `Level ${letter}: Words that start with ${letter}`,
        description: `Practice pronouncing words that start with the letter ${letter}`,
        requiredXP: (levelNumber - 1) * 100,
        unlockableRewards: { accessory: levelNumber % 3 === 0 ? "headphones" : 
                            levelNumber % 3 === 1 ? "hat" : "outfit" },
        difficulty: levelNumber <= 8 ? "easy" : 
                  levelNumber <= 16 ? "medium" : "hard",
        createdAt: new Date().toISOString()
      };
      
      // "Get" the next level (if it exists)
      const nextLevelNum = levelNumber + 1;
      const nextLevelData: GameLevel | null = nextLevelNum <= 24 ? {
        id: nextLevelNum,
        levelNumber: nextLevelNum,
        name: `Level ${String.fromCharCode(64 + nextLevelNum)}: Words that start with ${String.fromCharCode(64 + nextLevelNum)}`,
        description: `Practice pronouncing words that start with the letter ${String.fromCharCode(64 + nextLevelNum)}`,
        requiredXP: (nextLevelNum - 1) * 100,
        unlockableRewards: { accessory: nextLevelNum % 3 === 0 ? "headphones" : 
                            nextLevelNum % 3 === 1 ? "hat" : "outfit" },
        difficulty: nextLevelNum <= 8 ? "easy" : 
                  nextLevelNum <= 16 ? "medium" : "hard",
        createdAt: new Date().toISOString()
      } : null;
      
      // Get words for this level from our levelWords file
      const words = getWordsForLevel(levelNumber);
      
      // Create exercises based on these words
      const levelExercises: Exercise[] = words.map((word, i) => ({
        id: levelNumber * 100 + i + 1, // Create unique ids for each exercise
        levelId: level.id,
        type: "word",
        content: word,
        difficulty: level.difficulty as "easy" | "medium" | "hard",
        xpReward: level.difficulty === "easy" ? 10 : 
                 level.difficulty === "medium" ? 15 : 20,
        order: i + 1,
        createdAt: new Date().toISOString()
      }));
      
      // "Get" user exercises (or create new ones if they don't exist)
      const userExercisesData = levelExercises.map((exercise) => ({
        id: exercise.id + 1000, // Just a way to get a unique ID
        userId: currentUser?.id || 1,
        exerciseId: exercise.id,
        completed: false,
        attemptCount: 0,
        createdAt: new Date().toISOString()
      }));
      
      // Update state
      setCurrentLevel(level);
      setNextLevel(nextLevelData);
      setExercises(levelExercises);
      setUserExercises(userExercisesData);
      setActiveExerciseId(levelExercises[0].id);
      
      // Show level intro
      setIsLevelIntroVisible(true);
      
    } catch (error) {
      console.error('Error starting level:', error);
      toast({
        title: 'Error',
        description: 'Failed to start level',
        variant: 'destructive'
      });
    }
  };
  
  // Mark the current level as complete
  const completeLevel = async (): Promise<void> => {
    if (!currentUser || !currentLevel) return;
    
    try {
      // Calculate total XP earned
      const totalXpEarned = exercises
        .filter(ex => userExercises.some(ue => ue.exerciseId === ex.id && ue.completed))
        .reduce((sum, ex) => sum + ex.xpReward, 0);
      
      // Update user with new XP and level
      const updatedUser = {
        ...currentUser,
        xp: currentUser.xp + totalXpEarned,
        level: nextLevel ? currentLevel.levelNumber + 1 : currentLevel.levelNumber,
        totalExercisesCompleted: currentUser.totalExercisesCompleted + userExercises.filter(ue => ue.completed).length,
      };
      
      setCurrentUser(updatedUser);
      setIsLevelCompleteVisible(true);
      
    } catch (error) {
      console.error('Error completing level:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete level',
        variant: 'destructive'
      });
    }
  };
  
  // Start an exercise
  const startExercise = (exerciseId: number): void => {
    setActiveExerciseId(exerciseId);
    setIsExerciseRecorderVisible(true);
  };
  
  // Complete an exercise
  const completeExercise = async (exerciseId: number, result: PronunciationAssessmentResult): Promise<void> => {
    if (!currentUser) return;
    
    try {
      // Find the exercise
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;
      
      // Find user exercise
      const userExerciseIndex = userExercises.findIndex(ue => ue.exerciseId === exerciseId);
      if (userExerciseIndex === -1) return;
      
      // Update user exercise
      const updatedUserExercises = [...userExercises];
      updatedUserExercises[userExerciseIndex] = {
        ...updatedUserExercises[userExerciseIndex],
        completed: true,
        pronunciationScore: Math.round(result.pronunciationScore),
        attemptCount: updatedUserExercises[userExerciseIndex].attemptCount + 1,
        lastAttemptAt: new Date().toISOString()
      };
      
      // Award XP and tokens to user
      const tokensAwarded = result.pronunciationScore >= 90 ? 15 : 
                            result.pronunciationScore >= 75 ? 10 : 5;
      
      const updatedUser = {
        ...currentUser,
        xp: currentUser.xp + exercise.xpReward,
        tokens: currentUser.tokens + tokensAwarded
      };
      
      // Update state
      setUserExercises(updatedUserExercises);
      setCurrentUser(updatedUser);
      setIsExerciseRecorderVisible(false);
      
      // Find next incomplete exercise
      const nextIncompleteExercise = exercises
        .filter(ex => !updatedUserExercises.find(ue => ue.exerciseId === ex.id)?.completed)
        .sort((a, b) => a.order - b.order)[0];
      
      // Set next active exercise
      if (nextIncompleteExercise) {
        setActiveExerciseId(nextIncompleteExercise.id);
      }
      
      // Check if level is complete
      if (!nextIncompleteExercise) {
        await completeLevel();
      }
      
    } catch (error) {
      console.error('Error completing exercise:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exercise results',
        variant: 'destructive'
      });
    }
  };
  
  // Close level intro
  const closeLevelIntro = (): void => {
    setIsLevelIntroVisible(false);
  };
  
  // Close exercise recorder
  const closeExerciseRecorder = (): void => {
    setIsExerciseRecorderVisible(false);
  };
  
  // Go back to dashboard
  const continueToDashboard = (): void => {
    setIsLevelCompleteVisible(false);
    // Reset level data
    setCurrentLevel(null);
    setExercises([]);
    setUserExercises([]);
    setActiveExerciseId(null);
  };
  
  // Continue to next level
  const continueToNextLevel = async (): Promise<void> => {
    if (!currentLevel || !nextLevel) return;
    
    setIsLevelCompleteVisible(false);
    await startLevel(nextLevel.levelNumber);
  };
  
  // Update level progress when dependencies change
  useEffect(() => {
    updateLevelProgress();
  }, [currentLevel, exercises, userExercises, currentUser]);
  
  // Initialize with default user if initialUsername is provided
  useEffect(() => {
    if (initialUsername) {
      loginUser(initialUsername);
    }
  }, [initialUsername]);
  
  const contextValue: GameContextType = {
    currentUser,
    currentLevel,
    exercises,
    userExercises,
    activeExerciseId,
    levelProgress,
    isLevelIntroVisible,
    isLevelCompleteVisible,
    isExerciseRecorderVisible,
    
    loginUser,
    startLevel,
    completeLevel,
    startExercise,
    completeExercise,
    closeLevelIntro,
    closeExerciseRecorder,
    continueToDashboard,
    continueToNextLevel
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}