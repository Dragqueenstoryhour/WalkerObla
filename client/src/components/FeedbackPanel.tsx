import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Volume2, Share2, BookmarkIcon, Snail, Check, MicIcon, StopCircleIcon, RotateCw, VolumeIcon, Ear, ChevronLeft, ChevronRight, Gauge, Star } from 'lucide-react';
import { useReading } from '@/contexts/ReadingContext';
import { PronunciationIssue, SuggestedExercise } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/azure';
import { useToast } from '@/hooks/use-toast';
import { submitReadingRecording } from '@/lib/azure';
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
  const [isRecording, setIsRecording] = useState(false);
  const [wordAssessmentResult, setWordAssessmentResult] = useState<any>(null);
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  
  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [slowPlaybackWords, setSlowPlaybackWords] = useState<Record<string, boolean>>({});

  // Refs for media recording
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


    } catch (error) {
      console.error("Error playing pronunciation:", error);
      toast({
        title: "Error",
        description: "Could not play pronunciation. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Start recording for an individual word practice
  const startWordPractice = async (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= pronunciationIssues.length) return;

    try {
      const issue = pronunciationIssues[wordIndex];
      setCurrentlyPracticing(issue.word);
      chunksRef.current = [];

      // Update the issue status to recording
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "recording" } : w,
        ),
      );

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
          tracks.forEach((track) => track.stop());
          streamRef.current = null;
        }

        try {
          // Create audio blob
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          // Process the word recording
          await processWordRecording(audioBlob, wordIndex);
        } catch (error) {
          console.error("Error processing word recording:", error);
          toast({
            title: "Recording Error",
            description: "Could not process the recording. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          setIsProcessingWord(false);

          // Reset issue status
          setPronunciationIssues((issues) =>
            issues.map((w, idx) =>
              idx === wordIndex ? { ...w, status: "idle" } : w,
            ),
          );
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
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



  // Process word recording with Azure
  const processWordRecording = async (audioBlob: Blob, wordIndex: number) => {
    setIsProcessingWord(true);

    try {
      const issue = pronunciationIssues[wordIndex];

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
      formData.append("text", issue.word);
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
      console.log("Received assessment results:", result);

      // Validate the result has expected properties
      if (typeof result.pronunciationScore !== "number") {
        throw new Error("Invalid assessment result format");
      }

      // Update with results
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { 
            ...w, 
            status: "complete",
            assessmentResult: result,
            recordingUrl: recordingUrl
          } : w,
        ),
      );
    } catch (error) {
      console.error("Error processing word recording:", error);
      toast({
        title: "Assessment Error",
        description: "Could not analyze your pronunciation. Please try again.",
        variant: "destructive",
      });

      // Reset issue status on error
      setPronunciationIssues((issues) =>
        issues.map((w, idx) =>
          idx === wordIndex ? { ...w, status: "idle" } : w,
        ),
      );
    } finally {
      setIsProcessingWord(false);
      setIsRecording(false);
      setCurrentlyPracticing(null);
    }
  };

  // Stop recording the word
  const stopWordPractice = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Make sure we clean up streams even if recorder fails
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Play back user's recording with enhanced mobile compatibility
  const playUserRecording = async (wordIndex: number) => {
    const issue = pronunciationIssues[wordIndex];
    if (!issue?.recordingUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      // Enhanced audio element for mobile Safari compatibility
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      audio.onerror = (e) => {
        console.error('Recording playback error:', e);
        toast({
          title: "Playback Error",
          description: "Could not play your recording.",
          variant: "destructive",
        });
      };

      const playAudio = () => {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Recording playback started successfully');
          }).catch((error) => {
            console.error('Audio play promise rejected:', error);
            
            // Fallback for mobile browsers
            const fallbackAudio = new Audio(issue.recordingUrl || '');
            fallbackAudio.play().catch(fallbackError => {
              console.error('Fallback audio play failed:', fallbackError);
              toast({
                title: "Playback Error",
                description: "Could not play your recording.",
                variant: "destructive",
              });
            });
          });
        }
      };

      audio.oncanplay = playAudio;
      audio.onloadeddata = playAudio;
      
      audio.src = issue.recordingUrl || '';
      audio.load();
      audioRef.current = audio;
      
    } catch (error) {
      console.error("Error setting up recording playback:", error);
      toast({
        title: "Playback Error",
        description: "Could not play your recording.",
        variant: "destructive",
      });
    }
  };

  // Handle text-to-speech for pronunciation guide
  const handleTextToSpeech = async (wordIndex: number) => {
    const issue = pronunciationIssues[wordIndex];
    if (!issue) return;

    try {
      const isSlowMode = slowPlaybackWords[issue.id || issue.word];
      const speed = isSlowMode ? 0.7 : 1.0;

      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: issue.word,
          voice: "alloy",
          speed: speed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(error => {
        console.error("Error playing TTS:", error);
        toast({
          title: "Audio Error",
          description: "Could not play pronunciation guide.",
          variant: "destructive",
        });
      });

      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };


    } catch (error) {
      console.error("Error with text-to-speech:", error);
      toast({
        title: "Audio Error",
        description: "Could not generate pronunciation guide.",
        variant: "destructive",
      });
    }
  };

  // Toggle slow playback
  const toggleSlowPlayback = (issueId: string) => {
    setSlowPlaybackWords(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
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
          
            {/* Carousel for pronunciation issues */}
            <div className="embla overflow-hidden w-full max-w-7xl mx-auto" ref={emblaRef}>
              <div className="embla__container flex">
                {pronunciationIssues.map((issue, idx) => (
                  <div key={issue.id} className={`embla__slide flex-shrink-0 w-full sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] 2xl:w-[50%] px-4 sm:px-6 md:px-8 ${idx === currentCarouselIndex ? 'is-in-view' : ''}`}>
                    <Card className="h-full card-content" style={{ backgroundColor: '#1947E5' }}>
                      <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold text-white">{issue.word}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Recording Controls */}
                        <div className="flex justify-center gap-2">
                          {issue.status === "idle" && (
                            <Button
                              onClick={() => startWordPractice(idx)}
                              className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 font-bold text-base h-12 px-6"
                              disabled={isRecording || isProcessingWord}
                            >
                              <MicIcon className="h-5 w-5" />
                              Start Recording
                            </Button>
                          )}
                          
                          {issue.status === "recording" && (
                            <Button
                              onClick={() => stopWordPractice()}
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
                                onClick={() => startWordPractice(idx)}
                                className="flex items-center gap-2 bg-[#00C6AE] hover:bg-[#00B39E] text-white border-0 font-bold text-base h-12 px-6"
                              >
                                <RotateCw className="h-5 w-5" />
                                Try Again
                              </Button>
                              <Button
                                onClick={() => playUserRecording(idx)}
                                variant="outline"
                                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 h-12 px-6"
                              >
                                <VolumeIcon className="h-4 w-4" />
                                Listen to me
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Text-to-Speech and Slow Switch */}
                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={() => handleTextToSpeech(idx)}
                            variant="outline"
                            className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-white hover:bg-[#FF7F7C] h-10 px-4 py-2 flex items-center gap-2 bg-[#FF9692] border-0"
                          >
                            <Ear className="h-4 w-4" />
                            Hear
                          </Button>
                          <button
                            onClick={() => toggleSlowPlayback(issue.id || issue.word)}
                            className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              slowPlaybackWords[issue.id || issue.word] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                            }`}
                            role="switch"
                            aria-checked={slowPlaybackWords[issue.id || issue.word]}
                            aria-label="Toggle slow playback"
                          >
                            <span
                              className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                                slowPlaybackWords[issue.id || issue.word] ? 'translate-x-8' : 'translate-x-1'
                              }`}
                            >
                              <Snail className="w-3 h-3 text-gray-600" />
                            </span>
                          </button>
                        </div>

                        {/* Assessment Results */}
                        {issue.assessmentResult && (
                          <div className="text-center space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <Gauge className="h-5 w-5 text-white" />
                              <span className="text-lg font-semibold text-white">
                                {issue.assessmentResult.pronunciationScore.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    issue.assessmentResult && star <= Math.round(issue.assessmentResult.pronunciationScore / 20)
                                      ? "text-yellow-500 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Navigation */}
            {pronunciationIssues.length > 1 && (
              <div className="flex justify-center gap-4 mt-4">
                <Button
                  onClick={goToPrevious}
                  variant="outline"
                  disabled={currentCarouselIndex === 0}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 transition-all duration-300 hover:scale-105"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg">
                  <span className="font-semibold text-gray-700">{currentCarouselIndex + 1}</span>
                  <span className="text-gray-500">of</span>
                  <span className="font-semibold text-gray-700">{pronunciationIssues.length}</span>
                </span>
                <Button
                  onClick={goToNext}
                  variant="outline"
                  disabled={currentCarouselIndex === pronunciationIssues.length - 1}
                  className={`transition-all duration-300 hover:scale-105 ${
                    currentCarouselIndex === pronunciationIssues.length - 1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0'
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

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