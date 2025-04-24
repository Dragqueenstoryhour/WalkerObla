// Common types for the application

export interface ReadingContent {
  id: number;
  title: string;
  content: string;
  source: string;
  wordCount: number;
  readingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface ReadingSession {
  id: number;
  userId?: number;
  contentId: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  wordsRead?: number;
  feedback?: ReadingFeedback;
  recordingUrl?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReadingFeedback {
  generalFeedback: string;
  pronunciationIssues: PronunciationIssue[];
  suggestedExercises: SuggestedExercise[];
}

export interface PronunciationIssue {
  word: string;
  phonetic: string;
  score: number;
}

export interface SuggestedExercise {
  title: string;
  description: string;
  type: 'pronunciation' | 'fluency' | 'rhythm';
}

export interface Settings {
  voiceFeedbackVolume: number;
  readingSpeed: 'slow' | 'medium' | 'fast';
  voiceAssistant: 'default' | 'male' | 'child';
  textHighlighting: boolean;
  darkMode: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export interface PronunciationAssessmentResult {
  pronunciationScore: number;
  fluencyScore: number;
  completenessScore: number;
  accuracyScore: number;
  prosodyScore?: number;  // Added prosody score from Azure documentation
  wordLevelResults: {
    word: string;
    accuracyScore: number;
    errorType?: string;  // None, Omission, Insertion, Mispronunciation, UnexpectedBreak, MissingBreak, Monotone
  }[];
}

// User and Progress Types for Gamified System
export interface User {
  id: number;
  username: string;
  level: number;
  xp: number;
  totalExercisesCompleted: number;
  streakDays: number;
  lastActivityDate?: string;
  unlockedRewards?: any;
  tokens: number;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  userId: number;
  displayName?: string;
  avatarStyle?: AvatarStyle;
  selectedRewards?: SelectedRewards;
  createdAt: string;
  updatedAt: string;
}

export interface AvatarStyle {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  faceShape: string;
  eyeColor: string;
  eyebrowStyle: string;
  noseStyle: string;
  mouthStyle: string;
  facialHair?: string;
  glasses?: string;
}

export interface SelectedRewards {
  hat?: string;
  outfit?: string;
  accessory?: string | string[];
  background?: string;
  badge?: string;
  // Special accessory types for characters
  sunglasses?: boolean;
  visor?: boolean;
  chain?: boolean;
}

export interface GameLevel {
  id: number;
  levelNumber: number;
  name: string;
  description: string;
  requiredXP: number;
  unlockableRewards?: any;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  isCompleted?: boolean;
  exercises?: number; // Number of exercises in this level
  createdAt?: string;
}

export interface Exercise {
  id: number;
  levelId: number;
  type: 'word' | 'phrase' | 'sentence';
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  order: number;
  createdAt: string;
}

export interface UserExercise {
  id: number;
  userId: number;
  exerciseId: number;
  levelId?: number; // Added for easier filtering by level
  completed: boolean;
  isCompleted?: boolean; // Alias for completed to support both naming patterns
  pronunciationScore?: number;
  score?: number; // Alias for pronunciationScore 
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
}

export interface LevelProgress {
  currentLevel: GameLevel;
  nextLevel?: GameLevel | null;
  currentXP: number;
  xpToNextLevel: number;
  progress: number; // 0-100 percentage
  exercisesCompleted: number;
  totalExercises: number;
  isLevelCompleted?: boolean; // Flag to indicate if level was just completed
}

export type MedalType = 'bronze' | 'silver' | 'gold';
