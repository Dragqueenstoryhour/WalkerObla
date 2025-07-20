import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ear, ChevronLeft, ChevronRight, Gauge, Star } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import useEmblaCarousel from 'embla-carousel-react';
import WordPracticeCard from '@/components/WordPracticeCard'; // Import the new component
import { mapSyllablesToDisplay } from '@/lib/utils'; // Import from utils
import { useQuery, useMutation } from '@tanstack/react-query';

// Constants for FeedbackPanel
const ACCURACY_THRESHOLD_FOR_ISSUE = 70;
const MAX_WORDS_TO_PRACTICE = 8;
const SLOW_PLAYBACK_SPEED = 0.6;
const NORMAL_PLAYBACK_SPEED = 1.0;

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
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carousel navigation functions
  const goToPrevious = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const goToNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

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

  // Query for phonetic displays
  const phoneticQuery = useQuery({
    queryKey: ['phoneticDisplays', pronunciationIssues.map(issue => issue.word)],
    queryFn: async () => {
      const phoneticPromises = pronunciationIssues.map(issue => getPhoneticDisplay(issue.word));
      return Promise.all(phoneticPromises);
    },
    enabled: pronunciationIssues.length > 0, // Only run if there are issues
  });

  // Query for syllabication
  const syllabicationQuery = useQuery({
    queryKey: ['syllabication', pronunciationIssues.map(issue => issue.word)],
    queryFn: async () => {
      const wordsToSyllabicate = pronunciationIssues.map(issue => issue.word);
      const response = await fetch('/api/pronunciation/syllabication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ words: wordsToSyllabicate }),
      });
      if (!response.ok) {
        throw new Error('Failed to get syllabication');
      }
      const data = await response.json();
      return data.results;
    },
    enabled: pronunciationIssues.length > 0, // Only run if there are issues
  });

  // Update feedback when pronunciation results change
  useEffect(() => {
    if (pronunciationResults) {
      const filteredResults = pronunciationResults.wordLevelResults
        .filter(result => result.accuracyScore < ACCURACY_THRESHOLD_FOR_ISSUE)
        .slice(0, MAX_WORDS_TO_PRACTICE);

      const issues: PronunciationIssue[] = filteredResults.map((result, index) => {
        const phoneticDisplay = phoneticQuery.data?.[index] || result.word.toUpperCase();
        const syllabicationInfo = syllabicationQuery.data?.find(s => s.word === result.word);
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

      // Generate enhanced general feedback based on results
      const overallPronunciationScore = pronunciationResults.pronunciationScore;
      const fluencyScore = pronunciationResults.fluencyScore;
      const prosodyScore = pronunciationResults.prosodyScore;
      const problemWordCount = pronunciationResults.wordLevelResults.filter(result => result.accuracyScore < ACCURACY_THRESHOLD_FOR_ISSUE).length;

      if (overallPronunciationScore >= 90 && fluencyScore >= 90 && (prosodyScore === undefined || prosodyScore >= 90)) {
        setGeneralFeedback("Excellent job! Your reading was clear, fluent, and natural. Keep up the great work!");
      } else if (overallPronunciationScore >= 80 && fluencyScore >= 80) {
        setGeneralFeedback("Well done! Your pronunciation is solid, and you're reading fluently. Focus on subtle improvements in intonation.");
      } else if (overallPronunciationScore < ACCURACY_THRESHOLD_FOR_ISSUE && problemWordCount > 0) {
        setGeneralFeedback("Focus on individual word sounds and clear articulation, especially for words you're struggling with.");
      } else if (fluencyScore < 75) {
        setGeneralFeedback("Try to maintain a consistent pace while reading. Avoid stopping frequently between words to improve fluency.");
      } else if (prosodyScore !== undefined && prosodyScore < 75) {
        setGeneralFeedback("Work on natural speech rhythm and intonation. Try varying your tone to make your reading more expressive.");
      } else {
        setGeneralFeedback("Great progress! Continue practicing with challenging texts to further enhance your speech clarity.");
      }
    } else {
      setPronunciationIssues([]);
    }
  }, [pronunciationResults, phoneticQuery.data, syllabicationQuery.data]);

  // Handle text-to-speech for a word
  const handleTextToSpeech = useCallback(async (word: string, speed: number) => {
    if (!word) {
      toast({
        title: "No Text",
        description: "No text available for this word.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: word,
          voice: 'default',
          speed: speed
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
  }, [toast]);

  // Toggle slow playback for a word
  const toggleSlowPlayback = useCallback((word: string) => {
    setSlowPlaybackWords(prev => ({
      ...prev,
      [word]: !prev[word]
    }));
  }, []);

  // Save a word to user's collection
  const saveWordToCollection = useCallback(async (word: string) => {
    if (savedWords.has(word)) {
      toast({
        title: "Word Already Saved",
        description: `"${word}" is already in your saved words.`,
        variant: "default",
      });
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
      toast({
        title: "Word Saved",
        description: `"${word}" has been added to your saved words.`,
      });
    } catch (error) {
      console.error("Error saving word:", error);
      toast({
        title: "Error Saving Word",
        description: "Could not save the word. Please try again.",
        variant: "destructive",
      });
    }
  }, [savedWords, toast]);

  // Generate suggested exercises based on pronunciation issues
  const generateSuggestedExercises = useCallback((): SuggestedExercise[] => {
    if (!pronunciationResults) return [];

    return pronunciationIssues.slice(0, 3).map((issue, index) => ({
      id: `exercise-${index}`,
      title: `Practice "${issue.word}"`,
      type: 'word_practice' as const,
      word: issue.word,
      description: `Practice pronouncing "${issue.word}" clearly`,
      difficulty: issue.score < 50 ? 'hard' : issue.score < 75 ? 'medium' : 'easy'
    }));
  }, [pronunciationResults, pronunciationIssues]);

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
              Words to Practice
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
                      <WordPracticeCard
                        issue={issue}
                        onSaveWord={saveWordToCollection}
                        onPlayTextToSpeech={handleTextToSpeech}
                        isSlowPlayback={slowPlaybackWords[issue.word] || false}
                        toggleSlowPlayback={toggleSlowPlayback}
                        isCurrentlyPracticing={false} // This needs to be managed if only one word can be practiced at a time
                      />
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