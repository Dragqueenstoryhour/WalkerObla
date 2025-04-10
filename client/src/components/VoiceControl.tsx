import { useState, useEffect, useRef } from 'react';
import { FiMic, FiVolume2 } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import useRealTimeVoice from '@/hooks/useRealTimeVoice';
import { generateReadingContent } from '@/lib/openai';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent } from '@/components/ui/card';

const VoiceControl = () => {
  const { toast } = useToast();
  const { setCurrentContent } = useReading();
  const [status, setStatus] = useState<'listening' | 'processing' | 'idle'>('idle');
  const [voicePrompt, setVoicePrompt] = useState(
    "\"Find me an article about gardening\" or \"I want to read about space exploration\""
  );
  const [transcribedText, setTranscribedText] = useState<string>('');
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
    
    // Clean up old URL if it exists
    if (audioRef.current.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    
    // Set the new audio source and play it
    audioRef.current.src = url;
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play().catch(err => console.error('Error playing audio:', err));
  };

  // Handler for voice command results
  const handleVoiceResult = async (result: { action: string; topic?: string; parameters?: any }) => {
    if (result.action === 'generateContent' && result.topic) {
      try {
        // Generate content based on the topic
        const content = await generateReadingContent(result.topic, result.parameters?.difficulty || 'easy');
        setCurrentContent(content);
        toast({
          title: "Content Generated",
          description: `Generated content about "${result.topic}"`,
        });
      } catch (error) {
        console.error("Error generating content:", error);
        toast({
          title: "Error",
          description: "Failed to generate content",
          variant: "destructive",
        });
      }
    }
  };

  // Set up realtime voice recognition
  const { 
    isListening, 
    isProcessing,
    transcribedText: realtimeTranscript, 
    startListening, 
    stopListening 
  } = useRealTimeVoice({
    onVoiceResult: handleVoiceResult,
    onVoiceResponse: handleVoiceResponse,
    onStreamingResponse: (text) => setTranscribedText(text),
    onError: (error) => {
      console.error('Voice recognition error:', error);
      toast({
        title: "Voice Recognition Error",
        description: error.message,
        variant: "destructive",
      });
      setStatus('idle');
    },
  });

  // Update component status based on realtime hook state
  useEffect(() => {
    if (isListening) {
      setStatus('listening');
    } else if (isProcessing) {
      setStatus('processing');
    } else {
      setStatus('idle');
    }
    
    // If we have a transcript from the realtime service, use it
    if (realtimeTranscript) {
      setTranscribedText(realtimeTranscript);
    }
  }, [isListening, isProcessing, realtimeTranscript]);

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
      // Clear previous transcript before starting new listening session
      setTranscribedText('');
      startListening();
    } else if (status === 'listening') {
      stopListening();
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Voice Control</h2>
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${
              status === 'listening' 
                ? 'bg-success animate-pulse' 
                : status === 'processing' 
                  ? 'bg-accent' 
                  : 'bg-secondary'
            }`} />
            <span>
              {status === 'listening' 
                ? 'Listening' 
                : status === 'processing' 
                  ? 'Processing' 
                  : 'Microphone off'}
            </span>
          </div>
        </div>
        
        <div className="bg-secondary bg-opacity-30 rounded-lg p-4 flex items-center">
          <button 
            onClick={toggleListening}
            className={`${
              status === 'listening' ? 'bg-red-500' : 'bg-primary'
            } text-white rounded-full p-2 mr-4 cursor-pointer hover:bg-opacity-90 transition-all`}
            aria-label={status === 'listening' ? 'Stop listening' : 'Start listening'}
          >
            <FiMic className="w-6 h-6" />
          </button>
          <div className="flex-1">
            {transcribedText ? (
              <div className="animate-pulse">
                <p className="text-sm text-textColor opacity-70 mb-1">I heard:</p>
                <p className="font-medium">{transcribedText}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-textColor opacity-70 mb-1">Try saying:</p>
                <p className="font-medium">{voicePrompt}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceControl;
