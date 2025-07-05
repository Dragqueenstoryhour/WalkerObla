import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import useEmblaCarousel from 'embla-carousel-react';
import useAudioRecording from '@/hooks/useAudioRecording';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Volume2, Shuffle, BookOpen, MicIcon, StopCircleIcon, Ear, Snail, RotateCw, BookmarkIcon, Check, X, Play, Pause, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CombinedLineChart } from '@/components/CombinedLineChart'; // Import the chart component
import { MostRecentActivities } from '@/components/MostRecentActivities';
import { CalendarDays, Users } from 'lucide-react';
import { SummaryCard } from '@/components/SummaryCard';

// Helper function to get syllable color based on accuracy score
const getSyllableColor = (accuracyScore: number): string => {
  const threshold = 70; // Define accuracy threshold
  if (accuracyScore >= threshold) {
    return '#2a9d8f'; // Green for correct pronunciation
  } else {
    return '#e76f51'; // Red for incorrect pronunciation
  }
};

// Helper function to map syllables from assessment results to phonetic breakdown display
const mapSyllablesToDisplay = (phoneticBreakdown: string, syllables: any[], overallScore?: number): Array<{text: string, color: string}> => {
  const displaySyllables = phoneticBreakdown.split(/\s*[·•-]\s*/).map(s => s.trim());
  
  if (!syllables || syllables.length === 0) {
    // No syllable data available - use overall score for all segments
    const fallbackColor = overallScore ? getSyllableColor(overallScore) : '#ffffff';
    return displaySyllables.map(syllable => ({
      text: syllable,
      color: fallbackColor
    }));
  }

  // Create a smart mapping system that ensures 100% coverage
  const resultSyllables = displaySyllables.map((displaySyllable, index) => {
    // Try direct matching first
    let matchingSyllable = syllables.find(s => 
      s.syllable && s.grapheme &&
      (s.syllable.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      s.grapheme.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      displaySyllable.toLowerCase().includes(s.syllable.toLowerCase()) ||
      displaySyllable.toLowerCase().includes(s.grapheme.toLowerCase()))
    );

    // If no direct match, use positional mapping (map by index)
    if (!matchingSyllable && index < syllables.length) {
      matchingSyllable = syllables[index];
    }

    // If still no match, use the closest syllable or overall word score
    if (!matchingSyllable) {
      if (syllables.length > 0) {
        // Use the last available syllable score
        matchingSyllable = syllables[syllables.length - 1];
      } else if (overallScore) {
        // Fallback to overall word score
        return {
          text: displaySyllable,
          color: getSyllableColor(overallScore)
        };
      }
    }

    if (matchingSyllable) {
      return {
        text: displaySyllable,
        color: getSyllableColor(matchingSyllable.accuracyScore)
      };
    } else {
      // Final fallback - use overall score or reasonable default
      const fallbackColor = overallScore ? getSyllableColor(overallScore) : getSyllableColor(75); // Default to good score
      return {
        text: displaySyllable,
        color: fallbackColor
      };
    }
  });

  return resultSyllables;
};

// Helper function to determine word color from phonemes for phrase text coloring
const getWordColorFromPhonemes = (wordResult: any): string => {
  if (!wordResult.phonemes || wordResult.phonemes.length === 0) {
    return wordResult.accuracyScore >= 70 ? '#2a9d8f' : '#e76f51';
  }
  
  const avgScore = wordResult.phonemes.reduce((sum: number, phoneme: any) => 
    sum + (phoneme.accuracyScore || 0), 0) / wordResult.phonemes.length;
  
  return avgScore >= 70 ? '#2a9d8f' : '#e76f51';
};

// Helper function to render color-coded phrase text
const renderColorCodedPhraseText = (phraseText: string, assessmentResult: any): JSX.Element => {
  if (!assessmentResult?.wordLevelResults) {
    // No assessment data available, return default white text
    return <span className="text-white">{phraseText}</span>;
  }

  const words = phraseText.split(/\s+/);
  const wordResults = assessmentResult.wordLevelResults;

  return (
    <span>
      {words.map((word, index) => {
        // Find matching word result (case-insensitive, remove punctuation)
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        const matchingResult = wordResults.find((wr: any) => 
          wr.word.toLowerCase() === cleanWord
        );

        const color = matchingResult 
          ? getWordColorFromPhonemes(matchingResult)
          : '#ffffff'; // Default white if no match

        return (
          <span key={index} style={{ color }} className="font-semibold">
            {word}
            {index < words.length - 1 && ' '}
          </span>
        );
      })}
    </span>
  );
};

interface SavedPhrase {
  id: number;
  phrase: string;
  syllabication?: string;
  phonetic: string | null;
  difficulty: string | null;
  source: string | null; // e.g., 'words', 'phrases', 'reader_feedback', 'reader_content'
  createdAt: string;
  assessmentResults?: any; // Added based on `routes.ts` conversion
  sourceId?: number | null; // Added based on `routes.ts` conversion
}

interface ProcessedItem {
  id: string; // This ID will now include the prefix, e.g., "word-123" or "phrase-456"
  text: string;
  syllabication?: string;
  phonetic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  recordingUrl?: string | null;
  recordingBlob?: Blob;
  assessmentResult?: any;
  status: "idle" | "recording" | "assessing" | "complete";
  source: string; // Add source to ProcessedItem to determine API endpoint for deletion
}

