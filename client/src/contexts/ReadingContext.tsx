import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReadingContent, ReadingSession, PronunciationAssessmentResult } from '@/lib/types';

interface ReadingContextType {
  // Current reading state
  isReading: boolean;
  isPaused: boolean;
  currentContent: ReadingContent | null;
  currentSession: ReadingSession | null;
  currentHighlightedText: string;
  pronunciationResults: PronunciationAssessmentResult | null;
  
  // Actions
  startReading: () => void;
  pauseReading: () => void;
  resumeReading: () => void;
  stopReading: () => void;
  setCurrentContent: (content: ReadingContent) => void;
  updateSessionProgress: (wordsRead: number) => void;
  setHighlightedText: (text: string) => void;
  setPronunciationResults: (results: PronunciationAssessmentResult) => void;
  resetSession: () => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export function useReading() {
  const context = useContext(ReadingContext);
  if (context === undefined) {
    throw new Error('useReading must be used within a ReadingProvider');
  }
  return context;
}

interface ReadingProviderProps {
  children: ReactNode;
}

export function ReadingProvider({ children }: ReadingProviderProps) {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentContent, setCurrentContent] = useState<ReadingContent | null>(null);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [currentHighlightedText, setCurrentHighlightedText] = useState('');
  const [pronunciationResults, setPronunciationResults] = useState<PronunciationAssessmentResult | null>(null);

  // Initialize a new session when content changes
  useEffect(() => {
    if (currentContent) {
      setCurrentSession({
        id: -1, // Temporary ID until saved
        contentId: currentContent.id,
        wordsRead: 0,
        createdAt: new Date().toISOString(),
      });
    } else {
      setCurrentSession(null);
    }
  }, [currentContent]);

  const startReading = () => {
    setIsReading(true);
    setIsPaused(false);
  };

  const pauseReading = () => {
    setIsPaused(true);
  };

  const resumeReading = () => {
    setIsPaused(false);
  };

  const stopReading = () => {
    setIsReading(false);
    setIsPaused(false);
  };

  const updateSessionProgress = (wordsRead: number) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        wordsRead,
      });
    }
  };

  const setHighlightedText = (text: string) => {
    setCurrentHighlightedText(text);
  };

  const resetSession = () => {
    setIsReading(false);
    setIsPaused(false);
    setCurrentSession(null);
    setPronunciationResults(null);
    setCurrentHighlightedText('');
  };

  const value: ReadingContextType = {
    isReading,
    isPaused,
    currentContent,
    currentSession,
    currentHighlightedText,
    pronunciationResults,
    startReading,
    pauseReading,
    resumeReading,
    stopReading,
    setCurrentContent,
    updateSessionProgress,
    setHighlightedText,
    setPronunciationResults,
    resetSession,
  };

  return (
    <ReadingContext.Provider value={value}>
      {children}
    </ReadingContext.Provider>
  );
}
