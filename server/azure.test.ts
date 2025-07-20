import { assessPronunciation, getWordPronunciation } from './azure';
import fs from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Mock child_process.spawn to prevent actual ffmpeg execution during tests
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        // Simulate successful ffmpeg exit
        callback(0);
      }
    }),
  })),
  execSync: jest.fn(() => 'mock ffmpeg info'),
}));

// Mock fs module for file operations
jest.mock('fs', () => ({
  __esModule: true,
  default: {
    existsSync: jest.fn(() => true), // Assume files exist for simplicity
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    statSync: jest.fn(() => ({ size: 1000 })), // Simulate a non-empty file
    promises: {
      readFile: jest.fn(() => Promise.resolve(Buffer.from('mock audio data'))),
    },
  },
}));

// Mock Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn(() => ({ setProperty: jest.fn(), speechRecognitionLanguage: '' })),
  },
  PronunciationAssessmentConfig: jest.fn(() => ({
    applyTo: jest.fn(),
  })),
  AudioConfig: {
    fromWavFileInput: jest.fn(),
  },
  SpeechRecognizer: jest.fn(() => ({
    recognizeOnceAsync: jest.fn((resolve) => resolve({
      reason: 8, // sdk.ResultReason.RecognizedSpeech
      text: 'mock recognized text',
      properties: {
        getProperty: jest.fn(() => JSON.stringify({
          NBest: [{
            Words: [],
            PronunciationAssessment: { PronScore: 90, AccuracyScore: 85, FluencyScore: 92, CompletenessScore: 95 }
          }]
        })),
      },
    })),
    close: jest.fn(),
    sessionStarted: jest.fn(),
    recognizing: jest.fn(),
    recognized: jest.fn(),
    canceled: jest.fn(),
    sessionStopped: jest.fn(),
  })),
  ResultReason: {
    RecognizedSpeech: 8,
    NoMatch: 1,
    Canceled: 2,
  },
  CancellationDetails: {
    fromResult: jest.fn(() => ({ reason: 0, errorDetails: '' })),
    CancellationReason: { Error: 0 },
  },
  PronunciationAssessmentResult: {
    fromResult: jest.fn(() => ({
      pronunciationScore: 90,
      accuracyScore: 85,
      fluencyScore: 92,
      completenessScore: 95,
      prosodyScore: 88,
    })),
  },
}));

describe('Azure Utilities', () => {
  describe('assessPronunciation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset mock for fs.promises.readFile for each test
      (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from('mock audio data'));
      // Ensure speechKey is set for tests
      process.env.SPEECH_KEY = 'test-key';
      process.env.SPEECH_REGION = 'test-region';
    });

    it('should assess pronunciation successfully', async () => {
      const audioBuffer = Buffer.from('test audio');
      const referenceText = 'Hello world';

      const result = await assessPronunciation(audioBuffer, referenceText);

      expect(result).toBeDefined();
      expect(result.pronunciationScore).toBe(90);
      expect(spawn).toHaveBeenCalled();
      expect(fs.default.writeFileSync).toHaveBeenCalled();
      expect(fs.default.unlinkSync).toHaveBeenCalled();
    });

    it('should throw error if no audio file provided', async () => {
      const audioBuffer = Buffer.from('');
      const referenceText = 'Hello world';

      await expect(assessPronunciation(audioBuffer, referenceText)).rejects.toThrow(
        'Empty or invalid audio buffer provided for conversion'
      );
    });

    it('should throw error if no reference text provided', async () => {
      const audioBuffer = Buffer.from('test audio');
      const referenceText = '';

      await expect(assessPronunciation(audioBuffer, referenceText)).rejects.toThrow(
        'Reference text cannot be empty for pronunciation assessment'
      );
    });

    it('should handle Azure SDK NoMatch reason', async () => {
      // Mock recognizeOnceAsync to return NoMatch
      (require('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer as jest.Mock).mockImplementationOnce(() => ({
        recognizeOnceAsync: jest.fn((resolve, reject) => resolve({
          reason: require('microsoft-cognitiveservices-speech-sdk').ResultReason.NoMatch,
          properties: { getProperty: jest.fn(() => '{}') },
        })),
        close: jest.fn(),
        sessionStarted: jest.fn(),
        recognizing: jest.fn(),
        recognized: jest.fn(),
        canceled: jest.fn(),
        sessionStopped: jest.fn(),
      }));

      const audioBuffer = Buffer.from('test audio');
      const referenceText = 'Hello world';

      await expect(assessPronunciation(audioBuffer, referenceText)).rejects.toThrow(
        'No speech could be recognized from the audio'
      );
    });
  });

  describe('getWordPronunciation', () => {
    it('should return phonetic for known words', async () => {
      expect(await getWordPronunciation('important')).toBe('im-POR-tant (3 syllables)');
    });

    it('should return basic syllabication for unknown words (single syllable)', async () => {
      expect(await getWordPronunciation('cat')).toBe('CAT (1 syllable)');
    });

    it('should return basic syllabication for unknown words (multiple syllables)', async () => {
      expect(await getWordPronunciation('syllable')).toBe('SYL-LA-BLE (3 syllables)');
    });
  });
});
