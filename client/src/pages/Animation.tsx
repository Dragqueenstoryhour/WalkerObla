import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  PlayIcon,
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  PlusCircle,
  Pause,
  Type, 
  Wand2,
  Copy,
  Check,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BlendshapeData {
  name: string;
  value: number;
  timestamp: number;
}

interface AnimationResult {
  success: boolean;
  request_id: string;
  audio_url: string;
  blendshapes_url: string;
  emotions_url: string | null;
  error?: string;
}

// API request type for animation generation
interface AnimationRequest {
  method: string;
  body: {
    text: string;
    model: string;
  };
}

const Animation = () => {
  const { toast } = useToast();
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [animationResult, setAnimationResult] = useState<AnimationResult | null>(null);
  const [blendshapeData, setBlendshapeData] = useState<BlendshapeData[]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('claire');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'record' | 'file'>('text');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Sample phrases for quick testing
  const samplePhrases = [
    "Hello, how are you today?",
    "I'm practicing my pronunciation.",
    "This is a test of the lip-sync animation.",
    "The quick brown fox jumps over the lazy dog."
  ];

  // Generate animation from text
  const generateAnimation = async () => {
    if (!text.trim()) {
      toast({
        title: "Text is required",
        description: "Please enter some text to generate an animation.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(10);

    try {
      // Call animation API with separate parameters
      const response = await apiRequest(
        '/api/animation/generate',
        'POST',
        { text: text.trim(), model: selectedModel }
      );

      setProgress(50);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate animation');
      }

      setAnimationResult(response);

      // Fetch blendshape data
      const blendshapesResponse = await fetch(response.blendshapes_url);
      const blendshapesText = await blendshapesResponse.text();

      // Parse CSV data (format: name,value,timestamp)
      const parsedData = parseBlendshapesCSV(blendshapesText);
      setBlendshapeData(parsedData);

      setProgress(100);

      toast({
        title: "Animation generated",
        description: "The animation has been generated successfully.",
      });
    } catch (err) {
      console.error('Error generating animation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate animation');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to generate animation',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start audio recording
  const startRecording = async () => {
    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        chunksRef.current = [];
        
        // Create a preview URL for the recorded audio
        if (audioRef.current) {
          const audioURL = URL.createObjectURL(audioBlob);
          audioRef.current.src = audioURL;
          audioRef.current.load();
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({
        title: "Recording Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    // Stop all tracks on the active stream
    if (mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.includes('audio/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an audio file (WAV, MP3, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Create a preview URL for the uploaded audio
    if (audioRef.current) {
      const audioURL = URL.createObjectURL(file);
      audioRef.current.src = audioURL;
      audioRef.current.load();
    }
  };
  
  // Generate animation from audio (recorded or uploaded)
  const generateAnimationFromAudio = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('model', selectedModel);
    
    if (uploadMode === 'record' && audioBlob) {
      formData.append('audio', audioBlob, 'recording.wav');
    } else if (uploadMode === 'file' && selectedFile) {
      formData.append('audio', selectedFile);
    } else {
      toast({
        title: "Audio Required",
        description: "Please record or upload an audio file first.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/animation/generate-from-audio', {
        method: 'POST',
        body: formData,
      });
      
      setProgress(50);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate animation');
      }
      
      const result = await response.json();
      setAnimationResult(result);
      
      // Fetch blendshape data
      const blendshapesResponse = await fetch(result.blendshapes_url);
      const blendshapesText = await blendshapesResponse.text();
      
      // Parse CSV data
      const parsedData = parseBlendshapesCSV(blendshapesText);
      setBlendshapeData(parsedData);
      
      setProgress(100);
      
      toast({
        title: "Animation generated",
        description: "The animation has been generated successfully.",
      });
    } catch (err) {
      console.error('Error generating animation from audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate animation');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to generate animation',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Parse blendshapes CSV into structured data
  const parseBlendshapesCSV = (csvText: string): BlendshapeData[] => {
    const lines = csvText.trim().split('\n');
    const data: BlendshapeData[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 3) {
        data.push({
          name: parts[0],
          value: parseFloat(parts[1]),
          timestamp: parseFloat(parts[2])
        });
      }
    }

    return data;
  };

  // Play/pause animation
  const togglePlayback = () => {
    if (!animationResult || !blendshapeData.length) return;

    if (isPlaying) {
      // Pause playback
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      // Start playback
      setIsPlaying(true);
      if (audioRef.current) {
        // Reset to beginning if we're at the end
        if (audioRef.current.currentTime >= audioRef.current.duration) {
          audioRef.current.currentTime = 0;
          setCurrentFrame(0);
        }
        audioRef.current.play();
      }

      // Start animation loop
      animateFrame();
    }
  };

  // Animation frame update
  const animateFrame = () => {
    if (!audioRef.current || !isPlaying) return;

    const currentTime = audioRef.current.currentTime * 1000; // Convert to milliseconds

    // Find the current frame based on timestamp
    const frameIndex = blendshapeData.findIndex(
      (data) => data.timestamp >= currentTime
    );

    if (frameIndex !== -1) {
      setCurrentFrame(frameIndex);
      drawFace(frameIndex);
    }

    // Continue animation if not at the end
    if (audioRef.current.currentTime < audioRef.current.duration) {
      animationFrameRef.current = requestAnimationFrame(animateFrame);
    } else {
      setIsPlaying(false);
    }
  };

  // Draw face animation based on blendshape data
  const drawFace = (frameIndex: number) => {
    if (!canvasRef.current || frameIndex < 0 || frameIndex >= blendshapeData.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get all blendshapes for current frame
    const frameData = blendshapeData.filter(
      (data) => Math.abs(data.timestamp - blendshapeData[frameIndex].timestamp) < 0.01
    );

    // Validate we have proper NVIDIA-derived blendshape data
    const hasJawOpen = frameData.some(d => d.name === 'JawOpen');
    
    if (!hasJawOpen) {
      console.error('Invalid blendshape data - missing essential NVIDIA outputs');
      return;
    }

    // Extract face parameters from blendshape data
    const jawOpen = frameData.find(d => d.name === 'JawOpen')?.value || 0;
    const mouthSmileLeft = frameData.find(d => d.name === 'MouthSmileLeft')?.value || 0;
    const mouthSmileRight = frameData.find(d => d.name === 'MouthSmileRight')?.value || 0;
    const eyeBlinkLeft = frameData.find(d => d.name === 'EyeBlinkLeft')?.value || 0;
    const eyeBlinkRight = frameData.find(d => d.name === 'EyeBlinkRight')?.value || 0;

    // Draw face
    drawSimpleFace(ctx, canvas.width, canvas.height, {
      jawOpen,
      mouthSmileLeft,
      mouthSmileRight,
      eyeBlinkLeft,
      eyeBlinkRight
    });
  };

  // Draw a simple face representation
  const drawSimpleFace = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    params: {
      jawOpen: number;
      mouthSmileLeft: number;
      mouthSmileRight: number;
      eyeBlinkLeft: number;
      eyeBlinkRight: number;
    }
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRadius = Math.min(width, height) * 0.35;

    // Draw face outline
    ctx.beginPath();
    ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f8d8c0';
    ctx.fill();
    ctx.strokeStyle = '#a0744e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw eyes
    const eyeY = centerY - faceRadius * 0.15;
    const eyeRadius = faceRadius * 0.12;
    const eyeDistance = faceRadius * 0.5;

    // Left eye
    const leftEyeOpenness = 1 - params.eyeBlinkLeft;
    ctx.beginPath();
    ctx.ellipse(
      centerX - eyeDistance, 
      eyeY, 
      eyeRadius, 
      eyeRadius * leftEyeOpenness, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right eye
    const rightEyeOpenness = 1 - params.eyeBlinkRight;
    ctx.beginPath();
    ctx.ellipse(
      centerX + eyeDistance, 
      eyeY, 
      eyeRadius, 
      eyeRadius * rightEyeOpenness, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw pupils if eyes are open
    if (leftEyeOpenness > 0.3) {
      ctx.beginPath();
      ctx.arc(centerX - eyeDistance, eyeY, eyeRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
    }

    if (rightEyeOpenness > 0.3) {
      ctx.beginPath();
      ctx.arc(centerX + eyeDistance, eyeY, eyeRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
    }

    // Draw mouth
    const mouthY = centerY + faceRadius * 0.3;
    const mouthWidth = faceRadius * 0.7;
    const mouthHeight = faceRadius * 0.1 + (params.jawOpen * faceRadius * 0.4);

    // Calculate smile curve
    const smileAmount = (params.mouthSmileLeft + params.mouthSmileRight) / 2;
    const mouthCurve = smileAmount * 0.4;

    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      mouthY + (mouthCurve * faceRadius), 
      mouthWidth / 2, 
      mouthHeight, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = '#f22c57';
    ctx.fill();
    ctx.strokeStyle = '#a02233';
    ctx.lineWidth = 2;
    ctx.stroke();

    // If mouth is open, draw tongue and teeth
    if (params.jawOpen > 0.1) {
      // Teeth
      ctx.beginPath();
      ctx.ellipse(
        centerX, 
        mouthY - mouthHeight * 0.2, 
        mouthWidth / 2 - 5, 
        mouthHeight * 0.4, 
        0, 
        0, 
        Math.PI
      );
      ctx.fillStyle = 'white';
      ctx.fill();

      // Tongue
      if (params.jawOpen > 0.3) {
        ctx.beginPath();
        ctx.ellipse(
          centerX, 
          mouthY + mouthHeight * 0.3, 
          mouthWidth / 4, 
          mouthHeight * 0.3, 
          0, 
          0, 
          Math.PI
        );
        ctx.fillStyle = '#ff8c9e';
        ctx.fill();
      }
    }
  };

  // Load audio when animation result changes
  useEffect(() => {
    if (animationResult?.audio_url) {
      if (audioRef.current) {
        audioRef.current.src = animationResult.audio_url;
        audioRef.current.load();
      }
    }
  }, [animationResult]);

  // Set up canvas when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw initial face
        drawSimpleFace(ctx, canvas.width, canvas.height, {
          jawOpen: 0,
          mouthSmileLeft: 0.1,
          mouthSmileRight: 0.1,
          eyeBlinkLeft: 0,
          eyeBlinkRight: 0
        });
      }
    }

    // Clean up animation frame on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Lip-Sync Animation Demo</h1>
      <p className="text-lg mb-8">
        Test real-time lip-sync animations with NVIDIA Audio2Face-3D technology.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input Options</CardTitle>
            <CardDescription>
              Choose how to generate the lip-sync animation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Character Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claire">Claire</SelectItem>
                    <SelectItem value="mark">Mark</SelectItem>
                    <SelectItem value="james">James</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs defaultValue="text" onValueChange={(value) => setUploadMode(value as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="text">Text to Speech</TabsTrigger>
                  <TabsTrigger value="record">Record Audio</TabsTrigger>
                  <TabsTrigger value="file">Upload Audio</TabsTrigger>
                </TabsList>
                
                {/* Text to Speech Tab */}
                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">Text to Animate</Label>
                    <Textarea
                      id="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter text to animate..."
                      rows={4}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {samplePhrases.map((phrase, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setText(phrase)}
                        disabled={isLoading}
                      >
                        {phrase.length > 20 ? `${phrase.substring(0, 20)}...` : phrase}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setText('')}
                      disabled={isLoading || !text}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={generateAnimation}
                      disabled={isLoading || !text.trim()}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Generate Animation
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Record Audio Tab */}
                <TabsContent value="record" className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full p-4 border rounded-lg bg-muted/30 flex flex-col items-center">
                      {isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center animate-pulse">
                            <MicOff className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-sm text-muted-foreground">Recording in progress...</div>
                        </div>
                      ) : audioBlob ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <Volume2 className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-sm text-muted-foreground">Recording complete</div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <Mic className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-sm text-muted-foreground">Click to start recording</div>
                        </div>
                      )}
                      
                      <audio ref={audioRef} controls className="w-full mt-4" />
                      
                      <div className="flex justify-center gap-4 mt-4 w-full">
                        {isRecording ? (
                          <Button 
                            variant="destructive" 
                            onClick={stopRecording}
                            className="w-full"
                          >
                            <MicOff className="mr-2 h-4 w-4" />
                            Stop Recording
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            onClick={startRecording}
                            className="w-full"
                            disabled={isLoading || audioBlob !== null}
                          >
                            <Mic className="mr-2 h-4 w-4" />
                            Start Recording
                          </Button>
                        )}
                        
                        {audioBlob && (
                          <Button 
                            variant="outline"
                            onClick={() => setAudioBlob(null)}
                            className="w-full"
                            disabled={isLoading}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Record Again
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={generateAnimationFromAudio}
                      disabled={isLoading || !audioBlob}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Generate Animation from Recording
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Upload Audio File Tab */}
                <TabsContent value="file" className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full p-4 border rounded-lg bg-muted/30 flex flex-col items-center">
                      <Label 
                        htmlFor="audio-file" 
                        className="cursor-pointer w-full flex flex-col items-center gap-2"
                      >
                        {selectedFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                              <Volume2 className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-sm font-medium">{selectedFile.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                              <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Click to upload audio (WAV format recommended)
                            </div>
                          </div>
                        )}
                      </Label>
                      
                      <Input
                        id="audio-file"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isLoading}
                      />
                      
                      <audio ref={audioRef} controls className="w-full mt-4" />
                      
                      {selectedFile && (
                        <Button 
                          variant="outline"
                          onClick={() => setSelectedFile(null)}
                          className="w-full mt-4"
                          disabled={isLoading}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Choose Another File
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      onClick={generateAnimationFromAudio}
                      disabled={isLoading || !selectedFile}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Generate Animation from File
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Animation Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Animation Preview</CardTitle>
            <CardDescription>
              View the generated lip-sync animation
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center w-full">
                <Progress value={progress} className="w-full mb-4" />
                <p className="text-center text-sm text-muted-foreground">
                  Generating animation... This may take a moment.
                </p>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <canvas 
                  ref={canvasRef} 
                  width={400} 
                  height={400} 
                  className="border rounded-md mb-4"
                />

                {animationResult && (
                  <div className="w-full space-y-4">
                    <audio 
                      ref={audioRef} 
                      src={animationResult.audio_url}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />

                    <Button
                      onClick={togglePlayback}
                      className="w-full"
                      variant="default"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <PlayIcon className="mr-2 h-4 w-4" />
                          {currentFrame > 0 ? "Resume" : "Play Animation"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blendshapes Data (Optional) */}
      {blendshapeData.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Blendshape Data</CardTitle>
            <CardDescription>
              Technical details of the animation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="data">Raw Data</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="space-y-4">
                  <p>
                    Total Frames: {new Set(blendshapeData.map(d => d.timestamp)).size}
                  </p>
                  <p>
                    Duration: {Math.max(...blendshapeData.map(d => d.timestamp)) / 1000}s
                  </p>
                  <p>
                    Unique Blendshapes: {new Set(blendshapeData.map(d => d.name)).size}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="data">
                <div className="h-[300px] overflow-y-auto border rounded-md p-4">
                  <pre className="text-xs">
                    {JSON.stringify(blendshapeData.slice(0, 100), null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Animation;