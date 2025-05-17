import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the difficulty levels
export type DifficultyLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

// Map numeric difficulty level to server format
export const mapDifficultyToServer = (diff: DifficultyLevel): string => {
  switch(diff) {
    case '1': return 'very-easy';
    case '2': return 'easy';
    case '3': return 'easy-medium';
    case '4': return 'medium';
    case '5': return 'medium-hard';
    case '6': return 'hard';
    case '7': return 'very-hard';
    case '8': return 'expert';
    default: return 'medium';
  }
};

// Map numeric difficulty level to display name
export const difficultyLevelNames = {
  '1': 'Very Easy',
  '2': 'Easy',
  '3': 'Easy Medium',
  '4': 'Medium',
  '5': 'Medium Hard',
  '6': 'Hard',
  '7': 'Very Hard', 
  '8': 'Expert'
};

// Context type definition
interface DifficultyContextType {
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  hasSelectedDifficulty: boolean;
  setHasSelectedDifficulty: (hasSelected: boolean) => void;
}

// Create the context
const DifficultyContext = createContext<DifficultyContextType | undefined>(undefined);

// Provider component
interface DifficultyProviderProps {
  children: ReactNode;
}

export function DifficultyProvider({ children }: DifficultyProviderProps) {
  // Initialize state from localStorage if available, or default to medium (level 4)
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(() => {
    const savedDifficulty = localStorage.getItem('readAssistDifficulty');
    return (savedDifficulty as DifficultyLevel) || '4';
  });

  // Track whether user has explicitly selected a difficulty level
  const [hasSelectedDifficulty, setHasSelectedDifficulty] = useState<boolean>(() => {
    return localStorage.getItem('readAssistHasSelectedDifficulty') === 'true';
  });

  // Wrapper for setDifficulty that also updates localStorage
  const setDifficulty = (newDifficulty: DifficultyLevel) => {
    setDifficultyState(newDifficulty);
    localStorage.setItem('readAssistDifficulty', newDifficulty);
  };

  // Update localStorage when hasSelectedDifficulty changes
  useEffect(() => {
    localStorage.setItem('readAssistHasSelectedDifficulty', hasSelectedDifficulty.toString());
  }, [hasSelectedDifficulty]);

  // Context value
  const value = {
    difficulty,
    setDifficulty,
    hasSelectedDifficulty,
    setHasSelectedDifficulty,
  };

  return (
    <DifficultyContext.Provider value={value}>
      {children}
    </DifficultyContext.Provider>
  );
}

// Custom hook to use the context
export function useDifficulty() {
  const context = useContext(DifficultyContext);
  if (context === undefined) {
    throw new Error('useDifficulty must be used within a DifficultyProvider');
  }
  return context;
}