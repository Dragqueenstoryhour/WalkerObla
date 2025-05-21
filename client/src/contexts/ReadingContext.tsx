import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReadingContent, ReadingSession, PronunciationAssessmentResult } from '@/lib/types';
import { useAuthContext } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Define statistics for user reading activities
interface UserReadingStats {
  articlesRead: number;
  totalWordsRead: number;
  readingTimeMinutes: number;
  lastReadAt: string | null;
}

interface ReadingContextType {
  // Current reading state
  isReading: boolean;
  isPaused: boolean;
  currentContent: ReadingContent | null;
  currentSession: ReadingSession | null;
  currentHighlightedText: string;
  pronunciationResults: PronunciationAssessmentResult | null;
  userStats: UserReadingStats;
  
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
  completeArticle: (contentId: number) => Promise<void>;
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
  const { isAuthenticated, user } = useAuthContext();
  const queryClient = useQueryClient();
  
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentContent, setCurrentContent] = useState<ReadingContent | null>(null);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [currentHighlightedText, setCurrentHighlightedText] = useState('');
  const [pronunciationResults, setPronunciationResults] = useState<PronunciationAssessmentResult | null>(null);
  const [userStats, setUserStats] = useState<UserReadingStats>({
    articlesRead: 0,
    totalWordsRead: 0,
    readingTimeMinutes: 0,
    lastReadAt: null
  });

  // Fetch user's reading stats when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // In a production app, you would fetch these from an API endpoint
      // For now, we'll get them from localStorage to persist between sessions
      const storedStats = localStorage.getItem(`reading-stats-${user.id}`);
      if (storedStats) {
        try {
          setUserStats(JSON.parse(storedStats));
        } catch (error) {
          console.error('Error parsing stored reading stats:', error);
        }
      }
    }
  }, [isAuthenticated, user]);

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

  // Function to mark an article as completed and update stats
  const completeArticle = async (contentId: number) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping article completion tracking');
      return;
    }

    try {
      // Update local stats
      const newStats = {
        ...userStats,
        articlesRead: userStats.articlesRead + 1,
        totalWordsRead: userStats.totalWordsRead + (currentContent?.wordCount || 0),
        readingTimeMinutes: userStats.readingTimeMinutes + Math.round((currentContent?.readingTime || 0) / 60),
        lastReadAt: new Date().toISOString()
      };
      
      setUserStats(newStats);
      
      // Store updated stats in localStorage
      localStorage.setItem(`reading-stats-${user.id}`, JSON.stringify(newStats));
      
      // In a production app, you would also send this to an API endpoint
      // For example:
      // await apiRequest('/api/user/reading-stats', { method: 'POST', data: { 
      //   contentId, 
      //   userId: user.id,
      //   wordCount: currentContent?.wordCount,
      //   readingTime: currentContent?.readingTime
      // }});

      // Invalidate any cache related to user stats
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      
      console.log(`Article ${contentId} marked as read for user ${user.id}`);
    } catch (error) {
      console.error('Error updating reading stats:', error);
    }
  };

  const value: ReadingContextType = {
    isReading,
    isPaused,
    currentContent,
    currentSession,
    currentHighlightedText,
    pronunciationResults,
    userStats,
    startReading,
    pauseReading,
    resumeReading,
    stopReading,
    setCurrentContent,
    updateSessionProgress,
    setHighlightedText,
    setPronunciationResults,
    resetSession,
    completeArticle
  };

  return (
    <ReadingContext.Provider value={value}>
      {children}
    </ReadingContext.Provider>
  );
}
