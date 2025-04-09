import { useState, useEffect } from 'react';
import { FiMic } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import useVoiceRecognition from '@/hooks/useVoiceRecognition';
import { processVoiceCommand } from '@/lib/openai';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent } from '@/components/ui/card';

const VoiceControl = () => {
  const { toast } = useToast();
  const { setCurrentContent } = useReading();
  const [status, setStatus] = useState<'listening' | 'processing' | 'idle'>('idle');
  const [voicePrompt, setVoicePrompt] = useState(
    "\"Find me an article about gardening\" or \"I want to read about space exploration\""
  );

  const onVoiceResult = async (result: { transcript: string, isFinal: boolean }) => {
    if (result.isFinal) {
      setStatus('processing');
      try {
        const response = await processVoiceCommand(result.transcript);
        
        if (response.action === 'generateContent' && response.content) {
          setCurrentContent(response.content);
          toast({
            title: "Content Generated",
            description: `Generated content about "${response.topic}"`,
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process voice command",
          variant: "destructive",
        });
      } finally {
        setStatus('idle');
        stopListening();
      }
    }
  };

  const { isListening, startListening, stopListening } = useVoiceRecognition({
    continuous: false,
    interimResults: true,
    onResult: onVoiceResult,
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

  useEffect(() => {
    if (isListening) {
      setStatus('listening');
    }
  }, [isListening]);

  const toggleListening = () => {
    if (status === 'idle') {
      startListening();
    } else if (status === 'listening') {
      stopListening();
      setStatus('idle');
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
            <p className="text-sm text-textColor opacity-70 mb-1">Try saying:</p>
            <p className="font-medium">{voicePrompt}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceControl;
