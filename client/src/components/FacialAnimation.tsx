import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CssAnimatedViseme } from './CssAnimatedViseme';

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
  // Generate just the speech audio without animation
  const generateSpeech = async () => {
    if (!text.trim()) return;
    
    try {
      setError(null);
      setLoading(true);
      setAudioUrl(null);
      
      console.log("Requesting speech synthesis for: \"" + text + "\"");
      
      // Call the OpenAI TTS endpoint
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice: 'alloy'  // Using OpenAI's voice - this service is more reliable than Azure for simple TTS
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }
      
      // Convert the response to an audio blob
      const audioBlob = await response.blob();
      console.log(`Received audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      // Create a URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
      
      // Clear any existing animation data since we're just playing audio
      setAnimationData([]);
      
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate animation with visemes
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
    // Find the SVG for this viseme ID if we have animation data
    if (animationData.length > 0) {
      const visemeFrame = animationData.find(frame => frame.visemeId === visemeId);
      
      if (visemeFrame?.svg) {
        // Return the SVG directly from the frame
        return <div dangerouslySetInnerHTML={{ __html: visemeFrame.svg }} />;
      }
    }
    
    // When in preview mode or no animation data, use a placeholder for demonstration
    // This is just a preview for the user to see the viseme IDs
    return (
      <div className="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130" width="130" height="130">
          <rect width="100%" height="100%" fill="none" />
          
          {/* Face outline */}
          <ellipse cx="65" cy="65" rx="45" ry="55" stroke="black" strokeWidth="1.5" fill="none" />
          <circle cx="48" cy="50" r="3" fill="black" /> {/* left eye */}
          <circle cx="82" cy="50" r="3" fill="black" /> {/* right eye */}
          <path d="M65,42 L65,55 M55,95 Q65,100 75,95" stroke="black" strokeWidth="1" fill="none" /> {/* nose and chin */}
          
          {/* Viseme number */}
          <text x="65" y="20" textAnchor="middle" fontSize="10" fill="black">Viseme {visemeId}</text>
          
          {/* Mouth shape based on viseme ID */}
          {visemeId === 0 && <path d="M45,70 Q65,72 85,70" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 1 && <path d="M45,65 Q65,75 85,65" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 2 && <path d="M45,60 Q65,85 85,60" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 3 && <path d="M50,65 Q65,78 80,65" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 4 && <path d="M45,65 Q65,72 85,65" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 5 && <path d="M50,68 Q65,75 80,68" stroke="black" strokeWidth="2" fill="none" />}
          
          {visemeId === 6 && (
            <>
              <path d="M45,68 Q65,72 85,68" stroke="black" strokeWidth="2" fill="none" />
              <path d="M45,68 C50,65 80,65 85,68" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 7 && <circle cx="65" cy="70" r="5" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 8 && <circle cx="65" cy="70" r="8" stroke="black" strokeWidth="2" fill="none" />}
          {visemeId === 9 && <circle cx="65" cy="70" r="12" stroke="black" strokeWidth="2" fill="none" />}
          
          {visemeId === 10 && (
            <>
              <path d="M50,65 Q65,75 80,65" stroke="black" strokeWidth="2" fill="none" />
              <path d="M55,65 C60,63 70,63 75,65" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 11 && (
            <>
              <path d="M45,65 Q65,75 85,65" stroke="black" strokeWidth="2" fill="none" />
              <path d="M50,65 C55,63 75,63 80,65" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 12 && <path d="M50,68 Q65,73 80,68" stroke="black" strokeWidth="2" fill="none" />}
          
          {visemeId === 13 && (
            <>
              <path d="M55,68 Q65,73 75,68" stroke="black" strokeWidth="2" fill="none" />
              <path d="M60,68 Q65,73 70,68" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 14 && (
            <>
              <path d="M50,68 Q65,72 80,68" stroke="black" strokeWidth="2" fill="none" />
              <path d="M58,68 H72" stroke="black" strokeWidth="1" fill="none" />
              <path d="M65,68 L65,73" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 15 && (
            <>
              <path d="M50,69 Q65,71 80,69" stroke="black" strokeWidth="2" fill="none" />
              <path d="M50,69 L80,69" stroke="black" strokeWidth="1" strokeDasharray="2,1" fill="none" />
            </>
          )}
          
          {visemeId === 16 && (
            <>
              <path d="M55,68 Q65,72 75,68" stroke="black" strokeWidth="2" fill="none" />
              <path d="M60,68 Q65,71 70,68" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 17 && (
            <>
              <path d="M50,69 Q65,70 80,69" stroke="black" strokeWidth="2" fill="none" />
              <path d="M58,69 L72,69" stroke="black" strokeWidth="1" fill="none" />
              <path d="M65,69 L65,74" stroke="black" strokeWidth="2" fill="none" />
            </>
          )}
          
          {visemeId === 18 && (
            <>
              <path d="M50,68 Q65,70 80,68" stroke="black" strokeWidth="2" fill="none" />
              <path d="M50,65 L80,65" stroke="black" strokeWidth="1" strokeDasharray="2,1" fill="none" />
              <path d="M55,68 H75" stroke="black" strokeWidth="1.5" fill="none" />
            </>
          )}
          
          {visemeId === 19 && (
            <>
              <path d="M50,69 Q65,71 80,69" stroke="black" strokeWidth="2" fill="none" />
              <path d="M60,69 L70,69" stroke="black" strokeWidth="1" fill="none" />
              <path d="M65,66 L65,69" stroke="black" strokeWidth="1" fill="none" />
            </>
          )}
          
          {visemeId === 20 && (
            <>
              <path d="M50,69 Q65,71 80,69" stroke="black" strokeWidth="2" fill="none" />
              <path d="M55,69 C60,66 70,66 75,69" stroke="black" strokeWidth="1" fill="none" />
            </>
          )}
          
          {visemeId === 21 && <path d="M50,70 L80,70" stroke="black" strokeWidth="2.5" fill="none" />}
        </svg>
        <div className="text-xs mt-1 text-center">
          {VISEME_DESCRIPTIONS[visemeId]}
        </div>
      </div>
    );
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
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={generateSpeech} disabled={loading}>
                {loading ? 'Generating...' : 'Hear Phrase'}
              </Button>
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
                {animationData.length > 0 ? (
                  <CssAnimatedViseme 
                    frames={animationData}
                    playing={playing}
                    onEnd={handleAudioEnded}
                    width={180}
                    height={180}
                  />
                ) : (
                  getVisemeSvg(currentViseme)
                )}
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