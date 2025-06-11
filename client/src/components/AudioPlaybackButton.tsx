import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { createOptimalAudioElement, safeAudioPlay } from '@/lib/audioUtils';
import { useToast } from '@/hooks/use-toast';

interface AudioPlaybackButtonProps {
  audioUrl: string;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  className?: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: React.ReactNode;
}

export function AudioPlaybackButton({
  audioUrl,
  buttonText = "Listen to me",
  variant = "outline",
  className = "",
  disabled = false,
  size = "default",
  icon = <Volume2 className="h-4 w-4" />
}: AudioPlaybackButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const handlePlayback = async () => {
    if (isPlaying || !audioUrl) return;

    try {
      setIsPlaying(true);
      
      // Create optimal audio element for current browser
      const audio = createOptimalAudioElement(audioUrl, { preload: 'auto' });
      
      // Set up event listeners
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Playback Error",
          description: "Could not play the audio. Please try again.",
          variant: "destructive",
        });
      };
      
      // Use safe playback with fallback handling
      await safeAudioPlay(audio);
      
    } catch (error) {
      console.error('[AudioPlayback] Error playing audio:', error);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Could not play the audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handlePlayback}
      variant={variant}
      size={size}
      disabled={disabled || isPlaying || !audioUrl}
      className={`flex items-center gap-2 bg-[#00b39e] hover:bg-[#009688] text-white border-0 ${className}`}
    >
      {icon}
      {isPlaying ? 'Playing...' : buttonText}
    </Button>
  );
}