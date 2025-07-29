import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Volume2, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/utils";

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

export default function Viseme() {
  const [text, setText] = useState("Hello world, this is a test of viseme animation");
  const [speed, setSpeed] = useState([100]); // Speed as percentage (50-100)
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

  // Clear animation timeouts when component unmounts
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const generateVisemes = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to generate visemes",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const speedMultiplier = speed[0] / 100; // Convert percentage to multiplier (e.g., 70 -> 0.7)
      const response = await fetch(getApiUrl("/api/visemes/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: "en-US-AriaNeural",
          format: "svg", // We'll use the existing format but map to our JPGs
          speed: speedMultiplier // Pass the multiplier to the backend
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

      toast({
        title: "Success",
        description: `Generated ${data.visemes.length} visemes with ${data.duration.toFixed(2)}s duration`,
      });
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
    if (!audioRef.current || !visemeData.length || !audioUrl) {
      toast({
        title: "Error",
        description: "No viseme data available. Please generate visemes first.",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing timeouts
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];

    setIsPlaying(true);
    setCurrentVisemeId(0); // Start with neutral position

    // Do NOT adjust playback rate here. The audio itself is already generated at the desired speed.
    audioRef.current.playbackRate = 1.0; 
    audioRef.current.currentTime = 0;

    const playPromise = audioRef.current.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Audio started successfully, now sync visemes
        visemeData.forEach((viseme, index) => {
          // Schedule viseme change precisely at the audioOffset
          const timeout = setTimeout(() => {
            setCurrentVisemeId(viseme.visemeId);
          }, viseme.audioOffset);

          animationTimeoutsRef.current.push(timeout);
        });

        // The final viseme (0) is now added in the backend, so we don't need a separate timeout here.
        // The last viseme in visemeData will be the silence at the end.

      }).catch((error) => {
        console.error("Audio playback failed:", error);
        setIsPlaying(false);
        toast({
          title: "Audio Error",
          description: "Failed to play audio. The audio format may not be supported.",
          variant: "destructive",
        });
      });
    }

    // Handle audio end
    const handleAudioEnd = () => {
      setIsPlaying(false);
      setCurrentVisemeId(0); // Return to neutral
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
    setCurrentVisemeId(0); // Return to neutral
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Viseme Animation Test</h1>
        <p className="text-gray-600 text-center">
          Generate lip-sync animations from text using Azure Neural TTS
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Text Input & Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="text-input" className="block text-sm font-medium mb-2">
                Enter text to animate:
              </label>
              <Input
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your text here..."
                className="w-full"
                disabled={isGenerating || isPlaying}
              />
            </div>

            <div>
              <label htmlFor="speed-slider" className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Speech Speed: {speed[0]}%
              </label>
              <div className="px-2">
                <Slider
                  id="speed-slider"
                  value={speed}
                  onValueChange={setSpeed}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                  disabled={isGenerating || isPlaying}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% (Slower)</span>
                  <span>100% (Normal)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateVisemes}
                disabled={isGenerating || isPlaying}
                className="flex-1"
              >
                {isGenerating ? "Generating..." : "Generate Visemes"}
              </Button>
            </div>

            {visemeData.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={playVisemeAnimation}
                  disabled={isPlaying}
                  variant="default"
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play Animation
                </Button>
                <Button
                  onClick={stopAnimation}
                  disabled={!isPlaying}
                  variant="outline"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}

            {/* Viseme Info */}
            {visemeData.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Generated:</strong> {visemeData.length} visemes
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Current Viseme ID:</strong> {currentVisemeId}
                </p>
                {isPlaying && (
                  <p className="text-sm text-green-600 font-medium">
                    ▶ Animation playing...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Animation Display */}
        <Card>
          <CardHeader>
            <CardTitle>Lip Animation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-4 bg-gray-100 rounded-lg overflow-hidden">
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
                onLoad={() => {
                  // Ensure smooth transitions by preloading
                }}
              />

              {/* Overlay indicator for current viseme */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                Viseme {currentVisemeId}
              </div>
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
                <p className="text-gray-600">Ready to play animation</p>
              )}
              {!isGenerating && !isPlaying && visemeData.length === 0 && (
                <p className="text-gray-400">Enter text and generate visemes to start</p>
              )}
            </div>
          </CardContent>
        </Card>
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

      {/* Viseme Grid Preview */}
      {visemeData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Viseme Sequence Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
              {visemeData.slice(0, 24).map((viseme, index) => (
                <div
                  key={index}
                  className={`relative border-2 rounded-lg overflow-hidden ${
                    currentVisemeId === viseme.visemeId && isPlaying
                      ? 'border-green-500 ring-2 ring-green-200'
                      : 'border-gray-200'
                  }`}
                >
                  <img
                    src={visemeImages[viseme.visemeId as keyof typeof visemeImages]}
                    alt={`Viseme ${viseme.visemeId}`}
                    className="w-full h-12 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs text-center py-0.5">
                    {viseme.visemeId}
                  </div>
                </div>
              ))}
            </div>
            {visemeData.length > 24 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing first 24 of {visemeData.length} visemes
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}