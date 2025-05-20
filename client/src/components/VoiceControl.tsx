// This file is no longer used in the updated Read.tsx page, but kept for reference.


import { useState, useEffect, useRef } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import useEnhancedVoice from '@/hooks/useEnhancedVoice';
import { generateReadingContent } from '@/lib/openai';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent } from '@/components/ui/card';

const VoiceControl = () => {
  const { toast } = useToast();
  const { setCurrentContent } = useReading();
  const [status, setStatus] = useState<'listening' | 'processing' | 'idle'>('idle');
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handler for when audio response is received
  const handleVoiceResponse = (audioData: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    // Create a blob URL from the base64 audio data
    const blob = new Blob([Buffer.from(audioData, 'base64')], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    // Update transcribed text immediately for real-time feedback
    if (transcribedText) {
      const wordCount = transcribedText.split(/\s+/).length;
      setCurrentContent({
        id: Date.now(),
        title: 'Voice Input',
        content: transcribedText,
        source: 'Voice Recognition',
        wordCount: wordCount,
        readingTime: wordCount * 3, // Estimate 3 seconds per word
        difficulty: 'medium',
        createdAt: new Date().toISOString(),
      });
    }

    // Clean up old URL if it exists
    if (audioRef.current.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }

    // Set the new audio source and play it
    audioRef.current.src = url;
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play().catch((err) => console.error('Error playing audio:', err));
  };

  // Handler for voice command results
  const handleVoiceResult = async (result: { action: string; topic?: string; parameters?: { difficulty?: string }; message?: string }) => {
    if (result.action === 'generateContent' && result.topic) {
      try {
        // Validate and sanitize difficulty
        const difficulty = /^[1-8]$/.test(result.parameters?.difficulty)
          ? result.parameters.difficulty
          : '1'; // Default to '1' if invalid or missing

        console.log(`Generating content about "${result.topic}" with difficulty "${difficulty}"`);

        // Set confirmation message
        setConfirmationMessage(result.message || `I'll find a reading article on ${result.topic} for you.`);

        // Generate content based on the topic and difficulty
        const content = await generateReadingContent(result.topic, difficulty);
        setCurrentContent({ ...content, topic: result.topic }); // Preserve topic
        toast({
          title: 'Content Generated',
          description: `Generated content about "${result.topic}"`,
        });
      } catch (error) {
        console.error('Error generating content:', error);
        setConfirmationMessage('');
        toast({
          title: 'Error',
          description: 'Failed to generate content',
          variant: 'destructive',
        });
      }
    } else {
      // Set confirmation message for non-content actions
      setConfirmationMessage(result.message || 'I understood your request.');
    }
  };

  // Set up enhanced voice recognition with GPT-4o
  const {
    isListening,
    isProcessing,
    transcribedText: enhancedTranscript,
    startListening,
    stopListening,
  } = useEnhancedVoice({
    onVoiceResult: handleVoiceResult,
    onAudioResponse: (audioUrl) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioUrl;
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play().catch((err) => console.error('Error playing audio:', err));
    },
    onTranscript: (text) => setTranscribedText(text),
    onError: (error) => {
      console.error('Voice recognition error:', error);
      setConfirmationMessage('');
      toast({
        title: 'Voice Recognition Error',
        description: error.message,
        variant: 'destructive',
      });
      setStatus('idle');
    },
  });

  // Update component status based on enhanced voice hook state
  useEffect(() => {
    if (isListening) {
      setStatus('listening');
    } else if (isProcessing) {
      setStatus('processing');
    } else {
      setStatus('idle');
    }

    // If we have a transcript from the enhanced voice service, use it
    if (enhancedTranscript) {
      setTranscribedText(enhancedTranscript);
    }
  }, [isListening, isProcessing, enhancedTranscript]);

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const toggleListening = () => {
    if (status === 'idle') {
      // Clear previous transcript and confirmation before starting new listening session
      setTranscribedText('');
      setConfirmationMessage('');
      startListening();
    } else if (status === 'listening') {
      stopListening();
    }
  };

  return (
    <Card className="mb-6 bg-green-50">
      <CardContent className="p-4">
        {/* Microphone button, centered and twice as large */}
        <div className="mb-2 flex justify-center">
          <button
            onClick={toggleListening}
            className={`relative flex items-center justify-center w-20 h-20 rounded-md p-4 cursor-pointer hover:bg-opacity-90 transition-all
              ${status === 'listening' ? 'bg-red-500' : status === 'processing' ? 'bg-yellow-500' : 'bg-blue-900'}
              ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={
              status === 'listening'
                ? 'Stop listening'
                : status === 'processing'
                ? 'Processing'
                : 'Start listening'
            }
            disabled={isPlaying || status === 'processing'}
          >
            <div className="relative w-full h-full">
              {status === 'processing' ? (
                <span className="absolute inset-0 flex items-center justify-center text-4xl text-white animate-[flash_1s_infinite_ease-in-out]">
                  💡
                </span>
              ) : (
                <>
                  <span className="absolute inset-0 flex items-center justify-center text-4xl text-white animate-[pulse_1.5s_infinite_ease-in-out] [text-shadow:0_0_20px_rgba(59,130,246,0.8)]">
                    🎤
                  </span>
                  {status === 'listening' && (
                    <>
                      {/* If you want these wave animations to also have slightly rounded corners,
                          you would add 'rounded-md' to their classNames as well. */}
                      <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] opacity-0" />
                      <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:0.5s] opacity-0" />
                      <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-[wave_2s_infinite_ease-out] [animation-delay:1s] opacity-0" />
                    </>
                  )}
                </>
              )}
            </div>
          </button>
        </div>

        <div className="bg-secondary bg-opacity-30 rounded-lg p-3 flex items-center">
          <div className="flex items-center mr-3">
            {isPlaying && (
              <div className="rounded-full bg-accent p-2 animate-pulse">
                <FiVolume2 className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1">
            {status === 'processing' ? (
              <div>
                <p className="text-sm text-textColor opacity-70 mb-1">Processing:</p>
                <p className="font-medium">Thinking...</p>
              </div>
            ) : transcribedText || confirmationMessage ? (
              <div className={isPlaying ? 'border-l-4 border-accent pl-3' : ''}>
                <p className="text-sm text-textColor opacity-70 mb-1">
                  {isPlaying ? 'AI Response:' : confirmationMessage ? 'ReadAssist:' : 'I heard:'}
                </p>
                <p className="font-medium">
                  {isPlaying || confirmationMessage ? confirmationMessage : transcribedText}
                </p>
                {isPlaying && (
                  <div className="mt-1 pt-1 border-t border-gray-200 text-sm text-textColor opacity-90 italic">
                    <p>ReadAssist is speaking...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>Press the microphone button to start speaking</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Inline CSS keyframes for animations
const styles = `
@keyframes pulse {
  0% {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
  50% {
    transform: scale(1.2);
    text-shadow: 0 0 40px rgba(59, 130, 246, 1);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
}

@keyframes wave {
  0% {
    transform: scale(0.5);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes flash {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default VoiceControl;