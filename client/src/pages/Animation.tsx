import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Mic, Play, Square, Upload, Volume2, Type } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BlendshapeData {
  timeCode: number;
  blendShapes: Record<string, number>;
}

const Animation = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false); 
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>('james');
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [inputText, setInputText] = useState<string>('Hello, this is a test for the Audio2Face animation system.');
  const [animationData, setAnimationData] = useState<BlendshapeData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start recording audio
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        audioChunksRef.current = [];
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start a timer to track recording time
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setSuccess('Recording started. Speak into your microphone.');
    } catch (err) {
      setError('Unable to access microphone. Please ensure you have given permission.');
      console.error('Error starting recording:', err);
    }
  };
  
  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setSuccess('Recording stopped. Click "Generate Animation" to process your audio.');
    }
  };
  
  // Process the recorded audio or uploaded file
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setAnimationData(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('model', selectedModel);
      
      const response = await fetch('/api/animation/generate-from-audio', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Animation generation result:', result);
      
      if (result.success) {
        setSuccess('Animation generated successfully!');
        
        // Set the audio URL for playback
        if (result.audio_url) {
          setAudioUrl(result.audio_url);
          if (audioRef.current) {
            audioRef.current.src = result.audio_url;
            audioRef.current.load();
          }
        }
        
        // Fetch the blendshapes data
        if (result.blendshapes_url) {
          await fetchBlendshapesData(result.blendshapes_url);
        }
      } else {
        setError(result.error || 'Failed to generate animation');
      }
    } catch (err) {
      console.error('Error generating animation:', err);
      setError(`Error generating animation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Fetch blendshapes data from the server
  const fetchBlendshapesData = async (url: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch blendshapes data: ${response.status}`);
      }
      
      const csvText = await response.text();
      // Parse CSV data into BlendshapeData array
      const parsedData = parseBlendshapesCSV(csvText);
      setAnimationData(parsedData);
      
    } catch (err) {
      console.error('Error fetching blendshapes:', err);
      setError(`Error fetching animation data: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Parse CSV data into BlendshapeData format
  const parseBlendshapesCSV = (csvText: string): BlendshapeData[] => {
    // This is a simplistic CSV parser - may need enhancement for complex data
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',');
    const timeCodeIndex = headers.indexOf('timeCode');
    
    return lines.slice(1)
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = line.split(',');
        const timeCode = parseFloat(values[timeCodeIndex]);
        
        const blendShapes: Record<string, number> = {};
        headers.forEach((header, index) => {
          if (index !== timeCodeIndex && header.trim() !== '') {
            blendShapes[header] = parseFloat(values[index]);
          }
        });
        
        return { timeCode, blendShapes };
      });
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setRecordedAudio(file);
    setSuccess(`File "${file.name}" selected. Click "Generate Animation" to process.`);
  };
  
  // Generate audio from text using OpenAI TTS
  const generateTextToSpeech = async () => {
    if (!inputText.trim()) {
      setError('Please enter text to convert to speech');
      return;
    }
    
    setIsTtsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          voice: selectedVoice
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      setRecordedAudio(audioBlob);
      
      // Create a temporary URL for the audio blob
      const tempUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = tempUrl;
        audioRef.current.load();
      }
      
      setSuccess('Text-to-speech generated successfully. Click "Generate Animation" to process.');
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(`Error generating speech: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTtsLoading(false);
    }
  };
  
  // Process the selected or recorded audio
  const handleGenerateAnimation = async () => {
    if (!recordedAudio) {
      setError('Please record audio, upload a file, or generate speech from text first');
      return;
    }
    
    await processAudio(recordedAudio);
  };
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">NVIDIA Audio2Face 3D Animation</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Audio Input</CardTitle>
            <CardDescription>Record or upload audio to generate facial animations</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="model-select">Animation Model</Label>
              <Select 
                value={selectedModel} 
                onValueChange={setSelectedModel}
                disabled={isRecording || isProcessing}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="james">James</SelectItem>
                  <SelectItem value="claire">Claire</SelectItem>
                  <SelectItem value="mark">Mark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Tabs defaultValue="record" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="record" disabled={isProcessing}>
                  <Mic className="h-4 w-4 mr-2" /> Record
                </TabsTrigger>
                <TabsTrigger value="text" disabled={isProcessing}>
                  <Type className="h-4 w-4 mr-2" /> Text to Speech
                </TabsTrigger>
                <TabsTrigger value="upload" disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="record" className="mt-4">
                <div className="flex flex-col gap-4">
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isRecording ? (
                      <>
                        <Square className="mr-2 h-4 w-4" /> Stop Recording ({recordingTime}s)
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" /> Start Recording
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="tts-text">Enter Text</Label>
                    <Textarea
                      id="tts-text"
                      placeholder="Enter text to convert to speech..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isTtsLoading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="voice-select">Voice</Label>
                    <Select
                      value={selectedVoice}
                      onValueChange={setSelectedVoice}
                      disabled={isTtsLoading}
                    >
                      <SelectTrigger id="voice-select">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={generateTextToSpeech}
                    disabled={isTtsLoading || !inputText.trim()}
                  >
                    {isTtsLoading ? (
                      <>Generating... <Progress className="ml-2" value={50} /></>
                    ) : (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" /> Generate Speech
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="mt-4">
                <div className="flex flex-col gap-4">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Select Audio File
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6">
              <Button 
                onClick={handleGenerateAnimation}
                disabled={isRecording || isProcessing || !recordedAudio}
                className="w-full"
              >
                {isProcessing ? (
                  <>Processing Animation... <Progress className="ml-2" value={30} /></>
                ) : (
                  <>Generate 3D Face Animation</>
                )}
              </Button>
            </div>
            
            {audioUrl && (
              <div className="mt-4">
                <Label htmlFor="audio-playback">Audio Playback</Label>
                <audio 
                  ref={audioRef} 
                  controls 
                  className="w-full mt-1" 
                  id="audio-playback" 
                  src={audioUrl}
                />
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert variant="default" className="mt-4 bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Animation Preview</CardTitle>
            <CardDescription>3D facial animation generated from audio</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="bg-slate-100 rounded-md h-64 flex items-center justify-center">
              {animationData ? (
                <div className="text-center">
                  <div className="text-green-600 font-medium">
                    Animation generated successfully!
                  </div>
                  <div className="mt-2">
                    {animationData.length} frames of animation data
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play();
                      }
                    }}
                  >
                    <Play className="h-4 w-4 mr-1" /> Play Animation
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  {isProcessing ? (
                    <div>
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full inline-block mb-2"></div>
                      <div>Generating animation...</div>
                    </div>
                  ) : (
                    'Animation will appear here after processing'
                  )}
                </div>
              )}
            </div>
            
            {animationData && (
              <div className="mt-4">
                <Label>Animation Details</Label>
                <div className="mt-2 text-sm overflow-auto h-32 border rounded p-2">
                  <div><strong>Total Frames:</strong> {animationData.length}</div>
                  <div><strong>Duration:</strong> {animationData[animationData.length - 1]?.timeCode.toFixed(2)}s</div>
                  {animationData[0] && (
                    <div className="mt-2">
                      <strong>Sample Blendshapes:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {Object.entries(animationData[0].blendShapes)
                          .slice(0, 5)
                          .map(([name, value]) => (
                            <li key={name}>{name}: {value.toFixed(4)}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Animation;