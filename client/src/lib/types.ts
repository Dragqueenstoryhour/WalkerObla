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
  wordLevelResults: {
    word: string;
    accuracyScore: number;
    errorType?: string;
  }[];
}
