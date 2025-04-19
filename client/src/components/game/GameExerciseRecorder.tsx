import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MicIcon, StopCircleIcon, VolumeIcon, XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
import { Exercise, PronunciationAssessmentResult } from '@/lib/types';
import useAudioRecording from '@/hooks/useAudioRecording';

interface GameExerciseRecorderProps {
  exercise: Exercise;
  onClose: () => void;
  onComplete: (result: PronunciationAssessmentResult) => void;
}

export function GameExerciseRecorder({ 
  exercise, 
  onClose, 
  onComplete 
}: GameExerciseRecorderProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<PronunciationAssessmentResult | null>(null);
  
  // Use our existing audio recording hook
  const { 
    isRecording, 
    recordingDuration, 
    audioUrl, 
    startRecording, 
    stopRecording 
  } = useAudioRecording({
    onRecordingComplete: processRecording,
    onError: (error) => {
      console.error('Recording error:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone. Please check your browser permissions.',
        variant: 'destructive'
      });
    }
  });
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Process recording with Azure Speech
  async function processRecording(audioBlob: Blob) {
    setIsProcessing(true);
    
    try {
      toast({
        title: 'Processing Recording',
        description: 'Analyzing your pronunciation...'
      });
      
      console.log(`Processing recording with text: "${exercise.content}"`);
      
      // Send to Azure Speech for assessment
      const results = await submitReadingRecording(audioBlob, exercise.id, exercise.content);
      
      console.log('Received assessment results:', results);
      
      if (!results) {
        throw new Error('No results received from speech assessment');
      }
      
      // Update assessment results
      setAssessmentResults(results);
      
      // Notify parent component
      onComplete(results);
      
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
  }
  
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Practice Exercise</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={onClose}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-muted/40 rounded-lg p-4 mb-4">
              <p className="font-medium mb-2">Say this {exercise.type}:</p>
              <p className="text-lg">{exercise.content}</p>
              
              <div className="flex justify-end mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex items-center text-xs"
                  onClick={() => {
                    const speech = new SpeechSynthesisUtterance(exercise.content);
                    window.speechSynthesis.speak(speech);
                  }}
                >
                  <VolumeIcon className="h-3.5 w-3.5 mr-1" />
                  Listen
                </Button>
              </div>
            </div>
            
            <div className="mb-6">
              {isRecording && (
                <Alert className="mb-4 border-red-200 bg-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                  <div className="flex items-center">
                    <div className="mr-2 h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                    <AlertTitle>Recording in progress</AlertTitle>
                  </div>
                  <AlertDescription>
                    {formatTime(recordingDuration)}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex space-x-3">
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
                
                {/* Only show play button when audio is available */}
                {audioUrl && !isRecording && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      audio.play();
                    }}
                    disabled={isProcessing}
                  >
                    <VolumeIcon className="mr-2 h-4 w-4" />
                    Play
                  </Button>
                )}
              </div>
            </div>
            
            {/* Assessment results preview */}
            {assessmentResults && (
              <div className="border rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Results:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Pronunciation</div>
                    <div className="font-bold">{assessmentResults.pronunciationScore.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Fluency</div>
                    <div className="font-bold">{assessmentResults.fluencyScore.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completeness</div>
                    <div className="font-bold">{assessmentResults.completenessScore.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Accuracy</div>
                    <div className="font-bold">{assessmentResults.accuracyScore.toFixed(1)}%</div>
                  </div>
                </div>
                
                <Button
                  className="w-full mt-4"
                  onClick={() => onComplete(assessmentResults)}
                >
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}