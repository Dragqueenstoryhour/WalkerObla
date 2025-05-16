import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, Share2, Mic, StopCircle } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';

const FeedbackPanel = () => {
  const { pronunciationResults } = useReading();
  const { toast } = useToast();
  const [generalFeedback, setGeneralFeedback] = useState(
    "Focus on word endings"
  );
  const [pronunciationIssues, setPronunciationIssues] = useState<PronunciationIssue[]>([
    { word: "container", phonetic: "kun-tey-ner", score: 60 },
    { word: "advantage", phonetic: "uhd-van-tij", score: 75 }
  ]);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  
  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [suggestedExercises, setSuggestedExercises] = useState<SuggestedExercise[]>([
    {
      title: "Word Ending Practice",
      description: "Focus on completing word endings clearly",
      type: "pronunciation"
    },
    {
      title: "Rhythm Builder",
      description: "Improve your reading pace and fluency",
      type: "rhythm"
    }
  ]);

  // Update feedback when pronunciation results change
  useEffect(() => {
    if (pronunciationResults) {
      // Extract word-level issues
      const issues: PronunciationIssue[] = 
        pronunciationResults.wordLevelResults
          .filter(result => result.accuracyScore < 80)
          .map(result => ({
            word: result.word,
            phonetic: result.word.split('').join('-'), // Simplified phonetic representation
            score: result.accuracyScore
          }))
          .slice(0, 5); // Limit to 5 issues
      
      setPronunciationIssues(issues);
      
      // Generate feedback based on results - including prosody assessment if available
      if (pronunciationResults.fluencyScore < 70) {
        setGeneralFeedback("Focus on maintaining a steady reading rhythm");
      } else if (pronunciationResults.prosodyScore && pronunciationResults.prosodyScore < 70) {
        setGeneralFeedback("Focus on natural speech patterns, intonation, and rhythm");
      } else if (pronunciationResults.pronunciationScore < 70) {
        setGeneralFeedback("Focus on word endings and pronouncing each syllable");
      } else {
        setGeneralFeedback("Good progress! Continue practicing to improve fluency");
      }
      
      // Generate suggested exercises
      const exercises: SuggestedExercise[] = [];
      
      if (pronunciationResults.pronunciationScore < 75) {
        exercises.push({
          title: "Word Ending Practice",
          description: "Focus on completing word endings clearly",
          type: "pronunciation"
        });
      }
      
      if (pronunciationResults.fluencyScore < 75) {
        exercises.push({
          title: "Rhythm Builder",
          description: "Improve your reading pace and fluency",
          type: "rhythm"
        });
      }
      
      // Add prosody exercise if prosody score is low
      if (pronunciationResults.prosodyScore && pronunciationResults.prosodyScore < 75) {
        exercises.push({
          title: "Intonation Practice",
          description: "Work on natural speech patterns and expression",
          type: "rhythm"
        });
      }
      
      if (exercises.length < 2) {
        exercises.push({
          title: "Advanced Vocabulary",
          description: "Practice with more complex words",
          type: "pronunciation"
        });
      }
      
      setSuggestedExercises(exercises);
    }
  }, [pronunciationResults]);

  // Play word pronunciation
  const playWordPronunciation = async (word: string) => {
    try {
      // Show loading toast
      toast({
        title: "Loading Pronunciation",
        description: "Preparing audio playback...",
      });
      
      // Fetch TTS audio directly from the API
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: word }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }
      
      // Get audio blob from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play the audio element
      const audio = new Audio(audioUrl);
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Playback Error",
          description: "Could not play the audio. Please try again.",
          variant: "destructive",
        });
      };
      
      // Play the audio and handle success
      await audio.play();
      
      // Show success toast
      toast({
        title: "Playing Pronunciation",
        description: `Pronouncing: "${word}"`,
      });
    } catch (error) {
      console.error("Error playing pronunciation:", error);
      toast({
        title: "Error",
        description: "Could not play pronunciation. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Start recording word pronunciation practice
  const startWordPractice = async (word: string) => {
    try {
      setCurrentlyPracticing(word);
      setWordAssessmentResult(null);
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
      
      // Handle recording complete
      mediaRecorder.onstop = async () => {
        // Clean up the stream properly
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => track.stop());
          streamRef.current = null;
        }
        
        try {
          // Create audio blob
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          // Process with Azure
          await processWordRecording(audioBlob, word);
        } catch (error) {
          console.error('Error processing word recording:', error);
          toast({
            title: 'Recording Error',
            description: 'Could not process the recording. Please try again.',
            variant: 'destructive'
          });
          setIsRecording(false);
          setIsProcessingWord(false);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      toast({
        title: 'Recording Started',
        description: `Say the word "${word}" clearly`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access the microphone. Please check permissions.',
        variant: 'destructive'
      });
      setCurrentlyPracticing(null);
    }
  };
  
  // Stop recording
  const stopWordPractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  };
  
  // Process word recording with Azure
  const processWordRecording = async (audioBlob: Blob, word: string) => {
    setIsProcessingWord(true);
    
    try {
      toast({
        title: 'Processing Recording',
        description: 'Analyzing your pronunciation...'
      });
      
      // Send to Azure Speech for assessment
      const results = await submitReadingRecording(audioBlob, Date.now(), word);
      
      if (!results) {
        throw new Error('No results received from speech assessment');
      }
      
      // Update with results
      setWordAssessmentResult(results);
      
      toast({
        title: 'Analysis Complete',
        description: `Pronunciation: ${results.pronunciationScore.toFixed(1)}%`
      });
      
    } catch (error) {
      console.error('Error assessing word pronunciation:', error);
      toast({
        title: 'Assessment Error',
        description: 'Could not analyze your speech. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingWord(false);
    }
  };
  
  // Cancel word practice
  const cancelWordPractice = () => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    setCurrentlyPracticing(null);
    setIsRecording(false);
    setIsProcessingWord(false);
    setWordAssessmentResult(null);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Share progress
  const shareProgress = () => {
    toast({
      title: "Share Progress",
      description: "Progress sharing functionality coming soon!",
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Feedback & Assistance</h2>
          <Button onClick={shareProgress} variant="outline" size="sm" className="text-sm">
            <Share2 className="w-4 h-4 mr-1" />
            Share Progress
          </Button>
        </div>
        
        <div className="border-l-4 border-accent pl-4 mb-4">
          <p className="text-lg font-medium mb-1">{generalFeedback}</p>
          <p className="text-textColor text-sm">
            {generalFeedback === "Focus on word endings"
              ? "I noticed you tend to skip the endings of some words. Try to fully pronounce each syllable, especially the last one."
              : generalFeedback === "Focus on maintaining a steady reading rhythm" 
                ? "Try to maintain a consistent pace while reading. Avoid stopping frequently between words."
                : "Your pronunciation is improving! Continue practicing regularly to build your confidence."}
          </p>
        </div>
        
        {/* Pronunciation Help - Horizontal layout for better space usage */}
        <div className="bg-secondary bg-opacity-30 rounded-lg p-3 mb-4">
          <h3 className="font-medium mb-2 text-sm">Word Pronunciation Help</h3>
          
          {currentlyPracticing ? (
            <div className="p-4 bg-white rounded-lg shadow-sm mb-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Practicing: <span className="text-primary">{currentlyPracticing}</span></h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelWordPractice}
                >
                  Close
                </Button>
              </div>
              
              {!wordAssessmentResult ? (
                <div className="flex flex-col items-center">
                  <div className="mb-4 text-center">
                    <p className="text-sm mb-2">
                      {isRecording 
                        ? "Say the word clearly..." 
                        : "Click the button to start recording"}
                    </p>
                    
                    {isRecording && (
                      <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full">
                        <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                        <span className="text-xs font-medium">Recording in Progress</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => playWordPronunciation(currentlyPracticing)}
                      size="sm"
                      variant="outline"
                    >
                      <Volume2 className="w-4 h-4 mr-1" />
                      Listen
                    </Button>
                    
                    {!isRecording ? (
                      <Button 
                        onClick={() => startWordPractice(currentlyPracticing)}
                        size="sm"
                        disabled={isProcessingWord}
                      >
                        <Mic className="w-4 h-4 mr-1" />
                        Record
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopWordPractice}
                        size="sm"
                        variant="destructive"
                      >
                        <StopCircle className="w-4 h-4 mr-1" />
                        Stop
                      </Button>
                    )}
                  </div>
                  
                  {isProcessingWord && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold" style={{ 
                      color: wordAssessmentResult.pronunciationScore >= 80 ? '#10b981' : 
                             wordAssessmentResult.pronunciationScore >= 60 ? '#f59e0b' : '#ef4444' 
                    }}>
                      {Math.round(wordAssessmentResult.pronunciationScore)}%
                    </div>
                    <p className="text-sm mt-1">
                      {wordAssessmentResult.pronunciationScore >= 80 
                        ? "Excellent pronunciation!" 
                        : wordAssessmentResult.pronunciationScore >= 60 
                          ? "Good effort, keep practicing." 
                          : "Try again focusing on each sound."}
                    </p>
                  </div>
                  
                  <div className="flex justify-center space-x-2">
                    <Button 
                      onClick={() => startWordPractice(currentlyPracticing)}
                      size="sm"
                    >
                      <Mic className="w-4 h-4 mr-1" />
                      Try Again
                    </Button>
                    <Button 
                      onClick={cancelWordPractice}
                      size="sm" 
                      variant="outline"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pronunciationIssues.map((issue, index) => (
                <div key={index} className="flex items-start bg-white rounded-lg p-2 shadow-sm">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-sm">{issue.word}</p>
                      <div className="text-xs py-0.5 px-1.5 bg-secondary/30 rounded">
                        {issue.score}%
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 mb-2">
                      <div className="h-1 bg-secondary rounded-full overflow-hidden flex-1">
                        <div 
                          className={`h-full ${
                            issue.score < 60 ? 'bg-red-500' : issue.score < 80 ? 'bg-accent' : 'bg-success'
                          }`} 
                          style={{ width: `${issue.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        onClick={() => playWordPronunciation(issue.word)}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs py-0"
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        Listen
                      </Button>
                      <Button 
                        onClick={() => startWordPractice(issue.word)}
                        size="sm"
                        variant="default"
                        className="flex-1 h-8 text-xs py-0"
                      >
                        <Mic className="w-3 h-3 mr-1" />
                        Practice
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Suggested Exercises - Compact horizontal layout */}
        <div>
          <h3 className="font-medium mb-2 text-sm">Suggested Exercises</h3>
          <div className="grid grid-cols-2 gap-2">
            {suggestedExercises.map((exercise, index) => (
              <button 
                key={index}
                className="bg-white border border-secondary rounded-lg p-2 text-left hover:border-primary transition-colors flex items-start"
              >
                <div className="flex-shrink-0 bg-primary bg-opacity-10 p-1 rounded-full mr-2">
                  {exercise.type === 'pronunciation' ? (
                    <Mic className="w-4 h-4 text-primary" />
                  ) : (
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{exercise.title}</p>
                  <p className="text-xs text-textColor">{exercise.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackPanel;
