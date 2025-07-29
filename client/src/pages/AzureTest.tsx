import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MicIcon, StopCircleIcon, VolumeIcon, RotateCw, Ear } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useAudioRecording from '@/hooks/useAudioRecording';
import { PronunciationAssessmentResult } from '@/lib/types';
import { getApiUrl } from '@/lib/utils';

export default function AzureTest() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [testText, setTestText] = useState('The quick brown fox jumps over the lazy dog.');
  const [assessmentResults, setAssessmentResults] = useState<PronunciationAssessmentResult | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use our audio recording hook
  const { 
    isRecording, 
    recordingDuration, 
    audioUrl, 
    startRecording, 
    stopRecording,
    audioBlob
  } = useAudioRecording({
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
  async function processRecording() {
    if (!audioBlob) {
      toast({
        title: 'No Recording',
        description: 'Please record audio first',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      toast({
        title: 'Processing Recording',
        description: 'Sending to Azure Speech Services...'
      });

      // Create FormData to send to our API
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('contentId', '0'); // Use a dummy content ID for testing
      formData.append('text', testText);

      // Call the debug endpoint for detailed diagnostics
      const response = await fetch(getApiUrl('/api/debug/pronunciation'), {
        method: 'POST',
        body: formData
      });

      let results;
      if (response.ok) {
        results = await response.json();
        console.log('Azure debug response:', results);
        
        // If using debug endpoint, extract actual results
        if (results.result) {
          setAssessmentResults(results.result);
        } else {
          setAssessmentResults(results);
        }
        
        toast({
          title: 'Assessment Complete',
          description: `Pronunciation score: ${results.result?.pronunciationScore || results.pronunciationScore}%`
        });
      } else {
        // Try to get detailed error
        const errorData = await response.json();
        console.error('Azure API error:', errorData);
        
        toast({
          title: 'Assessment Failed',
          description: errorData.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: 'Processing Error',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Azure Speech Testing Tool</h1>
      
      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Pronunciation Assessment</CardTitle>
            <CardDescription>
              Record yourself saying the text below and Azure will assess your pronunciation.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reference Text</label>
              <Textarea 
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="resize-none h-24"
                placeholder="Enter text to pronounce..."
              />
            </div>
            
            <div className="flex space-x-3 mb-6">
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={isProcessing || testText.trim().length === 0}
                >
                  <MicIcon className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="flex-1 animate-pulse"
                >
                  <StopCircleIcon className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
              
              {audioUrl && !isRecording && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.src = audioUrl;
                      audioRef.current.play();
                    }
                  }}
                  disabled={isProcessing}
                  className="bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                >
                  <Ear className="mr-2 h-4 w-4" />
                  Hear
                </Button>
              )}
              
              {audioUrl && !isRecording && (
                <Button 
                  variant="secondary" 
                  onClick={processRecording}
                  disabled={isProcessing}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Assess'}
                </Button>
              )}
            </div>
            
            {/* Recording status */}
            {isRecording && (
              <div className="flex items-center justify-between mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                  <span className="font-medium">Recording in progress</span>
                </div>
                <span className="text-sm font-mono">{formatTime(recordingDuration)}</span>
              </div>
            )}
            
            {/* Hidden audio element for playback */}
            <audio ref={audioRef} className="hidden" />
          </CardContent>
        </Card>
        
        {/* Assessment Results */}
        {assessmentResults && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
              <CardDescription>
                Detailed pronunciation assessment from Azure Speech Services
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Pronunciation Score</span>
                    <span>{assessmentResults.pronunciationScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={assessmentResults.pronunciationScore} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Fluency Score</span>
                    <span>{assessmentResults.fluencyScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={assessmentResults.fluencyScore} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Accuracy Score</span>
                    <span>{assessmentResults.accuracyScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={assessmentResults.accuracyScore} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Completeness Score</span>
                    <span>{assessmentResults.completenessScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={assessmentResults.completenessScore} className="h-2" />
                </div>
                
                {assessmentResults.prosodyScore && (
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>Prosody Score</span>
                      <span>{assessmentResults.prosodyScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={assessmentResults.prosodyScore} className="h-2" />
                  </div>
                )}
              </div>
              
              {/* Word-level results */}
              {assessmentResults.wordLevelResults && assessmentResults.wordLevelResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Word-by-Word Assessment</h3>
                  <div className="border rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Word</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Error Type</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {assessmentResults.wordLevelResults.map((word, idx) => (
                          <tr key={idx} className={word.accuracyScore < 70 ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap">{word.word}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{word.accuracyScore.toFixed(1)}%</td>
                            <td className="px-4 py-2 whitespace-nowrap">{word.errorType || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Raw JSON toggle for debugging */}
              {assessmentResults.rawJson && (
                <div className="mt-6">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-500 hover:text-blue-700 font-medium">Show Raw API Response</summary>
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded overflow-auto max-h-64">
                      {JSON.stringify(assessmentResults.rawJson, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}