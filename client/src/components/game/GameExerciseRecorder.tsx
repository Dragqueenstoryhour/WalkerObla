import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MicIcon, StopCircleIcon, VolumeIcon, XIcon, CheckCircle2, Award, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
import { Exercise, PronunciationAssessmentResult } from '@/lib/types';
import useAudioRecording from '@/hooks/useAudioRecording';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

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
  
  // Start recording automatically when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isRecording && !assessmentResults) {
        startRecording();
        toast({
          title: 'Recording Started',
          description: 'Speak now... Say the word or phrase clearly.',
          variant: 'default',
        });
      }
    }, 500); // Small delay to ensure component is mounted
    
    return () => clearTimeout(timer);
  }, []);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // State to track correctly pronounced words
  const [wordSuccesses, setWordSuccesses] = useState<{[key: string]: boolean}>({});
  const [retryMode, setRetryMode] = useState(false);
  const [lowScoreAudio, setLowScoreAudio] = useState<string | null>(null);

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
      
      // Add additional debug logging for Azure assessment results
      console.log(`Azure assessment scores - Pronunciation: ${results.pronunciationScore.toFixed(1)}, ` +
                  `Fluency: ${results.fluencyScore.toFixed(1)}, ` +
                  `Accuracy: ${results.accuracyScore.toFixed(1)}, ` +
                  `Completeness: ${results.completenessScore.toFixed(1)}`);
      
      // Log word-level results from Azure
      console.log('Word-level results:', results.wordLevelResults.map(w => 
        `${w.word}: ${w.accuracyScore.toFixed(1)} (${w.errorType || 'None'})`
      ).join(', '));

      if (!results) {
        throw new Error('No results received from speech assessment');
      }

      // Store audio URL for low scores
      if (results.pronunciationScore < 75) {
        setLowScoreAudio(audioUrl);
        setRetryMode(true);
      }

      // Update word success states based on individual word scores
      const newWordSuccesses = { ...wordSuccesses };
      results.wordLevelResults.forEach(word => {
        // Mark words with accuracy score >= 80 as successful
        if (word.accuracyScore >= 80) {
          newWordSuccesses[word.word] = true;
        }
      });
      setWordSuccesses(newWordSuccesses);

      // Update assessment results
      setAssessmentResults(results);

      // Generate voice feedback based on score
      const provideFeedback = () => {
        // Create feedback message based on score
        let feedbackMessage = "";

        if (results.pronunciationScore >= 90) {
          feedbackMessage = "Excellent job! Your pronunciation is outstanding!";
        } else if (results.pronunciationScore >= 75) {
          feedbackMessage = "Great job! Your pronunciation is very clear.";
        } else if (results.pronunciationScore >= 60) {
          feedbackMessage = "Not bad, but you can improve with practice. Listen carefully and try again.";
        } else {
          feedbackMessage = "Let's practice more. Listen to the correct pronunciation and try again.";
        }

        // Speak the feedback message
        const speech = new SpeechSynthesisUtterance(feedbackMessage);
        window.speechSynthesis.speak(speech);

        // After feedback completes, update UI and proceed
        speech.onend = () => {
          if (!retryMode && results.pronunciationScore >= 75) {
            // Notify parent component only if score is sufficient and not in retry mode
            onComplete(results);

            // Celebration for great performance
            if (results.pronunciationScore >= 90) {
              // Trigger confetti effect for excellent scores
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
              });

              setTimeout(() => {
                confetti({
                  particleCount: 50,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0, y: 0.6 }
                });

                confetti({
                  particleCount: 50,
                  angle: 120,
                  spread: 55,
                  origin: { x: 1, y: 0.6 }
                });
              }, 600);
            }

            toast({
              title: results.pronunciationScore >= 90 ? '🌟 Outstanding!' : 'Great Job!',
              description: `Pronunciation: ${results.pronunciationScore.toFixed(1)}%, Fluency: ${results.fluencyScore.toFixed(1)}%`,
              variant: 'default',
            });
          } else if (!retryMode) {
            // Don't show duplicate error popup, we have the UI for feedback

            // Automatically play the correct pronunciation after a short delay
            setTimeout(() => {
              const correctPronunciation = new SpeechSynthesisUtterance(exercise.content);
              correctPronunciation.rate = 0.9; // Slightly slower for better clarity
              window.speechSynthesis.speak(correctPronunciation);
            }, 1500);
          }
        };
      };

      provideFeedback();

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

  // Function to handle retrying with corrected pronunciation
  const handleRetry = () => {
    setRetryMode(false);
    setLowScoreAudio(null);
    startRecording();
  };

  // Function to accept current recording despite low score
  const handleAccept = () => {
    if (assessmentResults) {
      onComplete(assessmentResults);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md w-full mx-4 my-6">
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

            {!assessmentResults && (
              <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/50">
                <div className="text-xl font-medium text-center text-orange-800 dark:text-orange-200">
                  {exercise.content}
                </div>
              </div>
            )}

            <div className="mb-6">
              {isRecording && (
                <Alert className="mb-4 border-red-200 bg-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                  <div className="flex items-center">
                    <div className="mr-2 h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                    <AlertTitle>Recording in progress</AlertTitle>
                  </div>
                  <AlertDescription>
                    Speak the word or phrase clearly
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3">
                {!isRecording ? (
                  <Button 
                    onClick={startRecording} 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    disabled={isProcessing}
                  >
                    <MicIcon className="mr-2 h-4 w-4" />
                    Start Speaking
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording} 
                    variant="destructive"
                    className="flex-1 animate-pulse"
                  >
                    <StopCircleIcon className="mr-2 h-4 w-4" />
                    Finished
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
              <div className="border-2 border-[#57cc99] rounded-lg bg-[#f5f7fa] p-6 mt-4 relative overflow-hidden shadow-md">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#57cc99]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#c2f8d7] rounded-tl-xl"></div>

                <div className="w-full max-w-md mx-auto bg-white rounded-lg p-6 shadow-lg">
                  <h2 className="text-2xl font-bold text-center text-[#264653] mb-4">Your Performance</h2>
                  <div className="text-6xl font-bold text-center mb-2" style={{ color: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' : '#e76f51' }}>
                    {Math.round(assessmentResults.pronunciationScore)}%
                  </div>
                  <p className="text-center text-gray-600 mb-4">
                    {assessmentResults.pronunciationScore >= 80 
                      ? "Great job! Your pronunciation is very clear."
                      : "Good effort! Try again to improve your score."}
                  </p>
                  
                  {/* Detailed scores breakdown */}
                  <div className="space-y-3 mb-5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Pronunciation</span>
                        <span>{Math.round(assessmentResults.pronunciationScore)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.round(assessmentResults.pronunciationScore)}%`,
                            backgroundColor: assessmentResults.pronunciationScore >= 80 ? '#2a9d8f' : 
                                            assessmentResults.pronunciationScore >= 60 ? '#e9c46a' : '#e76f51' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Fluency</span>
                        <span>{Math.round(assessmentResults.fluencyScore)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.round(assessmentResults.fluencyScore)}%`,
                            backgroundColor: assessmentResults.fluencyScore >= 80 ? '#2a9d8f' : 
                                            assessmentResults.fluencyScore >= 60 ? '#e9c46a' : '#e76f51' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Completeness</span>
                        <span>{Math.round(assessmentResults.completenessScore)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.round(assessmentResults.completenessScore)}%`,
                            backgroundColor: assessmentResults.completenessScore >= 80 ? '#2a9d8f' : 
                                            assessmentResults.completenessScore >= 60 ? '#e9c46a' : '#e76f51' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Accuracy</span>
                        <span>{Math.round(assessmentResults.accuracyScore)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.round(assessmentResults.accuracyScore)}%`,
                            backgroundColor: assessmentResults.accuracyScore >= 80 ? '#2a9d8f' : 
                                            assessmentResults.accuracyScore >= 60 ? '#e9c46a' : '#e76f51' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {assessmentResults.prosodyScore && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Prosody</span>
                          <span>{Math.round(assessmentResults.prosodyScore)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="h-2.5 rounded-full" 
                            style={{ 
                              width: `${Math.round(assessmentResults.prosodyScore)}%`,
                              backgroundColor: assessmentResults.prosodyScore >= 80 ? '#2a9d8f' : 
                                              assessmentResults.prosodyScore >= 60 ? '#e9c46a' : '#e76f51' 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Word-by-word analysis */}
                  {assessmentResults.wordLevelResults && assessmentResults.wordLevelResults.length > 0 && (
                    <div className="mt-5 pt-5 border-t">
                      <h3 className="text-sm font-semibold mb-3">Word-by-word analysis:</h3>
                      <div className="flex flex-wrap gap-2">
                        {assessmentResults.wordLevelResults.map((word, idx) => {
                          // Calculate color based on score
                          const score = word.accuracyScore;
                          const bgColor = score > 85 ? 'bg-green-100' : 
                                        score > 70 ? 'bg-yellow-100' : 
                                        'bg-red-100';
                          const textColor = score > 85 ? 'text-green-800' : 
                                          score > 70 ? 'text-yellow-800' : 
                                          'text-red-800';
                          
                          return (
                            <div 
                              key={`word-${idx}`} 
                              className={`px-2 py-1 rounded text-sm ${bgColor} ${textColor}`}
                            >
                              {word.word} ({Math.round(score)}%)
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {assessmentResults.pronunciationScore < 80 && (
                    <button
                      className="w-full py-2 bg-[#2a9d8f] text-white rounded-lg font-medium mt-4"
                      onClick={handleRetry}
                    >
                      Try Again
                    </button>
                  )}
                </div>

                {/* Playback your recording section */}
                {audioUrl && (
                  <div className="bg-white/80 border border-[#57cc99] rounded-md p-3 mb-4 mt-4 flex items-center justify-between">
                    <div className="text-sm font-medium text-[#264653]">Listen to your recording:</div>
                    <button
                      className="bg-[#57cc99] text-white rounded-full p-2 flex items-center justify-center shadow-md hover:bg-[#38b37a] transition-colors"
                      onClick={() => {
                        const audio = new Audio(audioUrl);
                        audio.play();
                      }}
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}