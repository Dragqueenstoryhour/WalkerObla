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
        toast({
          title: 'Practice Needed',
          description: `Score: ${results.pronunciationScore.toFixed(1)}%. Listen to your recording and try again.`,
          variant: 'destructive',
        });
      }
      
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
  }
  
  // Function to accept current recording despite low score
  const handleAccept = () => {
    if (assessmentResults) {
      onComplete(assessmentResults);
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
            
            <div className="bg-[#fdf1d6] border-2 border-[#f4a261] rounded-lg p-6 mb-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#f4a261]"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#e9c46a] rounded-tl-xl"></div>
              <div className="absolute top-2 right-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6,3A1,1 0 0,1 7,4V6H17V4A1,1 0 0,1 18,3A1,1 0 0,1 19,4V6H21A1,1 0 0,1 22,7A1,1 0 0,1 23,8V20A1,1 0 0,1 22,21H2A1,1 0 0,1 1,20V8A1,1 0 0,1 2,7H4V4A1,1 0 0,1 5,3A1,1 0 0,1 6,4V6" fill="#2a9d8f" />
                </svg>
              </div>
              
              <p className="font-medium text-[#264653] mb-4">Say this {exercise.type}:</p>
              
              <div className="flex flex-wrap gap-3 justify-center mb-4">
                {exercise.content.split(' ').map((word, index) => {
                  const isSuccess = wordSuccesses[word];
                  
                  return (
                    <AnimatePresence key={`${word}-${index}`}>
                      {!isSuccess ? (
                        <motion.div
                          initial={{ scale: 1 }}
                          animate={{ 
                            scale: [1, 1.05, 1],
                            transition: { 
                              repeat: Infinity, 
                              repeatType: "reverse", 
                              duration: 1.5,
                              delay: index * 0.2
                            }
                          }}
                          exit={{ 
                            scale: [1, 1.2, 0], 
                            opacity: [1, 1, 0],
                            transition: { duration: 0.5 } 
                          }}
                          className={`
                            px-4 py-2 rounded-lg text-lg font-medium
                            relative overflow-hidden
                            ${
                              assessmentResults?.wordLevelResults.find(w => w.word === word)?.accuracyScore < 70
                              ? 'bg-[#e76f51] text-white' 
                              : 'bg-[#e9c46a] text-[#264653]'
                            }
                          `}
                        >
                          {/* Decorative elements for tiki style */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-white opacity-20"></div>
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-black opacity-10"></div>
                          
                          {word}
                          
                          {assessmentResults?.wordLevelResults.find(w => w.word === word) && (
                            <div className="absolute -bottom-1 left-0 h-1 bg-white opacity-50" 
                              style={{ 
                                width: `${assessmentResults.wordLevelResults.find(w => w.word === word)?.accuracyScore || 0}%`
                              }}
                            />
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ 
                            scale: [1, 1.2, 0],
                            opacity: [1, 1, 0]
                          }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="px-4 py-2 rounded-lg text-lg font-medium bg-green-500 text-white relative"
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div 
                              animate={{
                                scale: [0, 1.5],
                                opacity: [1, 0]
                              }}
                              transition={{ duration: 0.5 }}
                              className="absolute rounded-full bg-green-300 w-full h-full"
                            />
                            <CheckCircle2 className="w-6 h-6 z-10" />
                          </div>
                          {word}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  );
                })}
              </div>
              
              <div className="flex justify-end mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 flex items-center text-xs bg-[#264653] text-white hover:bg-[#2a9d8f] hover:text-white border-none"
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
              <div className="border-2 border-[#f4a261] rounded-lg bg-[#fdf1d6] p-6 mt-4 relative overflow-hidden shadow-md">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#f4a261]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#e9c46a] rounded-tl-xl"></div>
                
                <h4 className="font-bold text-[#264653] mb-4 text-lg">Results:</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Pronunciation Score */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-[#e9c46a]">
                    <div className="text-[#264653] text-sm font-medium mb-1">Pronunciation</div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-4 flex rounded-full bg-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${assessmentResults.pronunciationScore}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`
                            flex flex-col justify-center rounded-full text-center text-white text-xs
                            ${assessmentResults.pronunciationScore >= 80 ? 'bg-green-500' : 
                              assessmentResults.pronunciationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                          `}
                        >
                          <span className="px-2 font-bold">{assessmentResults.pronunciationScore.toFixed(0)}%</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fluency Score */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-[#e9c46a]">
                    <div className="text-[#264653] text-sm font-medium mb-1">Fluency</div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-4 flex rounded-full bg-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${assessmentResults.fluencyScore}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          className={`
                            flex flex-col justify-center rounded-full text-center text-white text-xs
                            ${assessmentResults.fluencyScore >= 80 ? 'bg-green-500' : 
                              assessmentResults.fluencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                          `}
                        >
                          <span className="px-2 font-bold">{assessmentResults.fluencyScore.toFixed(0)}%</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Completeness Score */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-[#e9c46a]">
                    <div className="text-[#264653] text-sm font-medium mb-1">Completeness</div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-4 flex rounded-full bg-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${assessmentResults.completenessScore}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                          className={`
                            flex flex-col justify-center rounded-full text-center text-white text-xs
                            ${assessmentResults.completenessScore >= 80 ? 'bg-green-500' : 
                              assessmentResults.completenessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                          `}
                        >
                          <span className="px-2 font-bold">{assessmentResults.completenessScore.toFixed(0)}%</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Accuracy Score */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-[#e9c46a]">
                    <div className="text-[#264653] text-sm font-medium mb-1">Accuracy</div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-4 flex rounded-full bg-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${assessmentResults.accuracyScore}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                          className={`
                            flex flex-col justify-center rounded-full text-center text-white text-xs
                            ${assessmentResults.accuracyScore >= 80 ? 'bg-green-500' : 
                              assessmentResults.accuracyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                          `}
                        >
                          <span className="px-2 font-bold">{assessmentResults.accuracyScore.toFixed(0)}%</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Low score feedback section */}
                {assessmentResults.pronunciationScore < 75 && lowScoreAudio && (
                  <div className="mb-4 p-4 bg-white rounded-lg border border-amber-200">
                    <h5 className="font-medium text-[#264653] mb-2">Listen to Your Recording</h5>
                    <p className="text-sm text-[#264653] mb-3">
                      Your score is below 75%. Listen to your recording and decide if you'd like to try again or continue.
                    </p>
                    
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const audio = new Audio(lowScoreAudio);
                          audio.play();
                        }}
                        className="bg-white border-[#2a9d8f] text-[#2a9d8f] hover:bg-[#2a9d8f] hover:text-white"
                      >
                        <VolumeIcon className="mr-2 h-4 w-4" />
                        Play Recording
                      </Button>
                      
                      <div className="flex gap-2 flex-1">
                        <Button
                          variant="outline"
                          onClick={handleRetry}
                          className="flex-1 bg-white border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          Try Again
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={handleAccept}
                          className="flex-1 bg-white border-[#264653] text-[#264653] hover:bg-[#264653] hover:text-white"
                        >
                          Continue Anyway
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Only show continue button for scores above 75% or if it's not in retry mode */}
                {(assessmentResults.pronunciationScore >= 75 || !lowScoreAudio) && (
                  <Button
                    className="w-full bg-[#2a9d8f] hover:bg-[#264653] text-white"
                    onClick={() => onComplete(assessmentResults)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}