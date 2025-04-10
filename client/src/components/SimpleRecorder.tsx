import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicIcon, StopCircleIcon, PlayIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';

interface SimpleRecorderProps {
  referenceText: string;
  onTranscriptReceived?: (transcript: string) => void;
  onAssessmentReceived?: (assessment: any) => void;
}

export function SimpleRecorder({ 
  referenceText, 
  onTranscriptReceived,
  onAssessmentReceived 
}: SimpleRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // Handle timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Start recording function
  const startRecording = async () => {
    try {
      // Reset states
      setTranscript('');
      setAudioUrl(null);
      setRecordingTime(0);
      setAssessmentResults(null);
      chunksRef.current = [];
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Media recorder stopped');
        
        // Clean up the stream properly
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => {
            console.log(`Stopping track: ${track.kind}`);
            track.stop();
          });
          streamRef.current = null;
        }
        
        try {
          // Create audio blob for playback
          const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log(`Created audio blob: ${originalBlob.size} bytes, type: ${originalBlob.type}`);
          
          // Create URL for audio playback
          const url = URL.createObjectURL(originalBlob);
          setAudioUrl(url);
          
          // Process the recording with Azure Speech
          await processRecording(originalBlob);
        } catch (error) {
          console.error('Error processing recording:', error);
          toast({
            title: 'Recording Error',
            description: 'Could not process the recording. Please try again.',
            variant: 'destructive'
          });
        }
        
        setIsRecording(false);
      };
      
      // Start recording
      console.log('Starting media recorder');
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access the microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  };

  // Stop recording function
  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Calling stop() on media recorder');
      mediaRecorderRef.current.stop();
    } else {
      console.log('Media recorder was not active');
    }
    
    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Process recording with Azure Speech
  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      toast({
        title: 'Processing Recording',
        description: 'Analyzing your pronunciation...'
      });
      
      console.log(`Processing recording with text: "${referenceText}"`);
      
      // Send to Azure Speech for assessment
      const results = await submitReadingRecording(audioBlob, Date.now(), referenceText);
      
      console.log('Received assessment results:', results);
      
      if (!results) {
        throw new Error('No results received from speech assessment');
      }
      
      // Update assessment results
      setAssessmentResults(results);
      
      // Notify parent components
      if (onAssessmentReceived) {
        onAssessmentReceived(results);
      }
      
      toast({
        title: 'Analysis Complete',
        description: `Pronunciation: ${results.pronunciationScore.toFixed(1)}%, Fluency: ${results.fluencyScore.toFixed(1)}%`
      });
      
    } catch (error) {
      console.error('Error assessing pronunciation:', error);
      toast({
        title: 'Assessment Error',
        description: 'Could not analyze your speech. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean up function when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Speech Recording</h3>
          {isRecording && (
            <div className="flex items-center text-red-500">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
              Recording: {formatTime(recordingTime)}
            </div>
          )}
        </div>
        
        <div className="bg-muted/40 rounded-lg p-4 mb-4">
          <p className="font-medium mb-2">Text to read:</p>
          <p className="text-lg">{referenceText}</p>
        </div>
        
        <div className="flex space-x-3 mb-4">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              className="flex-1"
              disabled={isProcessing}
            >
              <MicIcon className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
              className="flex-1"
            >
              <StopCircleIcon className="mr-2 h-4 w-4" />
              Stop Recording
            </Button>
          )}
          
          {audioUrl && (
            <Button 
              variant="outline" 
              onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play();
              }}
              disabled={isRecording || isProcessing}
            >
              <PlayIcon className="mr-2 h-4 w-4" />
              Play Recording
            </Button>
          )}
        </div>
        
        {assessmentResults && (
          <div className="bg-primary/10 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Speech Assessment Results:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pronunciation Score</p>
                <p className="text-lg font-medium">{assessmentResults.pronunciationScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fluency Score</p>
                <p className="text-lg font-medium">{assessmentResults.fluencyScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completeness Score</p>
                <p className="text-lg font-medium">{assessmentResults.completenessScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accuracy Score</p>
                <p className="text-lg font-medium">{assessmentResults.accuracyScore.toFixed(1)}%</p>
              </div>
            </div>
            
            {assessmentResults.wordLevelResults && assessmentResults.wordLevelResults.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Word-by-word analysis:</p>
                <div className="bg-muted/30 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                  {assessmentResults.wordLevelResults.map((word: any, i: number) => (
                    <span 
                      key={i} 
                      className={`inline-block mr-2 mb-1 px-1 rounded ${
                        word.accuracyScore > 80 
                          ? 'bg-green-100 text-green-800' 
                          : word.accuracyScore > 60 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {word.word} ({word.accuracyScore.toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {isProcessing && (
          <div className="mt-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Processing assessment...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SimpleRecorder;