import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, User, CheckCircle, ChevronLeft, ChevronRight, Mic, Volume2, Eye, Snail, Ear, Flag } from 'lucide-react';
import { SimpleRecorder } from '@/components/SimpleRecorder';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { getAuthHeaders } from '@/lib/supabaseClient';
import useEmblaCarousel from 'embla-carousel-react';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  therapistName: string;
  dueDate?: string;
  progress: {
    totalItems: number;
    completedItems: number;
    averageScore: number;
  };
}

interface AssignmentItem {
  id: number;
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
}

const AssignmentPractice: React.FC = () => {
  const [match, params] = useRoute('/assignments/:id');
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [itemAttempts, setItemAttempts] = useState<Record<number, number>>({});
  const [itemBestScores, setItemBestScores] = useState<Record<number, number>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });

  // Audio and interaction states
  const [slowPlaybackItems, setSlowPlaybackItems] = useState<Record<number, boolean>>({});
  const [audioPlaying, setAudioPlaying] = useState<number | null>(null);

  const assignmentId = params?.id ? parseInt(params.id) : null;
  
  console.log(`🔍 AssignmentPractice loaded:`, { 
    assignmentId, 
    isAuthenticated, 
    params 
  });

  // Fetch assignment details
  const { data: assignment, isLoading: assignmentLoading, error: assignmentError } = useQuery({
    queryKey: [`/api/assignments/${assignmentId}`],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch assignment`);
      }
      const data = await response.json();
      return data.data as Assignment & { items: AssignmentItem[] };
    },
    enabled: !!assignmentId && isAuthenticated,
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const items = assignment?.items || [];
  const currentItem = items[currentItemIndex];
  const progressPercentage = ((completedItems.size / items.length) * 100) || 0;
  const isLastItem = currentItemIndex === items.length - 1;
  const canFinish = completedItems.size === items.length && !showSummary;

  // Handle item completion
  const handleItemComplete = async (itemId: number, score: number) => {
    console.log(`🎯 Assignment item completed: ${itemId} with score ${score}`);
    
    // Update attempt count
    const currentAttempts = itemAttempts[itemId] || 0;
    const newAttempts = currentAttempts + 1;
    setItemAttempts(prev => ({ ...prev, [itemId]: newAttempts }));
    
    // Update best score
    const currentBestScore = itemBestScores[itemId] || 0;
    const newBestScore = Math.max(currentBestScore, score);
    setItemBestScores(prev => ({ ...prev, [itemId]: newBestScore }));
    
    try {
      // Save result to server
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/assignments/${assignmentId}/results`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          itemId,
          pronunciationScore: score,
          attemptCount: newAttempts,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save assignment result');
      } else {
        console.log('✅ Assignment result saved successfully');
      }
    } catch (error) {
      console.error('Error saving assignment result:', error);
    }

    // Mark as completed and auto-advance after 3 attempts or if score is good
    const shouldAutoAdvance = newAttempts >= 3 || score >= 80;
    
    if (shouldAutoAdvance) {
      setCompletedItems(prev => new Set([...prev, itemId]));
      
      // Wait 3 seconds before auto-advancing
      setTimeout(() => {
        const nextIncompleteIndex = items.findIndex(
          (item, index) => index > currentItemIndex && !completedItems.has(item.id) && item.id !== itemId
        );
        
        if (nextIncompleteIndex !== -1) {
          setCurrentItemIndex(nextIncompleteIndex);
          if (emblaApi) emblaApi.scrollTo(nextIncompleteIndex);
        } else if (completedItems.size + 1 >= items.length) {
          // Assignment completed!
          toast({
            title: "🎉 Assignment Complete!",
            description: `Great job! You've completed "${assignment?.title}"`,
          });
        }
      }, 3000);
    }
  };

  // Audio functions
  const handleTextToSpeech = async (text: string, itemId: number, slow: boolean = false) => {
    try {
      setAudioPlaying(itemId);
      console.log(`🔊 Playing "${text}" at ${slow ? 'SLOW' : 'NORMAL'} speed`);
      
      const authHeaders = await getAuthHeaders();
      
      // Use SSML approach like Words.tsx and Phrases.tsx for consistent speed control
      let ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
      ssmlText += `<voice name="en-US-AvaNeural">`;
      
      if (slow) {
        // Use SSML prosody rate to slow down - Azure uses "slow" or decimal values
        ssmlText += `<prosody rate="0.6">`;
        ssmlText += text;
        ssmlText += `</prosody>`;
      } else {
        ssmlText += text;
      }
      ssmlText += `</voice>`;
      ssmlText += `</speak>`;
      
      const response = await fetch('/api/pronunciation/synthesize', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ssml: ssmlText
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => {
          setAudioPlaying(null);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('TTS error:', error);
      setAudioPlaying(null);
    }
  };

  const toggleSlowPlayback = (itemId: number) => {
    setSlowPlaybackItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (emblaApi) emblaApi.scrollPrev();
  };

  const goToNext = () => {
    if (emblaApi) emblaApi.scrollNext();
  };

  // Sync carousel with current index
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        const newIndex = emblaApi.selectedScrollSnap();
        // Only update if not auto-advancing from completion
        if (!showSummary) {
          setCurrentItemIndex(newIndex);
        }
      });
    }
  }, [emblaApi, showSummary]);

  // Handle finish assignment
  const handleFinishAssignment = () => {
    setIsFinishing(true);
    setShowSummary(true);
    
    toast({
      title: "🎉 Assignment Complete!",
      description: `Excellent work! You've completed "${assignment?.title}"`,
    });
    
    setTimeout(() => {
      setIsFinishing(false);
    }, 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
            <p>You need to be signed in to access assignments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (assignmentError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Assignment Error</h2>
            <p className="mb-4 text-red-600">
              {assignmentError.message || 'Failed to load assignment'}
            </p>
            <p className="mb-4 text-gray-600">
              Please check your connection and try again, or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Link href="/my-words">
                <Button className="w-full">Back to My Words</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignment && !assignmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Assignment Not Found</h2>
            <p className="mb-4">The assignment you're looking for doesn't exist or you don't have access to it.</p>
            <Link href="/my-words">
              <Button>Back to My Words</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/my-words">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Words
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{assignment.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {assignment.therapistName}
                  </div>
                  {assignment.dueDate && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Progress: {completedItems.size} / {items.length}
              </div>
              <Progress value={progressPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">No Items in Assignment</h2>
              <p>This assignment doesn't contain any practice items yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assignment Progress</h3>
                <div className="text-sm text-gray-600">
                  {completedItems.size} / {items.length} completed
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {items.map((item, index) => (
                  <Button
                    key={item.id}
                    variant={index === currentItemIndex ? "default" : "outline"}
                    size="sm"
                    className="justify-start relative h-8"
                    onClick={() => {
                      if (!showSummary) {
                        setCurrentItemIndex(index);
                        if (emblaApi) emblaApi.scrollTo(index);
                      }
                    }}
                  >
                    {completedItems.has(item.id) && (
                      <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                    )}
                    <span className="truncate text-xs">{item.content}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentItemIndex === 0 || showSummary}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                {currentItemIndex + 1} of {items.length}
              </div>
              
              {canFinish ? (
                <Button
                  onClick={handleFinishAssignment}
                  disabled={isFinishing}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isFinishing ? (
                    <>Finishing...</>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Finish
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={goToNext}
                  disabled={currentItemIndex === items.length - 1 || showSummary}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Words.tsx-style Carousel */}
            {!showSummary && (
              <div className="flex justify-center">
                <div className="embla w-full max-w-lg" ref={emblaRef}>
                  <div className="embla__container flex">
                    {items.map((item, index) => (
                    <div key={item.id} className="embla__slide flex-[0_0_100%] px-2">
                      <Card 
                        className="h-full shadow-lg border-0 min-h-[600px]" 
                        style={{ backgroundColor: '#1947e5' }}
                      >
                        <CardHeader className="text-center">
                          <CardTitle className="text-3xl font-bold text-white">
                            {item.content}
                          </CardTitle>
                          {item.syllabication && (
                            <div className="text-lg italic mt-2">
                              <span className="text-white/80">{item.syllabication}</span>
                            </div>
                          )}
                          {item.phonetic && (
                            <div className="text-lg text-white/80 mt-1">
                              {item.phonetic}
                            </div>
                          )}
                          {item.definition && (
                            <div className="text-base text-white/80 mt-3 max-w-md mx-auto">
                              <strong>Definition:</strong> {item.definition}
                            </div>
                          )}
                          {completedItems.has(item.id) && (
                            <div className="flex items-center justify-center text-green-300 mt-2">
                              <CheckCircle className="w-5 h-5 mr-1" />
                              Completed
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="space-y-4 px-6">
                          {/* Recording Control */}
                          <div className="flex justify-center">
                            <SimpleRecorder
                              referenceText={item.content}
                              contentId={item.id}
                              onAssessmentReceived={(assessment) => {
                                if (assessment.pronunciationScore) {
                                  handleItemComplete(item.id, assessment.pronunciationScore);
                                  const attempts = (itemAttempts[item.id] || 0) + 1;
                                  const isMaxAttempts = attempts >= 3;
                                  toast({
                                    title: isMaxAttempts ? "Moving to next word!" : "Great job!",
                                    description: isMaxAttempts 
                                      ? `Final attempt: ${assessment.pronunciationScore}% on "${item.content}"`
                                      : `You scored ${assessment.pronunciationScore}% on "${item.content}" (Attempt ${attempts}/3)`,
                                  });
                                }
                              }}
                            />
                          </div>

                          {/* Control Buttons Row */}
                          <div className="flex justify-center gap-3">
                            {/* Hear Button */}
                            <Button
                              onClick={() => handleTextToSpeech(item.content, item.id, slowPlaybackItems[item.id])}
                              disabled={audioPlaying === item.id}
                              className="h-10 px-4 bg-[#FF9692] hover:bg-[#FF7F7C] text-white border-0"
                            >
                              <Ear className="h-4 w-4 mr-1" />
                              Hear
                            </Button>

                            {/* Snail Toggle Switch */}
                            <button
                              onClick={() => toggleSlowPlayback(item.id)}
                              className={`relative inline-flex h-10 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                slowPlaybackItems[item.id] ? 'bg-[#FFE8E8]' : 'bg-gray-300'
                              }`}
                              role="switch"
                              aria-checked={slowPlaybackItems[item.id]}
                            >
                              <span className={`inline-flex h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ease-in-out items-center justify-center ${
                                slowPlaybackItems[item.id] ? 'translate-x-8' : 'translate-x-1'
                              }`}>
                                <Snail className="h-3 w-3 text-gray-600" />
                              </span>
                            </button>

                            {/* See Button */}
                            <Button
                              onClick={() => {
                                toast({
                                  title: "Animation feature coming soon!",
                                  description: "Facial animation will be available in a future update.",
                                });
                              }}
                              className="h-10 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white border-0"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              See
                            </Button>
                          </div>

                          {/* Progress Info */}
                          {(itemAttempts[item.id] > 0 || itemBestScores[item.id] > 0) && (
                            <div className="text-center text-sm text-white/80">
                              Attempts: {itemAttempts[item.id] || 0}/3
                              {itemBestScores[item.id] > 0 && (
                                <span className="ml-2">Best score: {itemBestScores[item.id].toFixed(1)}%</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showSummary && (
              <Card 
                className="h-full shadow-lg border-0 min-h-[600px]" 
                style={{ backgroundColor: '#1947e5' }}
              >
                <CardHeader className="text-center text-white pb-4 relative overflow-hidden">
                  <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 relative z-10">
                    <CheckCircle className="w-6 h-6" />
                    Assignment Complete!
                  </CardTitle>
                  <p className="text-white/90 mt-2 text-base relative z-10">
                    Excellent work on "{assignment?.title}"
                  </p>
                  
                  {/* Celebratory particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                    <div className="absolute top-8 right-6 w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping"></div>
                    <div className="absolute top-6 right-1/4 w-1 h-1 bg-white/80 rounded-full animate-pulse"></div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 px-6">
                  {/* Performance Summary */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-[#1947e5]">
                        {Object.values(itemBestScores).length > 0 
                          ? Math.round(Object.values(itemBestScores).reduce((a, b) => a + b, 0) / Object.values(itemBestScores).length)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-600">Avg Score</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-[#1947e5]">
                        {completedItems.size}
                      </div>
                      <div className="text-xs text-gray-600">Words Completed</div>
                    </div>
                  </div>
                  
                  {/* Words that need more practice */}
                  {Object.entries(itemBestScores).filter(([_, score]) => score < 70).length > 0 && (
                    <div className="w-full p-3 bg-white rounded-lg">
                      <h4 className="text-sm font-semibold text-[#1947e5] mb-2">Words to Practice More:</h4>
                      <div className="space-y-1">
                        {Object.entries(itemBestScores)
                          .filter(([_, score]) => score < 70)
                          .map(([itemId, score]) => {
                            const item = items.find(i => i.id.toString() === itemId);
                            return item ? (
                              <div key={itemId} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                                <span className="text-sm font-medium">{item.content}</span>
                                <span className="text-sm text-red-600">{score.toFixed(1)}%</span>
                              </div>
                            ) : null;
                          })
                        }
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-4">
                    <Link href="/my-words">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Assignments
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentPractice;