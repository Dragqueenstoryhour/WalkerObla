import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageAnimatedViseme } from './ImageAnimatedViseme';
import { getApiUrl } from '@/lib/utils';

// Import viseme images
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

// The possible viseme IDs from Azure Documentation (0-21)
export const VISEME_DESCRIPTIONS = [
  "Silence (0)",
  "æ, ə, ʌ - as in 'bat', 'about', 'cut' (1)",
  "ɑ - as in 'father' (2)",
  "ɔ - as in 'dog' (3)",
  "ɛ, ʊ - as in 'pet', 'book' (4)",
  "ɝ - as in 'bird' (5)",
  "j, i, ɪ - as in 'yes', 'see', 'sit' (6)",
  "w, u - as in 'we', 'blue' (7)",
  "o - as in 'show' (8)",
  "aʊ - as in 'how' (9)",
  "ɔɪ - as in 'boy' (10)",
  "aɪ - as in 'fly' (11)",
  "h - as in 'help' (12)",
  "ɹ - as in 'red' (13)",
  "l - as in 'look' (14)",
  "s, z - as in 'say', 'zoo' (15)",
  "ʃ, tʃ, dʒ, ʒ - as in 'show', 'cheese', 'judge', 'measure' (16)",
  "ð - as in 'then' (17)",
  "f, v - as in 'fan', 'van' (18)",
  "d, t, n, θ - as in 'did', 'talk', 'now', 'thin' (19)",
  "k, g, ŋ - as in 'cat', 'guest', 'sing' (20)", 
  "p, b, m - as in 'put', 'big', 'mat' (21)"
];

// Interface for a viseme animation frame
interface VisemeFrame {
  time: number;         // Time in seconds
  audioOffset?: number; // Time in milliseconds (from API)
  visemeId: number;     // Azure viseme ID (0-21)
  svg?: string;         // SVG content
  blendshapes?: Record<string, number>; // Blendshape values for 3D animation
}

interface FacialAnimationProps {
  initialText?: string;
  maxPlays?: number;
  onAnimationPlay?: () => void;
  showPlayButton?: boolean;
  simplified?: boolean; // New prop for simplified mode
}

