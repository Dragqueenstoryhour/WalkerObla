import { useState, useEffect, useRef } from 'react';
import { FiMic, FiVolume2 } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import useEnhancedVoice from '@/hooks/useEnhancedVoice';
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
    
    // Update transcribed text immediately for real-time feedback
    if (transcribedText) {
      setCurrentContent({
        id: Date.now(),
        title: "Voice Input",
        content: transcribedText,
        difficulty: "medium"
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

  // Set up enhanced voice recognition with GPT-4o
  const { 
    isListening, 
    isProcessing,
    transcribedText: enhancedTranscript, 
    startListening, 
    stopListening 
  } = useEnhancedVoice({
    onVoiceResult: handleVoiceResult,
    onAudioResponse: (audioUrl) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioUrl;
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play().catch(err => console.error('Error playing audio:', err));
    },
    onTranscript: (text) => setTranscribedText(text),
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
          <div className="flex items-center mr-4">
            <button 
              onClick={toggleListening}
              className={`${
                status === 'listening' ? 'bg-red-500' : 'bg-primary'
              } text-white rounded-full p-2 mr-2 cursor-pointer hover:bg-opacity-90 transition-all`}
              aria-label={status === 'listening' ? 'Stop listening' : 'Start listening'}
              disabled={isPlaying}
            >
              <FiMic className="w-6 h-6" />
            </button>
            
            {isPlaying && (
              <div className="rounded-full bg-accent p-2 animate-pulse">
                <FiVolume2 className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            {transcribedText ? (
              <div className={isPlaying ? "border-l-4 border-accent pl-3" : "animate-pulse"}>
                <p className="text-sm text-textColor opacity-70 mb-1">
                  {isPlaying ? "AI Response:" : "I heard:"}
                </p>
                <p className="font-medium">{transcribedText}</p>
                {isPlaying && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-textColor opacity-90 italic">
                    <p>ReadAssist is speaking...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-textColor opacity-70 mb-1">Try saying:</p>
                  <p className="font-medium">{voicePrompt}</p>
                </div>
                <div className="text-sm text-textColor opacity-70">
                  <p className="font-medium mb-1">Voice commands:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Find me an article about [topic]</li>
                    <li>I want to read about [topic]</li>
                    <li>Show me an easy article on [topic]</li>
                    <li>Help me practice reading</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceControl;
