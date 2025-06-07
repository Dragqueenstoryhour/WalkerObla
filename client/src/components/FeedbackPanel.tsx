import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Volume2, Share2, BookmarkIcon, Snail, Check } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';

// Helper function to get phonetic display from API
async function getPhoneticDisplay(word: string): Promise<string> {
  try {
    const response = await fetch(`/api/pronunciation/word?word=${encodeURIComponent(word)}`);
    if (!response.ok) {
      throw new Error('Failed to get pronunciation');
    }
    const data = await response.json();
    return data.phonetic;
  } catch (error) {
    console.error('Error getting phonetic display:', error);
    // Fallback to simple display
    return word.toUpperCase();
  }
}

const FeedbackPanel = () => {
  const { pronunciationResults } = useReading();
  const { toast } = useToast();
  const [generalFeedback, setGeneralFeedback] = useState(
    "Good progress! Continue practicing to improve fluency." // Initial general feedback
  );
  const [pronunciationIssues, setPronunciationIssues] = useState<PronunciationIssue[]>([]);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Update feedback when pronunciation results change
  useEffect(() => {
    if (pronunciationResults) {
      // Extract word-level issues for words scoring under 75%
      const processIssues = async () => {
        const issues: PronunciationIssue[] = await Promise.all(
          pronunciationResults.wordLevelResults
            .filter(result => result.accuracyScore < 75) // Filter for words with accuracy less than 75%
            .slice(0, 6) // Limit to maximum 6 words
            .map(async result => ({
              word: result.word,
              phonetic: await getPhoneticDisplay(result.word), // Get proper syllable breakdown
              score: result.accuracyScore
            }))
        );
        setPronunciationIssues(issues);
      };

      processIssues();
    } else {
      setPronunciationIssues([]);
    }

    // Generate enhanced general feedback based on results
    if (pronunciationResults) {
      const overallPronunciationScore = pronunciationResults.pronunciationScore;
      const fluencyScore = pronunciationResults.fluencyScore;
      const prosodyScore = pronunciationResults.prosodyScore; // Can be null/undefined
      const problemWordCount = pronunciationResults.wordLevelResults.filter(result => result.accuracyScore < 75).length;

      if (overallPronunciationScore >= 90 && fluencyScore >= 90 && (prosodyScore === undefined || prosodyScore >= 90)) {
        setGeneralFeedback("Excellent job! Your reading was clear, fluent, and natural. Keep up the great work!");
      } else if (overallPronunciationScore >= 80 && fluencyScore >= 80) {
        setGeneralFeedback("Well done! Your pronunciation is solid, and you're reading fluently. Focus on subtle improvements in intonation.");
      } else if (overallPronunciationScore < 70 && problemWordCount > 0) {
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

      // Send to Azure Speech for assessment using the same pattern as the main reader
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", word);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const results = await response.json();

      if (!results || typeof results.pronunciationScore !== "number") {
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

  // Save words to My Words page
  const saveWordsToMyWords = async () => {
    try {
      // Check if user is authenticated
      const userResponse = await fetch("/api/auth/user");
      if (!userResponse.ok) {
        toast({
          title: "Sign In Required",
          description: "Please sign in to save words to your collection.",
          variant: "destructive"
        });
        return;
      }

      // Save all 6 words to /my-words
      const wordsToSave = pronunciationIssues.slice(0, 6);
      const savePromises = wordsToSave.map(async (issue) => {
        const response = await fetch("/api/phrases/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phrase: issue.word,
            phonetic: issue.phonetic || null,
            difficulty: "intermediate",
            source: "reader_feedback",
            sourceId: null,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save word: ${issue.word}`);
        }

        return response.json();
      });

      await Promise.all(savePromises);

      toast({
        title: "Words Saved",
        description: `Successfully saved ${wordsToSave.length} words to My Words.`,
      });
    } catch (error) {
      console.error('Error saving words:', error);
      toast({
        title: 'Save Error',
        description: 'Could not save words. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Feedback & Assistance</h2>

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

        {/* Word Pronunciation Help - Only show when there are problem words */}
        {pronunciationIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-4 text-lg">Word Pronunciation Help</h3>
          
            {/* Problem words carousel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {pronunciationIssues.map((issue, index) => (
                <Card 
                  key={`${issue.word}-${index}`} 
                  className={`cursor-pointer transition-all duration-200 border-2 ${
                    currentlyPracticing === issue.word 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                  }`}
                  onClick={() => setCurrentlyPracticing(issue.word)}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold mb-2">{issue.word}</h4>
                      
                      {/* Score display */}
                      <div className="mb-3">
                        <div className="text-xl font-bold" style={{ 
                          color: issue.score >= 80 ? '#10b981' : issue.score >= 60 ? '#f59e0b' : '#ef4444' 
                        }}>
                          {Math.round(issue.score)}%
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            playWordPronunciation(issue.word);
                          }}
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          Hear
                        </Button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSlowMode(!isSlowMode);
                          }}
                          className={`relative inline-flex h-8 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isSlowMode ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                          }`}
                          role="switch"
                          aria-checked={isSlowMode}
                          aria-label="Toggle slow playback"
                        >
                          <span
                            className={`inline-flex h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                              isSlowMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          >
                            <Snail className="w-2 h-2 text-gray-600" />
                          </span>
                        </button>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-center">
                        <Button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await fetch('/api/saved-words', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ word: issue.word })
                              });
                              
                              if (response.ok) {
                                setSavedWords(prev => {
                                  const newSet = new Set(prev);
                                  newSet.add(issue.word);
                                  return newSet;
                                });
                              } else {
                                throw new Error('Failed to save word');
                              }
                            } catch (error) {
                              console.error('Error saving word:', error);
                            }
                          }}
                          size="sm"
                          variant={savedWords.has(issue.word) ? "default" : "outline"}
                          className={`h-8 px-3 ${savedWords.has(issue.word) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#FFBD12] hover:bg-[#E6A800] text-white border-0'}`}
                          disabled={savedWords.has(issue.word)}
                        >
                          {savedWords.has(issue.word) ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Saved
                            </>
                          ) : (
                            <>
                              <BookmarkIcon className="w-3 h-3 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Save Words Button */}
            {pronunciationIssues.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={saveWordsToMyWords}
                  size="sm"
                  className="h-10 px-6 bg-[#FFBD12] hover:bg-[#E6A800] text-white border-0"
                >
                  <BookmarkIcon className="w-4 h-4 mr-2" />
                  Save All Words
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackPanel;