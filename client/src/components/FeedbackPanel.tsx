import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Volume2, Share2, Mic, StopCircle, Star, Turtle } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';

const FeedbackPanel = () => {
  const { pronunciationResults } = useReading();
  const { toast } = useToast();
  const [generalFeedback, setGeneralFeedback] = useState(
    "Good progress! Continue practicing to improve fluency." // Initial general feedback
  );
  const [pronunciationIssues, setPronunciationIssues] = useState<PronunciationIssue[]>([
    // Initial sample data, will be overwritten by useEffect
    { word: "container", phonetic: "kun-tey-ner", score: 60 },
    { word: "advantage", phonetic: "uhd-van-tij", score: 75 }
  ]);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Removed suggestedExercises state as per request.

  // Update feedback when pronunciation results change
  useEffect(() => {
    if (pronunciationResults) {
      // Extract word-level issues
      const issues: PronunciationIssue[] = 
        pronunciationResults.wordLevelResults
          .filter(result => result.accuracyScore < 80) // Filter for words with accuracy less than 80%
          .map(result => ({
            word: result.word,
            phonetic: result.word.split('').join('-'), // Simplified phonetic representation
            score: result.accuracyScore
          }))
          .slice(0, 5); // Limit to 5 issues

      setPronunciationIssues(issues);

      // Generate enhanced general feedback based on results
      const overallPronunciationScore = pronunciationResults.pronunciationScore;
      const fluencyScore = pronunciationResults.fluencyScore;
      const prosodyScore = pronunciationResults.prosodyScore; // Can be null/undefined

      if (overallPronunciationScore >= 90 && fluencyScore >= 90 && (prosodyScore === undefined || prosodyScore >= 90)) {
        setGeneralFeedback("Excellent job! Your reading was clear, fluent, and natural. Keep up the great work!");
      } else if (overallPronunciationScore >= 80 && fluencyScore >= 80) {
        setGeneralFeedback("Well done! Your pronunciation is solid, and you're reading fluently. Focus on subtle improvements in intonation.");
      } else if (overallPronunciationScore < 70 && issues.length > 0) {
        setGeneralFeedback("Focus on individual word sounds and clear articulation, especially for words you're struggling with.");
      } else if (fluencyScore < 75) {
        setGeneralFeedback("Try to maintain a consistent pace while reading. Avoid stopping frequently between words to improve fluency.");
      } else if (prosodyScore !== undefined && prosodyScore < 75) {
        setGeneralFeedback("Work on natural speech patterns, intonation, and rhythm to make your reading sound more expressive.");
      } else if (overallPronunciationScore < 75) {
        setGeneralFeedback("Pay attention to word endings and pronouncing each syllable clearly. Small adjustments can make a big difference.");
      } else {
        setGeneralFeedback("Good progress! Continue practicing regularly to build your confidence and refine your speech.");
      }

      // Removed suggested exercises logic as per request.
    }
  }, [pronunciationResults]); // Dependency on pronunciationResults ensures feedback updates.

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
            {generalFeedback.includes("Focus on individual word sounds")
              ? "We've identified specific words that could use more attention. Practice them slowly and deliberately."
              : generalFeedback.includes("Try to maintain a consistent pace") 
                ? "Smooth reading involves a steady flow. Try to connect your words without pausing too much."
                : generalFeedback.includes("Work on natural speech patterns")
                  ? "Varying your tone and rhythm makes speech more engaging. Listen to native speakers and try to mimic their expression."
                  : generalFeedback.includes("Pay attention to word endings")
                    ? "Many words lose clarity when their endings are rushed. Focus on fully articulating each part of the word."
                    : "Fantastic work! Regular practice builds confidence and mastery. Keep up the momentum!"}
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

                  <div className="flex items-center justify-center gap-3">
                    <Button 
                      onClick={() => playWordPronunciation(currentlyPracticing)}
                      size="sm"
                      variant="outline"
                      className="h-10 px-4 bg-green-700 hover:bg-green-600 text-white border-green-700"
                    >
                      Listen
                    </Button>

                    <div className="flex items-center gap-2">
                      <Turtle className="w-4 h-4" />
                      <Switch
                        checked={isSlowMode}
                        onCheckedChange={setIsSlowMode}
                        className="h-10 w-12"
                      />
                    </div>

                    {!isRecording ? (
                      <Button 
                        onClick={() => startWordPractice(currentlyPracticing)}
                        size="sm"
                        disabled={isProcessingWord}
                        className="h-10 px-4"
                      >
                        <Mic className="w-4 h-4 mr-1" />
                        Record
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopWordPractice}
                        size="sm"
                        variant="destructive"
                        className="h-10 px-4"
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
                  {/* Star Rating Display */}
                  <div className="text-center mb-4">
                    <div className="flex justify-center items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const scoreThreshold = star * 20;
                        const isFilled = wordAssessmentResult.pronunciationScore >= scoreThreshold;
                        return (
                          <Star
                            key={star}
                            className={`w-6 h-6 mx-1 ${
                              isFilled 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {Math.round(wordAssessmentResult.pronunciationScore)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
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
            // Enhanced display for word pronunciation issues
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {/* Stacks on small screens, 2 columns on medium/large */}
              {pronunciationIssues.map((issue, index) => (
                <div key={index} className="flex flex-col bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  {/* Word and Score on separate rows */}
                  <div className="mb-2">
                    <p className="font-medium text-base mb-1">{issue.word}</p>
                    <div className="inline-block text-xs py-0.5 px-2 bg-secondary/30 rounded-full font-semibold">
                      {issue.score}%
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full ${
                        issue.score < 60 ? 'bg-red-500' : issue.score < 80 ? 'bg-accent' : 'bg-green-500'
                      }`} 
                      style={{ width: `${issue.score}%` }}
                    />
                  </div>
                  <div className="flex flex-col space-y-2"> {/* Buttons stack vertically */}
                    <Button 
                      onClick={() => playWordPronunciation(issue.word)}
                      size="sm"
                      variant="outline"
                      className="w-full h-10 flex justify-center items-center" // Ensure fixed size and centering
                    >
                      <Volume2 className="w-5 h-5" /> {/* Adjusted icon size */}
                    </Button>
                    <Button 
                      onClick={() => startWordPractice(issue.word)}
                      size="sm"
                      variant="default"
                      className="w-full h-10 flex justify-center items-center" // Ensure fixed size and centering
                    >
                      <Mic className="w-5 h-5" /> {/* Adjusted icon size */}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Removed Suggested Exercises section as per request. */}
      </CardContent>
    </Card>
  );
};

export default FeedbackPanel;