// Interface for activity data fetched from backend (based on `routes.ts` `recordActivity` and `getUserActivityStats` expectation)
interface Activity {
  id: number;
  userId: string;
  activityType: 'word_practice' | 'phrase_practice' | 'reading_session';
  itemPracticed: string;
  score: number | null;
  accuracy: number | null;
  fluency: number | null;
  completeness: number | null;
  difficulty: string | null;
  createdAt: string;
}

// Interfaces for assignments
interface Assignment {
  id: number;
  userId: string;
  therapistId: string;
  therapistName: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  progress: {
    totalItems: number;
    completedItems: number;
    averageScore: number;
  };
}

interface AssignmentItem {
  id: number;
  assignmentId: number;
  itemType: 'word' | 'phrase';
  content: string;
  syllabication?: string;
  phonetic?: string;
  definition?: string;
  difficulty?: string;
  isCompleted: boolean;
  lastScore?: number;
  bestScore?: number;
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
}

// NEW INTERFACE to match the backend's getUserActivityStats return type
interface UserActivityStatsResponse {
  wordStats: { total: number; avgScore: number; recent: Activity[] };
  phraseStats: { total: number; avgScore: number; recent: Activity[] };
  readingStats: { total: number; avgScore: number; recent: Activity[] };
}

// Enhanced AssignmentCarousel Component - matching Phrases.tsx functionality with full recording and assessment features
function AssignmentCarousel({ items, assignmentId }: { items: AssignmentItem[], assignmentId: number }) {
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [assignmentAssessmentResult, setAssignmentAssessmentResult] = useState<any>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [slowPlaybackItems, setSlowPlaybackItems] = useState<Record<string, boolean>>({});
  const [showAssignmentSummary, setShowAssignmentSummary] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentItemIndexRef = useRef<number>(-1);

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    skipSnaps: false,
    inViewThreshold: 0.7
  });

  // Use audio recording hook
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
      const currentIndex = currentItemIndexRef.current;
      if (currentIndex >= 0 && currentIndex < processedItems.length) {
        processAssignmentRecording(blob, currentIndex);
      } else {
        console.warn("Invalid assignment item index when recording completed:", currentIndex);
        setIsProcessingRecording(false);
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
      setIsProcessingRecording(false);
    },
  });

  // Convert assignment items to processed items format
  useEffect(() => {
    const converted = items.map((item): ProcessedItem => ({
      id: `assignment-${item.id}`,
      text: item.content,
      syllabication: item.syllabication,
      phonetic: item.phonetic,
      difficulty: item.difficulty as any,
      status: item.isCompleted ? "complete" : "idle",
      source: "assignment"
    }));
    setProcessedItems(converted);
  }, [items]);

  // Check if all assignment items are completed to show summary
  useEffect(() => {
    if (processedItems.length > 0) {
      const completedCount = processedItems.filter(item => item.status === "complete").length;
      if (completedCount === processedItems.length && !showAssignmentSummary) {
        setTimeout(() => {
          setShowAssignmentSummary(true);
          // Add summary card to processed items
          setProcessedItems(prev => [...prev, {
            id: 'assignment-summary-card',
            text: 'Assignment Complete!',
            status: 'complete',
            source: 'summary'
          }]);
          // Navigate to summary card
          if (emblaApi) {
            emblaApi.scrollTo(processedItems.length);
          }
        }, 1000);
      }
    }
  }, [processedItems, showAssignmentSummary, emblaApi]);

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedItems.length - 1) {
      emblaApi.scrollNext();
    }
  };

  const goToPrevious = () => {
    if (emblaApi && currentCarouselIndex > 0) {
      emblaApi.scrollPrev();
    }
  };

  // Start recording for assignment item practice
  const startAssignmentPractice = async (itemIndex: number) => {
    if (itemIndex < 0 || itemIndex >= processedItems.length) return;

    try {
      const item = processedItems[itemIndex];
      setCurrentlyPracticing(item.id);
      setCurrentItemIndex(itemIndex);
      currentItemIndexRef.current = itemIndex;
      setAssignmentAssessmentResult(null);

      setProcessedItems((items) =>
        items.map((it, idx) =>
          idx === itemIndex ? { ...it, status: "recording" } : it,
        ),
      );

      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording: "${item.text}"`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
    }
  };

  // Stop recording for assignment practice
  const stopAssignmentPractice = async () => {
    try {
      await stopRecording();
      setIsProcessingRecording(true);
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording properly.",
        variant: "destructive",
      });
    }
  };

  // Process assignment recording
  const processAssignmentRecording = async (blob: Blob, itemIndex: number) => {
    if (itemIndex < 0 || itemIndex >= processedItems.length) {
      console.error("Invalid assignment item index for processing:", itemIndex);
      setIsProcessingRecording(false);
      return;
    }

    const item = processedItems[itemIndex];
    if (!item) {
      console.error("Assignment item not found at index:", itemIndex);
      setIsProcessingRecording(false);
      return;
    }

    setProcessedItems((items) =>
      items.map((it, idx) =>
        idx === itemIndex ? { ...it, status: "assessing" } : it,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("referenceText", item.text);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAssignmentAssessmentResult(result);

      // Record the assignment result
      try {
        const assignmentResponse = await fetch(`/api/assignments/${assignmentId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: items[itemIndex].id,
            pronunciationScore: result.pronunciationScore,
            accuracyScore: result.accuracyScore,
            fluencyScore: result.fluencyScore,
            completenessScore: result.completenessScore,
            detailedResults: result,
          }),
        });

        if (assignmentResponse.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignmentId] });
        }
      } catch (err) {
        console.error('Failed to record assignment result:', err);
      }

      setProcessedItems((items) =>
        items.map((it, idx) =>
          idx === itemIndex
            ? {
                ...it,
                status: "complete",
                assessmentResult: result,
                recordingBlob: blob
              }
            : it,
        ),
      );

      toast({
        title: "Assessment Complete!",
        description: `Pronunciation Score: ${Math.round(result.pronunciationScore)}%`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Error processing assignment recording:", error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });

      setProcessedItems((items) =>
        items.map((it, idx) =>
          idx === itemIndex ? { ...it, status: "idle" } : it,
        ),
      );
    }

    setCurrentlyPracticing(null);
    setIsProcessingRecording(false);
  };

  // Play assignment item audio
  const playAssignmentAudio = async (item: ProcessedItem, slow: boolean = false) => {
    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          voice: "default",
          speed: slow ? 0.7 : 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }

      toast({
        title: slow ? "Playing Slowly" : "Playing Item",
        description: item.text,
      });
    } catch (error) {
      console.error("Error playing assignment audio:", error);
      toast({
        title: "Audio Error",
        description: "Could not play audio",
        variant: "destructive",
      });
    }
  };

  if (processedItems.length === 0) {
    return <div className="text-center py-8 text-gray-500">No items in this assignment</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2 text-purple-800">Assignment Practice</h3>
      </div>

      {/* Progress indicator */}
      <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
          <span className="text-sm text-[#264653]">
            {currentCarouselIndex + 1} of {processedItems.length}
          </span>
        </div>
        <Progress
          value={((currentCarouselIndex + 1) / processedItems.length) * 100}
          className="h-3 bg-[#f9fafb] [&_div]:bg-[#1537cc]"
        />
      </div>

      {/* Carousel */}
      <div className="flex justify-center">
        <div className="embla w-full max-w-lg" ref={emblaRef}>
          <div className="embla__container flex">
            {processedItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="embla__slide flex-[0_0_100%] px-2">
                {item.id === 'assignment-summary-card' ? (
                  // Assignment Summary Card
                  <Card className="h-full shadow-lg border-0 card-content w-full max-w-full overflow-hidden" style={{ backgroundColor: '#1947e5' }}>
                    <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                      {/* Celebratory particles effect */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                        <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                        <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                        <div className="absolute top-16 right-1/4 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
                        <div className="absolute top-6 left-2/3 w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce"></div>
                      </div>

                      <div className="relative z-10">
                        <div className="text-5xl mb-4">🎉</div>
                        <CardTitle className="text-3xl font-bold mb-4 leading-tight px-4">Assignment Complete!</CardTitle>
                        <p className="text-lg text-white/90">Congratulations on finishing your assignment!</p>
                      </div>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 text-white space-y-4 max-h-96 overflow-y-auto w-full">
                      {/* Performance Summary */}
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {(() => {
                          const itemsWithScores = processedItems.filter(item => 
                            item.assessmentResult && item.assessmentResult.pronunciationScore !== null && item.id !== 'assignment-summary-card'
                          );

                          if (itemsWithScores.length === 0) {
                            return (
                              <div className="col-span-2 text-center p-2 bg-white rounded-lg">
                                <div className="text-sm text-gray-700">No scores available yet</div>
                                <div className="text-xs text-gray-500">Practice the assignment items to see your results</div>
                              </div>
                            );
                          }

                          const avgScore = Math.round(
                            itemsWithScores.reduce((sum, item) => sum + (item.assessmentResult?.pronunciationScore || 0), 0) / itemsWithScores.length
                          );

                          return (
                            <>
                              <div className="bg-white rounded-lg p-2 text-center">
                                <div className="text-2xl font-bold text-purple-600">{avgScore}%</div>
                                <div className="text-xs text-gray-600">Average Score</div>
                              </div>
                              <div className="bg-white rounded-lg p-2 text-center">
                                <div className="text-2xl font-bold text-green-600">{itemsWithScores.length}</div>
                                <div className="text-xs text-gray-600">Items Completed</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Restart Button */}
                      <div className="flex justify-center mt-6">
                        <Button
                          onClick={() => {
                            setShowAssignmentSummary(false);
                            setProcessedItems(prev => prev.filter(item => item.id !== 'assignment-summary-card'));
                            setCurrentCarouselIndex(0);
                            if (emblaApi) {
                              emblaApi.scrollTo(0);
                            }
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <RotateCw className="h-6 w-6 mr-2" />
                          Practice Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Regular Assignment Item Card
                  <Card className="h-full shadow-lg border-0 card-content w-full max-w-full overflow-hidden" style={{ backgroundColor: '#1947e5' }}>
                    <CardHeader className="text-center text-white pb-4">
                      <CardTitle className="text-3xl font-bold mb-4 leading-tight px-4">{item.text}</CardTitle>
                      
                      {item.syllabication && (
                        <div className="text-lg text-white/90 mb-4">
                          {item.syllabication}
                        </div>
                      )}

                      {item.phonetic && (
                        <div className="text-lg text-white/90 italic mb-4">
                          /{item.phonetic}/
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="text-center pb-6">
                    {/* Recording Button */}
                    <div className="mb-6">
                      {item.status === "recording" ? (
                        <Button
                          size="lg"
                          onClick={stopAssignmentPractice}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <StopCircleIcon className="h-6 w-6 mr-2" />
                          Stop Recording
                        </Button>
                      ) : item.status === "assessing" ? (
                        <Button
                          size="lg"
                          disabled
                          className="bg-yellow-500 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                          Assessing...
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          onClick={() => startAssignmentPractice(index)}
                          disabled={currentlyPracticing !== null}
                          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <MicIcon className="h-6 w-6 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      {/* Hear Button */}
                      <Button
                        onClick={() => playAssignmentAudio(item, false)}
                        className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded-full shadow-md"
                      >
                        <Ear className="h-5 w-5 mr-2" />
                        Hear
                      </Button>

                      {/* Slow Speed Toggle */}
                      <div className="flex items-center bg-white/20 rounded-full px-3 py-2">
                        <Snail className="h-5 w-5 mr-2 text-white" />
                        <Switch
                          checked={slowPlaybackItems[item.id] || false}
                          onCheckedChange={(checked) => {
                            setSlowPlaybackItems(prev => ({
                              ...prev,
                              [item.id]: checked
                            }));
                            if (checked) {
                              playAssignmentAudio(item, true);
                            }
                          }}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>

                      {/* Assessment Results */}
                      {item.status === "complete" && item.assessmentResult && (
                        <div className="bg-white/20 rounded-lg p-4 mt-4">
                          <div className="text-white font-semibold mb-2">Assessment Results:</div>
                          <div className="text-sm text-white/90 space-y-1">
                            <div>Pronunciation: {Math.round(item.assessmentResult.pronunciationScore)}%</div>
                            <div>Accuracy: {Math.round(item.assessmentResult.accuracyScore)}%</div>
                            <div>Fluency: {Math.round(item.assessmentResult.fluencyScore)}%</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-between items-center max-w-xl mx-auto">
        <Button
          onClick={goToPrevious}
          disabled={currentCarouselIndex === 0}
          variant="outline"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="text-sm text-gray-600">
          {currentCarouselIndex + 1} of {processedItems.length}
        </div>
        
        <Button
          onClick={goToNext}
          disabled={currentCarouselIndex >= processedItems.length - 1}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

// AssignmentsTab Component
function AssignmentsTab() {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentItems, setAssignmentItems] = useState<AssignmentItem[]>([]);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const { toast } = useToast();

  // Fetch user assignments
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments'],
    enabled: true,
  });

  // Fetch assignment details when one is selected
  const { data: assignmentDetails } = useQuery<{
    items: AssignmentItem[];
    progress: { totalItems: number; completedItems: number; averageScore: number };
  }>({
    queryKey: ['/api/assignments', selectedAssignment?.id],
    enabled: !!selectedAssignment,
  });

  useEffect(() => {
    if (assignmentDetails?.items) {
      setAssignmentItems(assignmentDetails.items);
    }
  }, [assignmentDetails]);

  const handleAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-lg text-gray-600">Loading assignments...</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">No assignments yet</h2>
        <p className="text-gray-500">Your therapist will assign homework here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation for multiple assignments */}
      {assignments.length > 1 && (
        <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#264653]">Assignments</span>
            <span className="text-sm text-[#264653]">
              {currentAssignmentIndex + 1} of {assignments.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <Button
              onClick={() => {
                const newIndex = Math.max(currentAssignmentIndex - 1, 0);
                setCurrentAssignmentIndex(newIndex);
                setSelectedAssignment(assignments[newIndex]);
              }}
              disabled={currentAssignmentIndex === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="text-sm text-gray-600">
              {assignments[currentAssignmentIndex]?.title || 'Assignment'}
            </div>
            
            <Button
              onClick={() => {
                const newIndex = Math.min(currentAssignmentIndex + 1, assignments.length - 1);
                setCurrentAssignmentIndex(newIndex);
                setSelectedAssignment(assignments[newIndex]);
              }}
              disabled={currentAssignmentIndex >= assignments.length - 1}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Assignment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map((assignment: Assignment) => (
          <Card 
            key={assignment.id} 
            className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
              selectedAssignment?.id === assignment.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleAssignmentClick(assignment)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-purple-800">
                Homework assignment - {formatDate(assignment.createdAt)}
              </CardTitle>
              <CardDescription className="text-sm">
                {assignment.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignment.description && (
                <p className="text-sm text-gray-600">{assignment.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={(assignment.progress.completedItems / assignment.progress.totalItems) * 100} 
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-gray-600">
                    {assignment.progress.completedItems}/{assignment.progress.totalItems}
                  </span>
                </div>
                
                <div className="text-sm font-semibold text-blue-600">
                  {assignment.progress.averageScore}%
                </div>
              </div>

              {assignment.dueDate && (
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Due: {formatDate(assignment.dueDate)}
                </div>
              )}

              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                {assignment.therapistName}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Items Carousel */}
      {selectedAssignment && assignmentItems.length > 0 && (
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-purple-800 mb-4">
              Practice: {selectedAssignment.title}
            </h3>
            <AssignmentCarousel 
              items={assignmentItems} 
              assignmentId={selectedAssignment.id}
            />
          </div>
          
          {/* Individual Words Practice Carousel */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 text-purple-800">Practice Individual Words</h3>
              <p className="text-gray-600">Practice each word from your assignment individually</p>
            </div>
            <PracticeWordsCarousel
              items={assignmentItems.map(item => ({
                id: `assignment-word-${item.id}`,
                text: item.content,
                syllabication: item.syllabication,
                phonetic: item.phonetic,
                difficulty: (item.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
                source: "assignment",
                status: "idle" as const
              }))}
              title="Assignment Words Practice"
              color="#9333ea"
              emptyMessage="No words in this assignment"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Practice Words Carousel Component - matching Words.tsx functionality
function PracticeWordsCarousel({
  items,
  title,
  color,
  emptyMessage,
}: {
  items: ProcessedItem[];
  title: string;
  color: string;
  emptyMessage: string;
}) {
  const [processedWords, setProcessedWords] = useState<ProcessedItem[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentWordIndexRef = useRef<number>(-1);

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    skipSnaps: false,
    inViewThreshold: 0.7
  });

  // Use audio recording hook
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
      const currentIndex = currentWordIndexRef.current;
      if (currentIndex >= 0 && currentIndex < processedWords.length) {
        processWordRecording(blob, currentIndex);
      } else {
        console.warn("Invalid word index when recording completed:", currentIndex);
        setIsProcessingRecording(false);
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
      setIsProcessingRecording(false);
    },
  });

  // Initialize processed words from items
  useEffect(() => {
    if (items.length > 0) {
      setProcessedWords(items);
    }
  }, [items]);

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedWords.length - 1) {
      emblaApi.scrollNext();
    }
  };

  const goToPrevious = () => {
    if (emblaApi && currentCarouselIndex > 0) {
      emblaApi.scrollPrev();
    }
  };

  // Start recording for word practice
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= processedWords.length) return;

    try {
      const word = processedWords[wordIndex];
      setCurrentlyPracticing(word.id);
      setCurrentWordIndex(wordIndex);
      currentWordIndexRef.current = wordIndex;
      setWordAssessmentResult(null);

      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
        ),
      );

      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording word: "${word.text}"`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
    }
  };

  // Stop recording for word practice
  const stopWordPractice = async () => {
    try {
      await stopRecording();
      setIsProcessingRecording(true);
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording properly.",
        variant: "destructive",
      });
    }
  };

  // Process word recording
  const processWordRecording = async (blob: Blob, wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= processedWords.length) {
      console.error("Invalid word index for processing:", wordIndex);
      setIsProcessingRecording(false);
      return;
    }

    const word = processedWords[wordIndex];
    if (!word) {
      console.error("Word not found at index:", wordIndex);
      setIsProcessingRecording(false);
      return;
    }

    setProcessedWords((words) =>
      words.map((w, idx) =>
        idx === wordIndex ? { ...w, status: "assessing" } : w,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("referenceText", word.text);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setWordAssessmentResult(result);

      // Record activity
      try {
        await fetch('/api/activities/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'word_practice',
            itemPracticed: word.text,
            score: result.pronunciationScore,
            accuracy: result.accuracyScore,
            fluency: result.fluencyScore,
            completeness: result.completenessScore,
            difficulty: word.difficulty || null
          })
        });
      } catch (err) {
        console.error('Failed to record activity:', err);
      }

      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                status: "complete",
                assessmentResult: result,
                recordingBlob: blob
              }
            : w,
        ),
      );

      toast({
        title: "Assessment Complete!",
        description: `Pronunciation Score: ${Math.round(result.pronunciationScore)}%`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Error processing word recording:", error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });

      setProcessedWords((words) =>
        words.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    }

    setCurrentlyPracticing(null);
    setIsProcessingRecording(false);
  };

  // Play word audio
  const playWordAudio = async (word: ProcessedItem, slow: boolean = false) => {
    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: word.text,
          voice: "default",
          speed: slow ? 0.7 : 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }

      toast({
        title: slow ? "Playing Slowly" : "Playing Word",
        description: word.text,
      });
    } catch (error) {
      console.error("Error playing word audio:", error);
      toast({
        title: "Audio Error",
        description: "Could not play word audio",
        variant: "destructive",
      });
    }
  };

  if (items.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-bold mb-4" style={{ color }}>{title}</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2" style={{ color }}>{title}</h3>
      </div>

      {/* Progress indicator */}
      <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
          <span className="text-sm text-[#264653]">
            {currentCarouselIndex + 1} of {processedWords.length}
          </span>
        </div>
        <Progress
          value={((currentCarouselIndex + 1) / processedWords.length) * 100}
          className="h-3 bg-[#f9fafb] [&_div]:bg-[#1537cc]"
        />
      </div>

      {/* Carousel */}
      <div className="flex justify-center">
        <div className="embla w-full max-w-lg" ref={emblaRef}>
          <div className="embla__container flex">
            {processedWords.map((word, index) => (
              <div key={`${word.id}-${index}`} className="embla__slide flex-[0_0_100%] px-2">
                <Card className="h-full shadow-lg border-0 card-content w-full max-w-full overflow-hidden" style={{ backgroundColor: '#1947e5' }}>
                  <CardHeader className="text-center text-white pb-4">
                    <CardTitle className="text-4xl font-bold mb-4">{word.text}</CardTitle>
                    
                    {word.phonetic && (
                      <div className="text-lg text-white/90 italic mb-4">
                        {word.phonetic}
                      </div>
                    )}

                    {/* Phonetic Breakdown with Color Coding */}
                    {word.assessmentResult?.wordLevelResults && word.assessmentResult.wordLevelResults.length > 0 && (
                      <div className="mb-4">
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                          <p className="text-sm text-white/80 mb-2">Phonetic Breakdown:</p>
                          <div className="text-lg font-bold">
                            {(() => {
                              const wordResult = word.assessmentResult.wordLevelResults[0];
                              if (word.phonetic && wordResult.syllables) {
                                const coloredSyllables = mapSyllablesToDisplay(
                                  word.phonetic, 
                                  wordResult.syllables, 
                                  wordResult.accuracyScore
                                );
                                return (
                                  <>
                                    {coloredSyllables.map((syllable, idx) => (
                                      <span key={idx} style={{ color: syllable.color }}>
                                        {syllable.text}
                                        {idx < coloredSyllables.length - 1 && ' · '}
                                      </span>
                                    ))}
                                  </>
                                );
                              } else if (word.phonetic) {
                                // Fallback with white text if no syllable data
                                return <span className="text-white">{word.phonetic}</span>;
                              }
                              return <span className="text-white">{word.text}</span>;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="text-center pb-6">
                    {/* Recording Button */}
                    <div className="mb-6">
                      {word.status === "recording" ? (
                        <Button
                          size="lg"
                          onClick={stopWordPractice}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <StopCircleIcon className="h-6 w-6 mr-2" />
                          Stop Recording
                        </Button>
                      ) : word.status === "assessing" ? (
                        <Button
                          size="lg"
                          disabled
                          className="bg-yellow-500 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                          Assessing...
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          onClick={() => startWordPractice(index)}
                          disabled={currentlyPracticing !== null}
                          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <MicIcon className="h-6 w-6 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      {/* Hear Button */}
                      <Button
                        onClick={() => playWordAudio(word, false)}
                        className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded-full shadow-md"
                      >
                        <Ear className="h-5 w-5 mr-2" />
                        Hear
                      </Button>

                      {/* Slow Speed Toggle */}
                      <div className="flex items-center bg-white/20 rounded-full px-3 py-2">
                        <Snail className="h-5 w-5 mr-2 text-white" />
                        <Switch
                          checked={slowPlaybackWords[word.id] || false}
                          onCheckedChange={(checked) => {
                            setSlowPlaybackWords(prev => ({
                              ...prev,
                              [word.id]: checked
                            }));
                            if (checked) {
                              playWordAudio(word, true);
                            }
                          }}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>

                      {/* See Button */}
                      <Button
                        onClick={() => playWordAudio(word, slowPlaybackWords[word.id] || false)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2 rounded-full shadow-md"
                      >
                        <Eye className="h-5 w-5 mr-2" />
                        See
                      </Button>
                    </div>

                    {/* Assessment Results */}
                    {word.status === "complete" && word.assessmentResult && (
                      <div className="bg-white/20 rounded-lg p-4 mt-4">
                        <div className="text-white font-semibold mb-2">Assessment Results:</div>
                        <div className="text-sm text-white/90 space-y-1">
                          <div>Pronunciation: {Math.round(word.assessmentResult.pronunciationScore)}%</div>
                          <div>Accuracy: {Math.round(word.assessmentResult.accuracyScore)}%</div>
                          <div>Fluency: {Math.round(word.assessmentResult.fluencyScore)}%</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-between items-center max-w-xl mx-auto">
        <Button
          onClick={goToPrevious}
          disabled={currentCarouselIndex === 0}
          variant="outline"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="text-sm text-gray-600">
          {currentCarouselIndex + 1} of {processedWords.length}
        </div>
        
        <Button
          onClick={goToNext}
          disabled={currentCarouselIndex >= processedWords.length - 1}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

// Enhanced Practice Phrases Carousel Component - matching Phrases.tsx functionality
function PracticePhrasesCarousel({
  items,
  title,
  color,
  emptyMessage,
}: {
  items: ProcessedItem[];
  title: string;
  color: string;
  emptyMessage: string;
}) {
  const [processedPhrases, setProcessedPhrases] = useState<ProcessedItem[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [phraseAssessmentResult, setPhraseAssessmentResult] = useState<any>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [slowPlaybackPhrases, setSlowPlaybackPhrases] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPhraseIndexRef = useRef<number>(-1);

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    skipSnaps: false,
    inViewThreshold: 0.7
  });

  // Use audio recording hook
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
      const currentIndex = currentPhraseIndexRef.current;
      if (currentIndex >= 0 && currentIndex < processedPhrases.length) {
        processPhraseRecording(blob, currentIndex);
      } else {
        console.warn("Invalid phrase index when recording completed:", currentIndex);
        setIsProcessingRecording(false);
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
      setIsProcessingRecording(false);
    },
  });

  // Initialize processed phrases from items
  useEffect(() => {
    if (items.length > 0) {
      setProcessedPhrases(items);
    }
  }, [items]);

  // Update carousel index when slide changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentCarouselIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Carousel navigation functions
  const goToNext = () => {
    if (emblaApi && currentCarouselIndex < processedPhrases.length - 1) {
      emblaApi.scrollNext();
    }
  };

  const goToPrevious = () => {
    if (emblaApi && currentCarouselIndex > 0) {
      emblaApi.scrollPrev();
    }
  };

  // Start recording for phrase practice
  const startPhrasePractice = async (phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) return;

    try {
      const phrase = processedPhrases[phraseIndex];
      setCurrentlyPracticing(phrase.id);
      setCurrentPhraseIndex(phraseIndex);
      currentPhraseIndexRef.current = phraseIndex;
      setPhraseAssessmentResult(null);

      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "recording" } : p,
        ),
      );

      await startRecording();

      toast({
        title: "Recording Started",
        description: `Recording phrase: "${phrase.text}"`,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access the microphone. Please check permissions.",
        variant: "destructive",
      });
      setCurrentlyPracticing(null);
    }
  };

  // Stop recording for phrase practice
  const stopPhrasePractice = async () => {
    try {
      await stopRecording();
      setIsProcessingRecording(true);
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording properly.",
        variant: "destructive",
      });
    }
  };

  // Process phrase recording
  const processPhraseRecording = async (blob: Blob, phraseIndex: number) => {
    if (phraseIndex < 0 || phraseIndex >= processedPhrases.length) {
      console.error("Invalid phrase index for processing:", phraseIndex);
      setIsProcessingRecording(false);
      return;
    }

    const phrase = processedPhrases[phraseIndex];
    if (!phrase) {
      console.error("Phrase not found at index:", phraseIndex);
      setIsProcessingRecording(false);
      return;
    }

    setProcessedPhrases((phrases) =>
      phrases.map((p, idx) =>
        idx === phraseIndex ? { ...p, status: "assessing" } : p,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("referenceText", phrase.text);

      const response = await fetch("/api/pronunciation/assess", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPhraseAssessmentResult(result);

      // Record activity
      try {
        await fetch('/api/activities/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'phrase_practice',
            itemPracticed: phrase.text,
            score: result.pronunciationScore,
            accuracy: result.accuracyScore,
            fluency: result.fluencyScore,
            completeness: result.completenessScore,
            difficulty: phrase.difficulty || null
          })
        });
      } catch (err) {
        console.error('Failed to record activity:', err);
      }

      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex
            ? {
                ...p,
                status: "complete",
                assessmentResult: result,
                recordingBlob: blob
              }
            : p,
        ),
      );

      toast({
        title: "Assessment Complete!",
        description: `Pronunciation Score: ${Math.round(result.pronunciationScore)}%`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Error processing phrase recording:", error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess pronunciation. Please try again.",
        variant: "destructive",
      });

      setProcessedPhrases((phrases) =>
        phrases.map((p, idx) =>
          idx === phraseIndex ? { ...p, status: "idle" } : p,
        ),
      );
    }

    setCurrentlyPracticing(null);
    setIsProcessingRecording(false);
  };

  // Play phrase audio
  const playPhraseAudio = async (phrase: ProcessedItem, slow: boolean = false) => {
    try {
      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: phrase.text,
          voice: "default",
          speed: slow ? 0.7 : 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }

      toast({
        title: slow ? "Playing Slowly" : "Playing Phrase",
        description: phrase.text,
      });
    } catch (error) {
      console.error("Error playing phrase audio:", error);
      toast({
        title: "Audio Error",
        description: "Could not play phrase audio",
        variant: "destructive",
      });
    }
  };

  if (items.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-bold mb-4" style={{ color }}>{title}</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2" style={{ color }}>{title}</h3>
      </div>

      {/* Progress indicator */}
      <div className="bg-white rounded-lg p-4 shadow-lg border-0 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#264653]">Practice Progress</span>
          <span className="text-sm text-[#264653]">
            {currentCarouselIndex + 1} of {processedPhrases.length}
          </span>
        </div>
        <Progress
          value={((currentCarouselIndex + 1) / processedPhrases.length) * 100}
          className="h-3 bg-[#f9fafb] [&_div]:bg-[#1537cc]"
        />
      </div>

      {/* Carousel */}
      <div className="flex justify-center">
        <div className="embla w-full max-w-lg" ref={emblaRef}>
          <div className="embla__container flex">
            {processedPhrases.map((phrase, index) => (
              <div key={`${phrase.id}-${index}`} className="embla__slide flex-[0_0_100%] px-2">
                <Card className="h-full shadow-lg border-0 card-content w-full max-w-full overflow-hidden" style={{ backgroundColor: '#1947e5' }}>
                  <CardHeader className="text-center text-white pb-4">
                    <CardTitle className="text-3xl font-bold mb-4 leading-tight px-4">
                      {phrase.assessmentResult ? renderColorCodedPhraseText(phrase.text, phrase.assessmentResult) : phrase.text}
                    </CardTitle>
                    
                    {phrase.phonetic && (
                      <div className="text-lg text-white/90 italic mb-4">
                        {phrase.phonetic}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="text-center pb-6">
                    {/* Recording Button */}
                    <div className="mb-6">
                      {phrase.status === "recording" ? (
                        <Button
                          size="lg"
                          onClick={stopPhrasePractice}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <StopCircleIcon className="h-6 w-6 mr-2" />
                          Stop Recording
                        </Button>
                      ) : phrase.status === "assessing" ? (
                        <Button
                          size="lg"
                          disabled
                          className="bg-yellow-500 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                          Assessing...
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          onClick={() => startPhrasePractice(index)}
                          disabled={currentlyPracticing !== null}
                          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg"
                        >
                          <MicIcon className="h-6 w-6 mr-2" />
                          Start Recording
                        </Button>
                      )}
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      {/* Hear Button */}
                      <Button
                        onClick={() => playPhraseAudio(phrase, false)}
                        className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded-full shadow-md"
                      >
                        <Ear className="h-5 w-5 mr-2" />
                        Hear
                      </Button>

                      {/* Slow Speed Toggle */}
                      <div className="flex items-center bg-white/20 rounded-full px-3 py-2">
                        <Snail className="h-5 w-5 mr-2 text-white" />
                        <Switch
                          checked={slowPlaybackPhrases[phrase.id] || false}
                          onCheckedChange={(checked) => {
                            setSlowPlaybackPhrases(prev => ({
                              ...prev,
                              [phrase.id]: checked
                            }));
                            if (checked) {
                              playPhraseAudio(phrase, true);
                            }
                          }}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>

                    {/* Assessment Results */}
                    {phrase.status === "complete" && phrase.assessmentResult && (
                      <div className="bg-white/20 rounded-lg p-4 mt-4">
                        <div className="text-white font-semibold mb-2">Assessment Results:</div>
                        <div className="text-sm text-white/90 space-y-1">
                          <div>Pronunciation: {Math.round(phrase.assessmentResult.pronunciationScore)}%</div>
                          <div>Accuracy: {Math.round(phrase.assessmentResult.accuracyScore)}%</div>
                          <div>Fluency: {Math.round(phrase.assessmentResult.fluencyScore)}%</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-between items-center max-w-xl mx-auto">
        <Button
          onClick={goToPrevious}
          disabled={currentCarouselIndex === 0}
          variant="outline"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="text-sm text-gray-600">
          {currentCarouselIndex + 1} of {processedPhrases.length}
        </div>
        
        <Button
          onClick={goToNext}
          disabled={currentCarouselIndex >= processedPhrases.length - 1}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

export default function MyWordsNew() {
  const { isAuthenticated } = useAuth();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<ProcessedItem[]>([]);
  const [shuffledPhrases, setShuffledPhrases] = useState<ProcessedItem[]>([]);
  const [shuffledReadings, setShuffledReadings] = useState<ProcessedItem[]>([]);

  // Fetch saved words, phrases, and practice groups
  const { data: savedWords = [] } = useQuery<any[]>({
    queryKey: ['/api/saved-words'],
    enabled: isAuthenticated,
  });

  const { data: savedPhrases = [] } = useQuery<SavedPhrase[]>({
    queryKey: ['/api/user/saved-phrases'],
    enabled: isAuthenticated,
  });

  const { data: practiceGroups = [] } = useQuery<any[]>({
    queryKey: ['/api/user/practice-groups'],
    enabled: isAuthenticated,
  });

  // Fetch user stats and activities
  const { data: wordActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities/words'],
    enabled: isAuthenticated,
  });

  const { data: phraseActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities/phrases'],
    enabled: isAuthenticated,
  });

  const { data: readingActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities/readings'],
    enabled: isAuthenticated,
  });

  // Fetch saved readings separately
  const { data: savedReadings = [] } = useQuery<any[]>({
    queryKey: ['/api/user/saved-readings'],
    enabled: isAuthenticated,
  });

  // Convert saved data to ProcessedItem format
  useEffect(() => {
    if (savedWords.length > 0) {
      const processedWords: ProcessedItem[] = savedWords.map((word: any) => ({
        id: `word-${word.word}`,
        text: word.word,
        syllabication: word.syllabication,
        phonetic: word.phonetic || undefined,
        difficulty: word.difficulty as "beginner" | "intermediate" | "advanced" | undefined,
        status: "idle",
        source: "words"
      }));
      setShuffledWords(processedWords);
    }
  }, [savedWords]);

  useEffect(() => {
    if (savedPhrases.length > 0) {
      // Filter out items that have source 'words' to ensure only actual phrases are shown
      const actualPhrases = savedPhrases.filter((phrase: SavedPhrase) => phrase.source !== 'words');
      const processedPhrases: ProcessedItem[] = actualPhrases.map((phrase: SavedPhrase) => ({
        id: `phrase-${phrase.id}`,
        text: phrase.phrase,
        syllabication: phrase.syllabication,
        phonetic: phrase.phonetic || undefined,
        difficulty: phrase.difficulty as "beginner" | "intermediate" | "advanced" | undefined,
        status: "idle",
        source: "phrases"
      }));
      setShuffledPhrases(processedPhrases);
    }
  }, [savedPhrases]);

  useEffect(() => {
    if (savedReadings.length > 0) {
      const processedReadings: ProcessedItem[] = savedReadings.map((reading: any) => ({
        id: `reading-${reading.id}`,
        text: reading.phrase, // The content is stored in the phrase field
        syllabication: reading.syllabication,
        phonetic: reading.phonetic || undefined, // This contains the title
        difficulty: reading.difficulty as "beginner" | "intermediate" | "advanced" | undefined,
        status: "idle",
        source: "readings"
      }));
      setShuffledReadings(processedReadings);
    } else {
      setShuffledReadings([]);
    }
  }, [savedReadings]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 bg-[#f9fafb] min-h-screen">
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Sign in to view your journey</h2>
          <p className="text-gray-500">Track your progress and access your saved words</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-[#f9fafb] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-800">My Journey</h1>
          <p className="text-muted-foreground">
            Track your progress and practice your saved words, phrases, and readings
          </p>
        </div>

        {/* Tabs for My Journey and My Assignments */}
        <Tabs defaultValue="journey" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="journey">My Journey</TabsTrigger>
            <TabsTrigger value="assignments">My Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="journey" className="space-y-6">
            {/* Practice Words Carousel */}
            <PracticeWordsCarousel
              items={shuffledWords}
              title="Practice Words"
              color="#1947e5"
              emptyMessage="No saved words yet"
            />

            {/* Practice Phrases Carousel */}
            <PracticePhrasesCarousel
              items={shuffledPhrases}
              title="Practice Phrases"
              color="#1947e5"
              emptyMessage="No saved phrases yet"
            />

            {/* Practice Readings Carousel */}
            <PracticePhrasesCarousel
              items={shuffledReadings}
              title="Practice Readings"
              color="#1947e5"
              emptyMessage="No saved readings yet"
            />

            {/* My Stats Component */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-purple-800 mb-4">My Stats</h2>
              <CombinedLineChart
                wordActivities={wordActivities}
                phraseActivities={phraseActivities}
                readingActivities={readingActivities}
              />
              
              {/* Most Recent Activities */}
              <div className="mt-8">
                <MostRecentActivities />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <AssignmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}