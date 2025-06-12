import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, RotateCcw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import all viseme images
import viseme0 from "@/assets/Visemes/viseme-id-0.jpg";
import viseme1 from "@/assets/Visemes/viseme-id-1.jpg";
import viseme2 from "@/assets/Visemes/viseme-id-2.jpg";
import viseme3 from "@/assets/Visemes/viseme-id-3.jpg";
import viseme4 from "@/assets/Visemes/viseme-id-4.jpg";
import viseme5 from "@/assets/Visemes/viseme-id-5.jpg";
import viseme6 from "@/assets/Visemes/viseme-id-6.jpg";
import viseme7 from "@/assets/Visemes/viseme-id-7.jpg";
import viseme8 from "@/assets/Visemes/viseme-id-8.jpg";
import viseme9 from "@/assets/Visemes/viseme-id-9.jpg";
import viseme10 from "@/assets/Visemes/viseme-id-10.jpg";
import viseme11 from "@/assets/Visemes/viseme-id-11.jpg";
import viseme12 from "@/assets/Visemes/viseme-id-12.jpg";
import viseme13 from "@/assets/Visemes/viseme-id-13.jpg";
import viseme14 from "@/assets/Visemes/viseme-id-14.jpg";
import viseme15 from "@/assets/Visemes/viseme-id-15.jpg";
import viseme16 from "@/assets/Visemes/viseme-id-16.jpg";
import viseme17 from "@/assets/Visemes/viseme-id-17.jpg";
import viseme18 from "@/assets/Visemes/viseme-id-18.jpg";
import viseme19 from "@/assets/Visemes/viseme-id-19.jpg";
import viseme20 from "@/assets/Visemes/viseme-id-20.jpg";
import viseme21 from "@/assets/Visemes/viseme-id-21.jpg";

const visemeImages = {
  0: viseme0,
  1: viseme1,
  2: viseme2,
  3: viseme3,
  4: viseme4,
  5: viseme5,
  6: viseme6,
  7: viseme7,
  8: viseme8,
  9: viseme9,
  10: viseme10,
  11: viseme11,
  12: viseme12,
  13: viseme13,
  14: viseme14,
  15: viseme15,
  16: viseme16,
  17: viseme17,
  18: viseme18,
  19: viseme19,
  20: viseme20,
  21: viseme21,
};

interface VisemeData {
  visemeId: number;
  audioOffset: number;
  animation?: string;
}

interface VisemeResponse {
  visemes: VisemeData[];
  audioBuffer: string; // base64 encoded audio data
  duration: number;
}

interface VisemePopupProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  speed?: number; // Speed as decimal (0.6 for 60%)
}

export function VisemePopup({ isOpen, onClose, text, speed = 0.6 }: VisemePopupProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVisemeId, setCurrentVisemeId] = useState(0);
  const [visemeData, setVisemeData] = useState<VisemeData[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const { toast } = useToast();

  // Preload all viseme images for smooth transitions
  useEffect(() => {
    Object.values(visemeImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Clear animation timeouts when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Generate visemes when dialog opens
  useEffect(() => {
    if (isOpen && text && !visemeData.length) {
      generateVisemes();
    }
  }, [isOpen, text]);

  // Auto-play when visemes are generated
  useEffect(() => {
    if (visemeData.length > 0 && audioUrl && !isPlaying) {
      // Small delay to ensure UI is ready
      setTimeout(() => {
        playVisemeAnimation();
      }, 100);
    }
  }, [visemeData, audioUrl]);

  // Clean up when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopAnimation();
      setVisemeData([]);
      setAudioUrl("");
      setCurrentVisemeId(0);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  }, [isOpen]);

  const generateVisemes = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/visemes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: "en-US-AriaNeural",
          format: "svg",
          speed: speed
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate visemes: ${response.statusText}`);
      }

      const data: VisemeResponse = await response.json();

      // Convert base64 audio data to blob URL
      const binaryString = atob(data.audioBuffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBlob = new Blob([bytes.buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setVisemeData(data.visemes);
    } catch (error) {
      console.error("Error generating visemes:", error);
      toast({
        title: "Error",
        description: "Failed to generate visemes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playVisemeAnimation = () => {
    if (!audioRef.current || !visemeData.length || !audioUrl) return;

    // Clear any existing timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    setIsPlaying(true);
    setCurrentVisemeId(0);

    audioRef.current.playbackRate = 1.0;
    audioRef.current.currentTime = 0;

    const playPromise = audioRef.current.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Audio started successfully, now sync visemes
        visemeData.forEach((viseme) => {
          const timeout = setTimeout(() => {
            setCurrentVisemeId(viseme.visemeId);
          }, viseme.audioOffset);

          animationTimeoutsRef.current.push(timeout);
        });
      }).catch((error) => {
        console.error("Audio playback failed:", error);
        setIsPlaying(false);
        toast({
          title: "Audio Error",
          description: "Failed to play audio.",
          variant: "destructive",
        });
      });
    }

    // Handle audio end
    const handleAudioEnd = () => {
      setIsPlaying(false);
      setCurrentVisemeId(0);
      audioRef.current?.removeEventListener("ended", handleAudioEnd);
      audioRef.current?.removeEventListener("error", handleAudioError);
    };

    const handleAudioError = (e: Event) => {
      console.error("Audio error:", e);
      setIsPlaying(false);
      setCurrentVisemeId(0);
      toast({
        title: "Audio Error",
        description: "Audio playback encountered an error.",
        variant: "destructive",
      });
      audioRef.current?.removeEventListener("ended", handleAudioEnd);
      audioRef.current?.removeEventListener("error", handleAudioError);
    };

    audioRef.current.addEventListener("ended", handleAudioEnd);
    audioRef.current.addEventListener("error", handleAudioError);
  };

  const stopAnimation = () => {
    // Clear all timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsPlaying(false);
    setCurrentVisemeId(0);
  };

  const handleReplay = () => {
    stopAnimation();
    // Small delay before replaying
    setTimeout(() => {
      playVisemeAnimation();
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Lip Animation</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* Text being animated */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Animating:</p>
            <p className="font-medium text-lg">{text}</p>
          </div>

          {/* Animation Display */}
          <div className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Generating...</p>
                </div>
              </div>
            ) : (
              <>
                <img
                  src={visemeImages[currentVisemeId as keyof typeof visemeImages]}
                  alt={`Viseme ${currentVisemeId}`}
                  className="w-full h-full object-cover shadow-lg"
                  style={{
                    opacity: 1,
                    transform: isPlaying ? 'scale(1.01)' : 'scale(1)',
                    transition: 'all 0.08s ease-out',
                    filter: isPlaying ? 'brightness(1.05)' : 'brightness(1)'
                  }}
                />

                {/* Overlay indicator for current viseme */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                  Viseme {currentVisemeId}
                </div>
              </>
            )}
          </div>

          {/* Status indicator */}
          <div className="text-center">
            {isGenerating && (
              <p className="text-blue-600 font-medium">Generating visemes...</p>
            )}
            {isPlaying && (
              <p className="text-green-600 font-medium">Animation playing</p>
            )}
            {!isGenerating && !isPlaying && visemeData.length > 0 && (
              <p className="text-gray-600">Ready to replay</p>
            )}
          </div>

          {/* Control Buttons */}
          {!isGenerating && visemeData.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleReplay}
                disabled={isPlaying}
                variant="default"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </Button>
            </div>
          )}
        </div>

        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            style={{ display: 'none' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}