export function FacialAnimation({ 
  initialText = "Hello, how are you today?", 
  maxPlays,
  onAnimationPlay,
  showPlayButton = true,
  simplified = false
}: FacialAnimationProps) {
  const [text, setText] = useState(initialText);
  const [voice, setVoice] = useState("en-US-GuyNeural");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationData, setAnimationData] = useState<VisemeFrame[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentViseme, setCurrentViseme] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [visemePreview, setVisemePreview] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldAutoPlayRef = useRef<boolean>(false);

  // Function to generate animation data from text
  const generateAnimation = async (shouldAutoPlay = false) => {
    if (!text.trim()) return;
    
    try {
      setError(null);
      setLoading(true);
      setAnimationData([]);
      setAudioUrl(null);
      setPlaying(false);
      
      // Call server API to generate viseme data
      const response = await fetch(getApiUrl('/api/visemes/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: voice || "en-US-AriaNeural",
          format: "svg",
          speed: 0.65
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate animation');
      }
      
      const response_data = await response.json();
      const data = response_data.data || response_data; // Handle server success wrapper
      
      // Convert viseme data to animation frames
      if (data.visemes && data.audioBuffer) {
        const frames: VisemeFrame[] = data.visemes.map((viseme: any) => ({
          time: viseme.audioOffset / 1000, // Convert ms to seconds (for compatibility)
          audioOffset: viseme.audioOffset, // Keep original ms for precise timing
          visemeId: viseme.visemeId,
          svg: viseme.animation
        })).sort((a: VisemeFrame, b: VisemeFrame) => a.time - b.time);
        
        setAnimationData(frames);
        
        // Create audio URL from base64 data
        let binaryString;
        try {
          binaryString = atob(data.audioBuffer);
        } catch (error) {
          throw new Error('Invalid base64 audio data received from server');
        }
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        console.log(`Generated ${frames.length} viseme frames with audio (duration: ${data.duration}ms)`);
        
        // Set flag for auto-play if requested (useEffect will handle the actual playback)
        if (shouldAutoPlay) {
          shouldAutoPlayRef.current = true;
        }
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error generating animation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Parse CSV data into animation frames
  const parseVisemeCsv = (csv: string): VisemeFrame[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Check if we have the required columns
    if (!headers.includes('time') || !headers.includes('viseme_id')) {
      throw new Error('Invalid CSV format: missing required columns');
    }
    
    const frames: VisemeFrame[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      
      // Handle CSV with quoted values (SVG data might be quoted)
      let svgData: string | undefined = undefined;
      
      // Basic CSV parsing - handle quoted SVG data
      if (cols.length >= 3 && cols[2].startsWith('"')) {
        // This is a quoted field - needs special handling
        const lineWithQuotes = lines[i];
        const svgStartIndex = lineWithQuotes.indexOf('"', lineWithQuotes.indexOf(',', lineWithQuotes.indexOf(',') + 1) + 1);
        if (svgStartIndex > 0) {
          let svgEndIndex = lineWithQuotes.lastIndexOf('"');
          if (svgEndIndex > svgStartIndex) {
            svgData = lineWithQuotes.substring(svgStartIndex + 1, svgEndIndex);
            // Handle possible escaped quotes
            svgData = svgData.replace(/""/g, '"');
          }
        }
      }
      
      try {
        const time = parseFloat(cols[0]);
        const visemeId = parseInt(cols[1], 10);
        
        frames.push({
          time,
          visemeId,
          svg: svgData
        });
      } catch (e) {
        console.error('Error parsing CSV line:', cols, e);
      }
    }
    
    // Sort frames by time
    return frames.sort((a, b) => a.time - b.time);
  };
  
  // Start the actual playback (internal function)
  const startActualPlayback = () => {
    if (!animationData.length || !audioRef.current) return;
    
    // Check if max plays reached
    if (maxPlays && playCount >= maxPlays) {
      return;
    }
    
    // Reset
    stopAnimation();
    
    // Increment play count and call callback
    setPlayCount(prev => prev + 1);
    if (onAnimationPlay) {
      onAnimationPlay();
    }
    
    // Start playing audio
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error('Error playing audio:', e));
    }
    
    // Start animation loop
    startTimeRef.current = performance.now();
    setPlaying(true);
    
    // Animation loop
    const animate = (currentTime: number) => {
      if (!playing) return;
      
      const elapsed = (currentTime - startTimeRef.current) / 1000; // Convert to seconds
      
      // Find the current viseme frame
      let currentIndex = 0;
      for (let i = 0; i < animationData.length; i++) {
        if (animationData[i].time <= elapsed) {
          currentIndex = i;
        } else {
          break;
        }
      }
      
      // Update current viseme if changed
      if (currentViseme !== animationData[currentIndex]?.visemeId) {
        setCurrentViseme(animationData[currentIndex]?.visemeId || 0);
      }
      
      // Continue animation if still playing
      if (playing && elapsed < animationData[animationData.length - 1].time + 0.5) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        stopAnimation();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Play the animation (generate first if needed)
  const playAnimation = async () => {
    // If no animation data exists, generate it first
    if (!animationData.length && text.trim()) {
      await generateAnimation(true); // Pass true to auto-play after generation
      return;
    }
    
    // If we already have animation data, play it directly
    startActualPlayback();
  };
  
  // Stop the animation
  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setPlaying(false);
    setCurrentViseme(0);
  };
  
  // Set text when initialText changes, but don't auto-generate
  useEffect(() => {
    if (initialText && initialText !== text) {
      setText(initialText);
    }
  }, [initialText]);
  
  // Auto-play when animation data is ready and auto-play is requested
  useEffect(() => {
    if (animationData.length > 0 && audioUrl && shouldAutoPlayRef.current && audioRef.current) {
      shouldAutoPlayRef.current = false; // Reset the flag
      // Give ImageAnimatedViseme more time to preload images
      setTimeout(() => {
        startActualPlayback();
      }, 300);
    }
  }, [animationData, audioUrl]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Clean up audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Handle end of audio
  const handleAudioEnded = () => {
    stopAnimation();
  };
  
  // Get button text based on play count
  const getButtonText = () => {
    if (playCount === 0) {
      return 'Watch';
    } else if (playCount === 1) {
      return 'Say it With Me';
    } else {
      return 'Say it With Me';
    }
  };
  
  // Get the image for a viseme ID
  const getVisemeImage = (visemeId: number, showDescription: boolean = false): React.ReactNode => {
    // Use the actual viseme images
    const imageSource = visemeImages[visemeId as keyof typeof visemeImages] || visemeImages[0];
    
    return (
      <div className="flex flex-col items-center">
        <img 
          src={imageSource} 
          alt={`Viseme ${visemeId}`}
          className="w-full h-full object-cover rounded"
          style={{ maxWidth: '270px', maxHeight: '270px' }}
        />
        {showDescription && (
          <div className="text-xs mt-1 text-center">
            {VISEME_DESCRIPTIONS[visemeId]}
          </div>
        )}
      </div>
    );
  };
  
  // Simplified mode for WatchThenPracticeAssignment
  if (simplified) {
    return (
      <div className="flex flex-col items-center gap-4">
        <audio 
          ref={audioRef} 
          src={audioUrl || undefined} 
          onEnded={handleAudioEnded} 
          style={{ display: 'none' }} 
        />
        
        <div className="w-72 h-72 bg-gray-50 rounded border flex items-center justify-center">
          {animationData.length > 0 && (playing || audioUrl) ? (
            <ImageAnimatedViseme 
              frames={animationData}
              playing={playing}
              onEnd={handleAudioEnded}
              width={270}
              height={270}
              audioRef={audioRef}
            />
          ) : (
            getVisemeImage(currentViseme, false)
          )}
        </div>
        
        <div className="flex flex-col items-center gap-2">
          {maxPlays && (
            <div className="text-sm text-gray-600">
              Plays: {playCount} / {maxPlays}
            </div>
          )}
          
          {loading && (
            <div className="animate-pulse text-gray-500">
              Generating animation...
            </div>
          )}
          
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          {showPlayButton && (
            <div className="flex gap-2">
              <Button 
                onClick={() => playAnimation()} 
                disabled={playing || loading || (maxPlays ? playCount >= maxPlays : false)}
                size="sm"
              >
                {maxPlays && playCount >= maxPlays ? 'Max Plays Reached' : loading ? 'Generating...' : getButtonText()}
              </Button>
            </div>
          )}
          
          {!showPlayButton && !loading && !error && (
            <div className="text-gray-500 italic text-sm">
              Ready to watch
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Azure Viseme-Based Facial Animation</CardTitle>
          <CardDescription>
            Generate facial animation using Azure Speech Viseme events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="text-input">Text to animate</Label>
              <Input
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to generate animation"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US-GuyNeural">Guy (Male)</SelectItem>
                  <SelectItem value="en-US-AriaNeural">Aria (Female)</SelectItem>
                  <SelectItem value="en-US-JennyNeural">Jenny (Female)</SelectItem>
                  <SelectItem value="en-US-DavisNeural">Davis (Male)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => generateAnimation()} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Animation'}
              </Button>
              <Button 
                variant={previewMode ? "default" : "outline"} 
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? 'Exit Preview' : 'Preview Visemes'}
              </Button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded">
                Error: {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {previewMode ? 'Viseme Preview' : 'Animation Preview'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {previewMode ? (
            <>
              <div className="text-center mb-2">
                <div className="text-xl font-semibold mb-1">Viseme {visemePreview}</div>
                <div className="text-sm text-gray-500">
                  {VISEME_DESCRIPTIONS[visemePreview] || `Viseme ID ${visemePreview}`}
                </div>
              </div>
              <div className="w-32 h-32 bg-gray-50 rounded border flex items-center justify-center">
                {getVisemeImage(visemePreview, true)}
              </div>
              <div className="flex gap-2 w-full max-w-xs justify-between">
                <Button 
                  size="sm" 
                  onClick={() => setVisemePreview(Math.max(0, visemePreview - 1))}
                  disabled={visemePreview <= 0}
                >
                  Previous
                </Button>
                <div className="flex-grow text-center py-2">
                  {visemePreview} / 21
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setVisemePreview(Math.min(21, visemePreview + 1))}
                  disabled={visemePreview >= 21}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              <audio 
                ref={audioRef} 
                src={audioUrl || undefined} 
                onEnded={handleAudioEnded} 
                style={{ display: 'none' }} 
              />
              
              <div className="w-48 h-48 bg-gray-50 rounded border flex items-center justify-center">
                {animationData.length > 0 ? (
                  <ImageAnimatedViseme 
                    frames={animationData}
                    playing={playing}
                    onEnd={handleAudioEnded}
                    width={180}
                    height={180}
                    audioRef={audioRef}
                  />
                ) : (
                  getVisemeImage(currentViseme, true)
                )}
              </div>
              
              <div className="flex flex-col items-center gap-4">
                {maxPlays && (
                  <div className="text-sm text-gray-600">
                    Plays: {playCount} / {maxPlays}
                  </div>
                )}
                <div className="flex gap-2">
                  {showPlayButton && (
                    <>
                      <Button 
                        onClick={() => playAnimation()} 
                        disabled={playing || loading || (maxPlays ? playCount >= maxPlays : false)}
                      >
                        {maxPlays && playCount >= maxPlays ? 'Max Plays Reached' : loading ? 'Generating...' : 'Play'}
                      </Button>
                      <Button onClick={stopAnimation} disabled={!playing}>
                        Stop
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {!audioUrl && !loading && (
                <div className="text-gray-500 italic">
                  Ready to watch
                </div>
              )}
              
              {loading && (
                <div className="animate-pulse text-gray-500">
                  Generating animation...
                </div>
              )}
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-xs text-gray-500">
            Azure provides 22 viseme IDs (0-21) representing different mouth positions
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default FacialAnimation;