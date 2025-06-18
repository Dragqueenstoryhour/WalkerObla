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

// Helper function to get syllable color based on accuracy score
const getSyllableColor = (accuracyScore: number): string => {
  const threshold = 70; // Define accuracy threshold
  if (accuracyScore >= threshold) {
    return '#2a9d8f'; // Green for correct pronunciation
  } else {
    return '#e76f51'; // Red for incorrect pronunciation
  }
};

// Helper function to map syllables from assessment results to syllabication display
const mapSyllablesToDisplay = (syllabication: string, syllables: any[]): Array<{text: string, color: string}> => {
  if (!syllables || syllables.length === 0) {
    // No syllable data available, return default styling
    return syllabication.split('-').map(syllable => ({
      text: syllable,
      color: '#ffffff' // Default white color
    }));
  }
  
  const displaySyllables = syllabication.split('-');
  const resultSyllables = displaySyllables.map((displaySyllable, index) => {
    // Try to match with assessment syllables
    const matchingSyllable = syllables.find(s => 
      s.syllable && s.grapheme &&
      (s.syllable.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      s.grapheme.toLowerCase().includes(displaySyllable.toLowerCase()))
    );
    
    if (matchingSyllable) {
      return {
        text: displaySyllable,
        color: getSyllableColor(matchingSyllable.accuracyScore)
      };
    } else {
      return {
        text: displaySyllable,
        color: '#ffffff' // Default white if no match found
      };
    }
  });
  
  return resultSyllables;
};

