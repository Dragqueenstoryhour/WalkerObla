import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Volume2, Share2, BookmarkIcon, Snail, Check, MicIcon, StopCircleIcon, RotateCw, VolumeIcon, Ear, ChevronLeft, ChevronRight, Gauge, Star } from 'lucide-react';
import { AudioPlaybackButton } from '@/components/AudioPlaybackButton';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
import useAudioRecording from '@/hooks/useAudioRecording';
import useEmblaCarousel from 'embla-carousel-react';

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
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  
  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});

  // Use audio recording hook for consistent recording management
  const {
    isRecording,
    recordingDuration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecording({
    onRecordingComplete: (blob) => {
      if (currentlyPracticing) {
        handleWordAssessment(blob, currentlyPracticing);
      }
    },
    onError: (error) => {
      console.error("Recording error:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
    },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carousel navigation functions
  const goToPrevious = () => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  };

  const goToNext = () => {
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  };

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      };
      emblaApi.on('select', onSelect);
      onSelect();
    }
  }, [emblaApi]);

  // Update feedback when pronunciation results change
  useEffect(() => {
    if (pronunciationResults) {
      // Extract word-level issues for words scoring under 75%
      const processIssues = async () => {
        const issues: PronunciationIssue[] = await Promise.all(
          pronunciationResults.wordLevelResults
            .filter(result => result.accuracyScore < 75) // Filter for words with accuracy less than 75%
            .slice(0, 6) // Limit to maximum 6 words
            .map(async (result, index) => ({
              word: result.word,
              phonetic: await getPhoneticDisplay(result.word), // Get proper syllable breakdown
              score: result.accuracyScore,
              id: `issue-${Date.now()}-${index}`,
              status: "idle" as const
            }))
        );
        setPronunciationIssues(issues);
        setCurrentCarouselIndex(0);
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
        setGeneralFeedback("Work on natural speech rhythm and intonation. Try varying your tone to make your reading more expressive.");
      } else {
        setGeneralFeedback("Great progress! Continue practicing with challenging texts to further enhance your speech clarity.");
      }
    }
  }, [pronunciationResults]);

  // Handle word assessment with audio recording
  const handleWordAssessment = async (audioBlob: Blob, word: string) => {
    setIsProcessingWord(true);

    try {
      // Find the word issue to update
      const wordIndex = pronunciationIssues.findIndex(issue => issue.word === word);
      if (wordIndex === -1) return;

      // Update status to assessing
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "assessing" } : w,
        ),
      );

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", word);
      formData.append("itemType", "word");
      formData.append("source", "feedback");

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      setWordAssessmentResult(result);

      // Update with results
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                score: result.pronunciationScore,
              }
            : w,
        ),
      );

      toast({
        title: "Assessment Complete",
        description: `Score: ${Math.round(result.pronunciationScore)}%`,
      });

    } catch (error) {
      console.error("Error assessing word pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      const wordIndex = pronunciationIssues.findIndex(issue => issue.word === word);
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    } finally {
      setIsProcessingWord(false);
      setCurrentlyPracticing(null);
    }
  };

  // Start recording for an individual word practice
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= pronunciationIssues.length) return;

    try {
      const issue = pronunciationIssues[wordIndex];
      setCurrentlyPracticing(issue.word);

      // Update the issue status to recording
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
        ),
      );

      // Start recording using the hook
      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording word: "${issue.word}"`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);

      // Reset issue status
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    }
  };

  // Stop recording the word
  const stopWordPractice = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Process word recording with Azure
  const processWordRecording = async (audioBlob: Blob, wordIndex: number) => {
    setIsProcessingWord(true);

    try {
      const issue = pronunciationIssues[wordIndex];

      // Validate word data
      if (!issue || !issue.word || issue.word.trim() === '') {
        console.error('Invalid word data:', issue);
        throw new Error('No word text available for assessment');
      }

      console.log('Processing word:', issue.word);

      // Update status to assessing
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "assessing" } : w,
        ),
      );

      // Create a URL for the recording
      const recordingUrl = URL.createObjectURL(audioBlob);

      // Send to Azure Speech for assessment
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("text", issue.word.trim());
      formData.append("itemType", "word");
      formData.append("source", "feedback_panel");

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Assessment API error:', errorData);
        throw new Error(`Assessment failed: ${response.status} ${response.statusText}`);
      }

      const assessmentResult = await response.json();
      console.log("Received assessment results:", assessmentResult);

      setWordAssessmentResult(assessmentResult);

      // Update the issue with results
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                assessmentResult,
                recordingUrl,
                recordingBlob: audioBlob,
              }
            : w,
        ),
      );

    } catch (error) {
      console.error("Error processing recording:", error);
      
      // Reset issue status on error
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );

    } finally {
      setIsProcessingWord(false);
      setCurrentlyPracticing(null);
    }
  };

  // Cancel word practice
  const cancelWordPractice = (wordIndex: number) => {
    cancelRecording();
    setCurrentlyPracticing(null);

    // Reset issue status
    setPronunciationIssues((issues) =>
      issues.map((w, idx) =>
        idx === wordIndex ? { ...w, status: "idle" } : w,
      ),
    );
  };

  // Handle text-to-speech for a word
  const handleTextToSpeech = async (wordIndex: number) => {
    const issue = pronunciationIssues[wordIndex];
    if (!issue?.word) {
      toast({
        title: "No Text",
        description: "No text available for this word.",
        variant: "destructive",
      });
      return;
    }

    const isSlowPlayback = slowPlaybackWords[issue.word] || false;
    const textToSpeak = issue.word;

    try {
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'default',
          speed: isSlowPlayback ? 0.6 : 1.0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (error) => {
        toast({
          title: "Playback Error",
          description: "Could not play the audio. Please try again.",
          variant: "destructive",
        });
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (error) {
      toast({
        title: "TTS Error",
        description: "Could not generate audio.",
        variant: "destructive",
      });
    }
  };

  // Toggle slow playback for a word
  const toggleSlowPlayback = (word: string) => {
    setSlowPlaybackWords(prev => ({
      ...prev,
      [word]: !prev[word]
    }));
  };

  // Save a word to user's collection
  const saveWordToCollection = async (word: string) => {
    if (savedWords.has(word)) {
      return;
    }

    try {
      const response = await fetch("/api/saved-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: word,
          difficulty: "intermediate",
          source: "feedback"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save word");
      }

      setSavedWords(prev => new Set([...prev, word]));
    } catch (error) {
      console.error("Error saving word:", error);
    }
  };

  // Generate suggested exercises based on pronunciation issues
  const generateSuggestedExercises = (): SuggestedExercise[] => {
    if (!pronunciationResults) return [];

    return pronunciationIssues.slice(0, 3).map((issue, index) => ({
      id: `exercise-${index}`,
      type: 'word_practice',
      word: issue.word,
      description: `Practice pronouncing "${issue.word}" clearly`,
      difficulty: issue.score < 50 ? 'hard' : issue.score < 75 ? 'medium' : 'easy'
    }));
  };

  const suggestedExercises = generateSuggestedExercises();

  if (!pronunciationResults) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Practice Feedback</CardTitle>
          <CardDescription>
            Complete a reading practice session to see detailed feedback and suggestions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Feedback Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium">{generalFeedback}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(pronunciationResults.pronunciationScore)}%
                </div>
                <div className="text-sm text-gray-600">Overall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(pronunciationResults.accuracyScore)}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(pronunciationResults.fluencyScore)}%
                </div>
                <div className="text-sm text-gray-600">Fluency</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(pronunciationResults.completenessScore)}%
                </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Words to Practice */}
      {pronunciationIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ear className="h-5 w-5" />
              Words to Practice ({pronunciationIssues.length})
            </CardTitle>
            <CardDescription>
              Focus on these words to improve your pronunciation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Carousel */}
              <div className="embla" ref={emblaRef}>
                <div className="embla__container flex">
                  {pronunciationIssues.map((issue, index) => (
                    <div key={issue.id} className="embla__slide flex-[0_0_100%] px-2">
                      <Card className="h-full shadow-lg border-0 card-content" style={{ backgroundColor: '#1947e5' }}>
                        <CardHeader className="text-center">
                          <CardTitle className="text-3xl font-bold text-white">{issue.word}</CardTitle>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Recording Controls */}
                          <div className="flex justify-center gap-2">
                            {issue.status === "idle" && (
                              <Button
                                onClick={() => startWordPractice(index)}
                                className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                                disabled={isRecording || isProcessingWord}
                              >
                                <MicIcon className="h-5 w-5" />
                                Practice This Word
                              </Button>
                            )}

                            {issue.status === "recording" && (
                              <Button
                                onClick={stopWordPractice}
                                variant="destructive"
                                className="flex items-center gap-2"
                              >
                                <StopCircleIcon className="h-4 w-4" />
                                Stop Recording
                              </Button>
                            )}

                            {issue.status === "assessing" && (
                              <Button disabled className="flex items-center gap-2">
                                <RotateCw className="h-4 w-4 animate-spin" />
                                Analyzing...
                              </Button>
                            )}

                            {issue.status === "complete" && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    setPronunciationIssues(issues =>
                                      issues.map((w, idx) =>
                                        idx === index ? { ...w, status: "idle" } : w
                                      )
                                    );
                                    setWordAssessmentResult(null);
                                  }}
                                  className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                                >
                                  <RotateCw className="h-5 w-5" />
                                  Try Again
                                </Button>
                                {wordAssessmentResult && (
                                  <div className="flex items-center px-3 py-2 bg-green-500 text-white rounded-md">
                                    <Check className="h-4 w-4 mr-2" />
                                    {Math.round(wordAssessmentResult.pronunciationScore)}%
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Hear and Slow Switch + Save */}
                          <div className="flex justify-center gap-2">
                            <Button
                              onClick={() => handleTextToSpeech(index)}
                              variant="outline"
                              className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                            >
                              <Ear className="h-4 w-4 mr-1" />
                              Hear
                            </Button>
                            <button
                              onClick={() => toggleSlowPlayback(issue.word)}
                              className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                slowPlaybackWords[issue.word] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                              }`}
                              role="switch"
                              aria-checked={slowPlaybackWords[issue.word]}
                              aria-label="Toggle slow playback"
                            >
                              <span
                                className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                                  slowPlaybackWords[issue.word] ? 'translate-x-8' : 'translate-x-1'
                                }`}
                              >
                                <Snail className="h-3 w-3 text-gray-600" />
                              </span>
                            </button>
                            <Button
                              onClick={() => saveWordToCollection(issue.word)}
                              variant="outline"
                              className="h-10 px-4 bg-[#6366F1] hover:bg-[#5855EB] text-white border-0"
                            >
                              <Star className={`h-4 w-4 mr-1 ${savedWords.has(issue.word) ? 'fill-white' : ''}`} />
                              Save
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation controls */}
              {pronunciationIssues.length > 1 && (
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={goToPrevious}
                    disabled={currentCarouselIndex === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <span className="flex items-center text-sm text-gray-500">
                    {currentCarouselIndex + 1} of {pronunciationIssues.length}
                  </span>
                  
                  <Button
                    onClick={goToNext}
                    disabled={currentCarouselIndex >= pronunciationIssues.length - 1}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeedbackPanel;