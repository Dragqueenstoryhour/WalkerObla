import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// The possible viseme IDs from Azure (0-21)
export const VISEME_DESCRIPTIONS = [
  "Silent/neutral (0)",
  "ae, ax, eh (1)",
  "aa (2)",
  "ao (3)",
  "ey, eh, uh (4)",
  "er (5)",
  "y, iy, ih, ix (6)",
  "w, uw (7)",
  "ow (8)",
  "aw (9)",
  "oy (10)",
  "ay (11)",
  "h (12)",
  "r (13)",
  "l (14)",
  "s, z (15)",
  "sh, ch, jh, zh (16)",
  "th, dh (17)",
  "f, v (18)",
  "d, t, n (19)",
  "k, g, ng (20)",
  "p, b, m (21)"
];

// Interface for a viseme animation frame
interface VisemeFrame {
  time: number;      // Time in seconds
  visemeId: number;  // Azure viseme ID (0-21)
  svg?: string;      // SVG content
  blendshapes?: Record<string, number>; // Blendshape values for 3D animation
}

interface FacialAnimationProps {
  initialText?: string;
}

export function FacialAnimation({ initialText = "Hello, how are you today?" }: FacialAnimationProps) {
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Function to generate animation data from text
  const generateAnimation = async () => {
    if (!text.trim()) return;
    
    try {
      setError(null);
      setLoading(true);
      setAnimationData([]);
      setAudioUrl(null);
      setPlaying(false);
      
      // Call server API to generate viseme data
      const response = await fetch('/api/viseme/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice,
          format: 'svg'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate animation');
      }
      
      const data = await response.json();
      
      // Parse the CSV data into animation frames
      if (data.success && data.blendshapesCsv) {
        const frames = parseVisemeCsv(data.blendshapesCsv);
        setAnimationData(frames);
        
        // Create audio URL from base64 data
        if (data.audioData) {
          const audioBuffer = Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0));
          const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        }
        
        console.log(`Generated ${frames.length} viseme frames with audio (duration: ${data.duration}ms)`);
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
  
  // Play the animation
  const playAnimation = () => {
    if (!animationData.length || !audioRef.current) return;
    
    // Reset
    stopAnimation();
    
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
  
  // Get the SVG for a viseme ID
  const getVisemeSvg = (visemeId: number): React.ReactNode => {
    // Find the SVG for this viseme ID
    const visemeFrame = animationData.find(frame => frame.visemeId === visemeId);
    
    if (visemeFrame?.svg) {
      // Return the SVG directly from the frame
      return <div dangerouslySetInnerHTML={{ __html: visemeFrame.svg }} />;
    }
    
    // Fallback - use simple shapes for the visemes
    switch (visemeId) {
      case 0: // Silent/neutral
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
            <rect width="100%" height="100%" fill="none" />
            <path d="M50,70 Q65,75 80,70" stroke="black" strokeWidth="2" fill="none" />
          </svg>
        );
      case 1: // ae, ax, eh
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
            <rect width="100%" height="100%" fill="none" />
            <path d="M50,65 Q65,80 80,65" stroke="black" strokeWidth="2" fill="none" />
          </svg>
        );
      case 2: // aa
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
            <rect width="100%" height="100%" fill="none" />
            <path d="M50,60 Q65,85 80,60" stroke="black" strokeWidth="2" fill="none" />
          </svg>
        );
      // Add more viseme SVGs as needed
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
            <rect width="100%" height="100%" fill="none" />
            <path d="M50,70 Q65,75 80,70" stroke="black" strokeWidth="2" fill="none" />
            <text x="65" y="50" textAnchor="middle" fontSize="12" fill="black">{visemeId}</text>
          </svg>
        );
    }
  };
  
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
              <Button onClick={generateAnimation} disabled={loading}>
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
                {getVisemeSvg(visemePreview)}
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
                {getVisemeSvg(currentViseme)}
              </div>
              
              <div className="flex gap-2">
                {audioUrl && (
                  <>
                    <Button onClick={playAnimation} disabled={playing || !audioUrl}>
                      Play
                    </Button>
                    <Button onClick={stopAnimation} disabled={!playing}>
                      Stop
                    </Button>
                  </>
                )}
              </div>
              
              {!audioUrl && !loading && (
                <div className="text-gray-500 italic">
                  Generate animation to preview
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