const FeedbackPanel = () => {
  const { pronunciationResults } = useReading();
  const { toast } = useToast();
  const [generalFeedback, setGeneralFeedback] = useState(
    "Good progress! Continue practicing to improve fluency." // Initial general feedback
  );
  const [pronunciationIssues, setPronunciationIssues] = useState<PronunciationIssue[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  
  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});

  // Direct MediaRecorder implementation - matching ConsolidatedReadingPractice exactly
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        const filteredResults = pronunciationResults.wordLevelResults
          .filter(result => result.accuracyScore < 75) // Filter for words with accuracy less than 75%
          .slice(0, 6); // Limit to maximum 6 words

        // Get phonetic displays for all words
        const phoneticPromises = filteredResults.map(result => getPhoneticDisplay(result.word));
        const phoneticDisplays = await Promise.all(phoneticPromises);

        // Get proper syllabication using the same OpenAI logic as Words page
        const wordsToSyllabicate = filteredResults.map(result => result.word);
        let syllabicationData: { word: string; syllabication: string }[] = [];
        
        try {
          const response = await fetch('/api/pronunciation/syllabication', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words: wordsToSyllabicate }),
          });
          
          if (response.ok) {
            const data = await response.json();
            syllabicationData = data.results;
          }
        } catch (error) {
          console.error('Error fetching syllabication:', error);
        }

        const issues: PronunciationIssue[] = filteredResults.map((result, index) => {
          const phoneticDisplay = phoneticDisplays[index];
          const syllabicationInfo = syllabicationData.find(s => s.word === result.word);
          const syllabication = syllabicationInfo?.syllabication || result.word.toLowerCase();
          
          return {
            word: result.word,
            phonetic: phoneticDisplay,
            syllabication,
            score: result.accuracyScore,
            id: `issue-${Date.now()}-${index}`,
            status: "idle" as const
          };
        });

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

  // Start recording for an individual word practice - matching ConsolidatedReadingPractice exactly
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= pronunciationIssues.length) return;

    try {
      const issue = pronunciationIssues[wordIndex];
      setCurrentlyPracticing(issue.id);
      setCurrentWordIndex(wordIndex);
      setWordAssessmentResult(null);

      // Update the issue status to recording
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
        ),
      );

      // Clear any previous recording chunks
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks();
          tracks.forEach(track => track.stop());
          streamRef.current = null;
        }

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processWordRecording(audioBlob, wordIndex);
        } catch (error) {
          console.error('Error processing word recording:', error);
          setIsRecording(false);
          setIsProcessingRecording(false);
          setPronunciationIssues((issues) =>
            issues.map((w, idx) =>
              idx === wordIndex ? { ...w, status: "idle" } : w,
            ),
          );
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

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

  // Stop recording the word - matching ConsolidatedReadingPractice exactly
  const stopWordPractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Process word recording with Azure - matching Words.tsx exactly
  const processWordRecording = async (audioBlob: Blob, wordIndex: number) => {
    setIsProcessingRecording(true);

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
        throw new Error("Failed to assess pronunciation");
      }

      const result = await response.json();
      console.log("Received assessment results:", result);

      // Validate the result has expected properties
      if (typeof result.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      // Update with results
      setWordAssessmentResult(result);

      // Update in the issues array
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                assessmentResult: result,
                recordingBlob: audioBlob,
                recordingUrl,
              }
            : w,
        ),
      );

    } catch (error) {
      console.error("Error assessing word pronunciation:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });

      // Reset status to idle
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Cancel word practice - matching ConsolidatedReadingPractice exactly
  const cancelWordPractice = (wordIndex: number) => {
    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setCurrentlyPracticing(null);

    // Reset issue status
    setPronunciationIssues((issues) =>
      issues.map((w, idx) =>
        idx === wordIndex ? { ...w, status: "idle" } : w,
      ),
    );

    toast({
      title: "Practice Cancelled",
      description: "Recording stopped",
    });
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

      setSavedWords(prev => new Set(Array.from(prev).concat(word)));
    } catch (error) {
      console.error("Error saving word:", error);
    }
  };

  // Generate suggested exercises based on pronunciation issues
  const generateSuggestedExercises = (): SuggestedExercise[] => {
    if (!pronunciationResults) return [];

    return pronunciationIssues.slice(0, 3).map((issue, index) => ({
      id: `exercise-${index}`,
      title: `Practice "${issue.word}"`,
      type: 'word_practice' as const,
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
      {/* General Feedback Card - Hidden as requested 
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
      */}

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
                          {issue.syllabication && (
                            <div className="text-lg italic mt-2">
                              {issue.status === "complete" && issue.assessmentResult?.wordLevelResults?.[0] && 
                               (issue.assessmentResult.wordLevelResults[0] as any).syllables ? (
                                // Show color-coded syllables based on assessment results
                                mapSyllablesToDisplay(issue.syllabication, (issue.assessmentResult.wordLevelResults[0] as any).syllables).map((syllable, index) => (
                                  <span
                                    key={index}
                                    style={{ color: syllable.color }}
                                    className="font-semibold"
                                  >
                                    {syllable.text}
                                    {index < mapSyllablesToDisplay(issue.syllabication || '', (issue.assessmentResult?.wordLevelResults?.[0] as any)?.syllables || []).length - 1 && '-'}
                                  </span>
                                ))
                              ) : (
                                // Default display when no assessment data is available
                                <span className="text-white/80">{issue.syllabication}</span>
                              )}
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Recording Controls */}
                          <div className="flex justify-center gap-2">
                            {issue.status === "idle" && (
                              <Button
                                onClick={() => startWordPractice(index)}
                                className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                                disabled={isRecording || isProcessingRecording}
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
                              <div className="space-y-4">
                                {/* Score Display */}
                                {issue.assessmentResult && (
                                  <div className="flex justify-center">
                                    <div className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md">
                                      <Check className="h-4 w-4 mr-2" />
                                      Score: {Math.round(issue.assessmentResult.pronunciationScore)}%
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="flex justify-center gap-2">
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
                                  
                                  {issue.recordingUrl && (
                                    <Button
                                      onClick={() => {
                                        const audio = new Audio(issue.recordingUrl);
                                        audio.play().catch(error => {
                                          console.error('Error playing recording:', error);
                                          toast({
                                            title: "Playback Error",
                                            description: "Could not play your recording. Please try again.",
                                            variant: "destructive",
                                          });
                                        });
                                      }}
                                      className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0"
                                    >
                                      <Volume2 className="h-5 w-5" />
                                      Listen to Me
                                    </Button>
                                  )}
                                </div>
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