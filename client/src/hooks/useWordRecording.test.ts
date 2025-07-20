import { renderHook, act } from '@testing-library/react';
import useWordRecording from './useWordRecording';

// Mock necessary modules and functions
// Mock MediaRecorder and related APIs
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive',
  mimeType: 'audio/webm',
};

const mockMediaStream = {
  getTracks: jest.fn(() => [{
    stop: jest.fn()
  }]),
};

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn(() => mockMediaRecorder),
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
  },
});

// Mock fetch API for assessment
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      pronunciationScore: 90,
      accuracyScore: 85,
      fluencyScore: 92,
      completenessScore: 95,
      wordLevelResults: [],
    }),
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.Mock;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('useWordRecording', () => {
  let capturedWord: string | null = null;
  let capturedItemType: string | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
    capturedWord = null;
    capturedItemType = null;

    // Reset fetch mock for each test
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          pronunciationScore: 90,
          accuracyScore: 85,
          fluencyScore: 92,
          completenessScore: 95,
          wordLevelResults: [],
        }),
        blob: () => Promise.resolve(new Blob()),
      })
    );
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useWordRecording());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.recordingUrl).toBeNull();
    expect(result.current.assessmentResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should start recording', async () => {
    const { result } = renderHook(() => useWordRecording());

    await act(async () => {
      result.current.startRecording('hello', 'word');
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
    expect(result.current.isRecording).toBe(true);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Recording Started' }));
  });

  it('should stop recording and process audio', async () => {
    const { result } = renderHook(() => useWordRecording());

    await act(async () => {
      result.current.startRecording('hello', 'word');
    });

    // Simulate data being available
    const audioData = new Blob(['test audio'], { type: 'audio/webm' });
    act(() => {
      mockMediaRecorder.ondataavailable({ data: audioData });
    });

    // Simulate stopping the recorder
    mockMediaRecorder.state = 'inactive';
    await act(async () => {
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(mockMediaStream.getTracks).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.audioBlob).toBeInstanceOf(Blob);
    expect(result.current.recordingUrl).toBe('blob:http://localhost/mock-url');
    expect(result.current.assessmentResult).toEqual(expect.objectContaining({ pronunciationScore: 90 }));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/pronunciation/assess',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Assessment Complete' }));
  });

  it('should handle microphone access error', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
    const { result } = renderHook(() => useWordRecording());

    await act(async () => {
      result.current.startRecording('test', 'word');
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Microphone Error' }));
  });

  it('should handle assessment API error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'API error' }),
      })
    );

    const { result } = renderHook(() => useWordRecording());

    await act(async () => {
      result.current.startRecording('error', 'word');
    });

    const audioData = new Blob(['test audio'], { type: 'audio/webm' });
    act(() => {
      mockMediaRecorder.ondataavailable({ data: audioData });
    });

    mockMediaRecorder.state = 'inactive';
    await act(async () => {
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('API error');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Assessment Error' }));
  });

  it('should cancel recording', async () => {
    const { result } = renderHook(() => useWordRecording());

    await act(async () => {
      result.current.startRecording('cancel', 'word');
    });

    act(() => {
      result.current.cancelRecording();
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(mockMediaStream.getTracks).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.recordingUrl).toBeNull();
    expect(result.current.assessmentResult).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Practice Cancelled' }));
  });
});