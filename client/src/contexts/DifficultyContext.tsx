import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the difficulty levels
export type DifficultyLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

// Define the context types for different practice modes
export type PracticeMode = 'words' | 'phrases' | 'reading';

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

// Updated context type definition for separate difficulty levels
interface DifficultyContextType {
  // Current active difficulty (based on current page/mode)
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  
  // Individual difficulty levels for each mode
  wordsDifficulty: DifficultyLevel;
  phrasesDifficulty: DifficultyLevel;
  readingDifficulty: DifficultyLevel;
  
  // Setters for individual difficulties
  setWordsDifficulty: (difficulty: DifficultyLevel) => void;
  setPhrasesDifficulty: (difficulty: DifficultyLevel) => void;
  setReadingDifficulty: (difficulty: DifficultyLevel) => void;
  
  // Current practice mode
  currentMode: PracticeMode;
  setCurrentMode: (mode: PracticeMode) => void;
  
  // Selection tracking
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
  // Initialize individual difficulty levels from localStorage with defaults
  const [wordsDifficulty, setWordsDifficultyState] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('readAssistWordsDifficulty');
    return (saved as DifficultyLevel) || '2';
  });

  const [phrasesDifficulty, setPhrasesDifficultyState] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('readAssistPhrasesDifficulty');
    return (saved as DifficultyLevel) || '2';
  });

  const [readingDifficulty, setReadingDifficultyState] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('readAssistReadingDifficulty');
    return (saved as DifficultyLevel) || '2';
  });

  // Current practice mode state
  const [currentMode, setCurrentModeState] = useState<PracticeMode>(() => {
    const saved = localStorage.getItem('readAssistCurrentMode');
    return (saved as PracticeMode) || 'words';
  });

  // Track whether user has explicitly selected a difficulty level
  const [hasSelectedDifficulty, setHasSelectedDifficulty] = useState<boolean>(() => {
    return localStorage.getItem('readAssistHasSelectedDifficulty') === 'true';
  });

  // Current active difficulty based on mode
  const difficulty = currentMode === 'words' ? wordsDifficulty : 
                   currentMode === 'phrases' ? phrasesDifficulty : 
                   readingDifficulty;

  // Wrappers for individual difficulty setters that update localStorage
  const setWordsDifficulty = (newDifficulty: DifficultyLevel) => {
    setWordsDifficultyState(newDifficulty);
    localStorage.setItem('readAssistWordsDifficulty', newDifficulty);
  };

  const setPhrasesDifficulty = (newDifficulty: DifficultyLevel) => {
    setPhrasesDifficultyState(newDifficulty);
    localStorage.setItem('readAssistPhrasesDifficulty', newDifficulty);
  };

  const setReadingDifficulty = (newDifficulty: DifficultyLevel) => {
    setReadingDifficultyState(newDifficulty);
    localStorage.setItem('readAssistReadingDifficulty', newDifficulty);
  };

  // Set current mode and update localStorage
  const setCurrentMode = (mode: PracticeMode) => {
    console.log(`DifficultyContext: Setting mode from ${currentMode} to ${mode}`);
    setCurrentModeState(mode);
    localStorage.setItem('readAssistCurrentMode', mode);
  };

  // Generic setDifficulty that updates the current mode's difficulty
  const setDifficulty = (newDifficulty: DifficultyLevel) => {
    switch (currentMode) {
      case 'words':
        setWordsDifficulty(newDifficulty);
        break;
      case 'phrases':
        setPhrasesDifficulty(newDifficulty);
        break;
      case 'reading':
        setReadingDifficulty(newDifficulty);
        break;
    }
  };

  // Update localStorage when hasSelectedDifficulty changes
  useEffect(() => {
    localStorage.setItem('readAssistHasSelectedDifficulty', hasSelectedDifficulty.toString());
  }, [hasSelectedDifficulty]);

  // Context value
  const value = {
    difficulty,
    setDifficulty,
    wordsDifficulty,
    phrasesDifficulty,
    readingDifficulty,
    setWordsDifficulty,
    setPhrasesDifficulty,
    setReadingDifficulty,
    currentMode,
    setCurrentMode,
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

// Utility function to get display label for difficulty selector based on current mode
export function getDifficultyLabel(mode: PracticeMode): string {
  switch (mode) {
    case 'words':
      return 'Words Level';
    case 'phrases':
      return 'Phrases Level';
    case 'reading':
      return 'Reading Level';
    default:
      return 'Level';
  }
}

// Custom hook for managing mode-specific difficulty
export function useModeSpecificDifficulty() {
  const context = useDifficulty();
  
  // Function to get difficulty for a specific mode
  const getDifficultyForMode = (mode: PracticeMode): DifficultyLevel => {
    switch (mode) {
      case 'words':
        return context.wordsDifficulty;
      case 'phrases':
        return context.phrasesDifficulty;
      case 'reading':
        return context.readingDifficulty;
    }
  };

  // Function to set difficulty for a specific mode
  const setDifficultyForMode = (mode: PracticeMode, difficulty: DifficultyLevel) => {
    switch (mode) {
      case 'words':
        context.setWordsDifficulty(difficulty);
        break;
      case 'phrases':
        context.setPhrasesDifficulty(difficulty);
        break;
      case 'reading':
        context.setReadingDifficulty(difficulty);
        break;
    }
  };

  return {
    ...context,
    getDifficultyForMode,
    setDifficultyForMode,
    difficultyLabel: getDifficultyLabel(context.currentMode),
  };
}