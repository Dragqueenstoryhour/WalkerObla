import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WordPracticeCard from './WordPracticeCard';

// Mock the useWordRecording hook
jest.mock('../hooks/useWordRecording', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isRecording: false,
    isProcessing: false,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
    audioBlob: null,
    recordingUrl: null,
    assessmentResult: null,
    error: null,
  })),
}));

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Mock the lucide-react icons if they cause issues in tests (though usually not needed for simple rendering)
jest.mock('lucide-react', () => ({
  MicIcon: 'MicIcon',
  StopCircleIcon: 'StopCircleIcon',
  RotateCw: 'RotateCw',
  Volume2: 'Volume2',
  Ear: 'Ear',
  Star: 'Star',
  Check: 'Check',
  Snail: 'Snail',
}));

describe('WordPracticeCard', () => {
  const mockIssue = {
    word: 'example',
    phonetic: 'ɪɡˈzæmpəl',
    syllabication: 'ex-am-ple',
    score: 65,
    id: 'test-id',
    status: 'idle',
  };

  const mockOnSaveWord = jest.fn();
  const mockOnPlayTextToSpeech = jest.fn();
  const mockToggleSlowPlayback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with word and syllabication', () => {
    render(
      <WordPracticeCard
        issue={mockIssue}
        onSaveWord={mockOnSaveWord}
        onPlayTextToSpeech={mockOnPlayTextToSpeech}
        isSlowPlayback={false}
        toggleSlowPlayback={mockToggleSlowPlayback}
        isCurrentlyPracticing={false}
      />
    );

    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('ex-am-ple')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Practice This Word/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('calls onPlayTextToSpeech when Hear button is clicked', () => {
    render(
      <WordPracticeCard
        issue={mockIssue}
        onSaveWord={mockOnSaveWord}
        onPlayTextToSpeech={mockOnPlayTextToSpeech}
        isSlowPlayback={false}
        toggleSlowPlayback={mockToggleSlowPlayback}
        isCurrentlyPracticing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Hear/i }));
    expect(mockOnPlayTextToSpeech).toHaveBeenCalledWith(mockIssue.word, 1.0);
  });

  it('calls onSaveWord when Save button is clicked', () => {
    render(
      <WordPracticeCard
        issue={mockIssue}
        onSaveWord={mockOnSaveWord}
        onPlayTextToSpeech={mockOnPlayTextToSpeech}
        isSlowPlayback={false}
        toggleSlowPlayback={mockToggleSlowPlayback}
        isCurrentlyPracticing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockOnSaveWord).toHaveBeenCalledWith(mockIssue.word);
  });

  // Add more tests for different states (recording, processing, complete) and interactions
});
