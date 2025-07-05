import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Volume2, Shuffle, BookOpen, MicIcon, StopCircleIcon, Ear, Snail, RotateCw, BookmarkIcon, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CombinedLineChart } from '@/components/CombinedLineChart'; // Import the chart component
import { MostRecentActivities } from '@/components/MostRecentActivities';
import { CalendarDays, Users } from 'lucide-react';

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

// AssignmentCarousel Component - similar to PracticeCarousel but specialized for assignments
function AssignmentCarousel({ items, assignmentId }: { items: AssignmentItem[], assignmentId: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [currentlyPracticing, setCurrentlyPracticing] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const recordAssignmentResultMutation = useMutation({
    mutationFn: async (resultData: any) => {
      const response = await fetch(`/api/assignments/${assignmentId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData),
      });
      if (!response.ok) throw new Error('Failed to record assignment result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignmentId] });
    },
  });

  const handlePracticeComplete = async (index: number, assessmentResult: any) => {
    const item = items[index];
    
    if (!item || !assessmentResult) return;

    try {
      // Record the assignment result
      await recordAssignmentResultMutation.mutateAsync({
        itemId: item.id,
        pronunciationScore: assessmentResult.pronunciationScore,
        accuracyScore: assessmentResult.accuracyScore,
        fluencyScore: assessmentResult.fluencyScore,
        completenessScore: assessmentResult.completenessScore,
        detailedResults: assessmentResult,
      });

      // Update the processed item status
      setProcessedItems(prev => prev.map((p, i) => 
        i === index ? { ...p, status: "complete", assessmentResult } : p
      ));

      toast({
        title: "Practice Complete!",
        description: `Score: ${Math.round(assessmentResult.pronunciationScore)}%`,
      });

    } catch (error) {
      console.error("Error recording assignment result:", error);
      toast({
        title: "Error",
        description: "Failed to save practice result",
        variant: "destructive",
      });
    }
  };

  if (processedItems.length === 0) {
    return <div className="text-center py-8 text-gray-500">No items in this assignment</div>;
  }

  return (
    <Card className="shadow-lg border-0" style={{ backgroundColor: '#ffffff' }}>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-purple-800 mb-2">
            Assignment Practice
          </h3>
          <div className="flex justify-center items-center gap-2">
            <span className="text-sm text-gray-600">
              {currentIndex + 1} of {processedItems.length}
            </span>
          </div>
        </div>

        {/* Current Item Display */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-purple-800 mb-4">
            {processedItems[currentIndex]?.text}
          </div>
          
          {processedItems[currentIndex]?.syllabication && (
            <div className="text-lg text-gray-600 mb-2">
              {processedItems[currentIndex].syllabication}
            </div>
          )}

          {processedItems[currentIndex]?.phonetic && (
            <div className="text-sm text-gray-500 mb-4">
              /{processedItems[currentIndex].phonetic}/
            </div>
          )}

          {/* Practice Button */}
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            onClick={() => setCurrentlyPracticing(currentIndex)}
            disabled={currentlyPracticing === currentIndex}
          >
            {currentlyPracticing === currentIndex ? (
              <>
                <MicIcon className="h-5 w-5 mr-2 animate-pulse" />
                Practicing...
              </>
            ) : (
              <>
                <MicIcon className="h-5 w-5 mr-2" />
                Practice
              </>
            )}
          </Button>

          {/* Status Indicator */}
          {processedItems[currentIndex]?.status === "complete" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Completed!</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        {processedItems.length > 1 && (
          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
              variant="outline"
              disabled={currentIndex === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, processedItems.length - 1))}
              variant="outline"
              disabled={currentIndex === processedItems.length - 1}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AssignmentsTab Component
function AssignmentsTab() {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentItems, setAssignmentItems] = useState<AssignmentItem[]>([]);
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
                {assignment.therapistName} homework - {formatDate(assignment.createdAt)}
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
        <div className="mt-8">
          <h3 className="text-xl font-bold text-purple-800 mb-4">
            Practice: {selectedAssignment.title}
          </h3>
          <AssignmentCarousel 
            items={assignmentItems} 
            assignmentId={selectedAssignment.id}
          />
        </div>
      )}
    </div>
  );
}

// Practice Carousel Component (minimal implementation)
function PracticeCarousel({
  items,
  currentIndex,
  onNext,
  onPrevious,
  onShuffle,
  title,
  color,
  emptyMessage,
}: {
  items: ProcessedItem[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  title: string;
  color: string;
  emptyMessage: string;
}) {
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
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color }}>{title}</h3>
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">{items[currentIndex]?.text}</div>
          <div className="flex justify-center gap-4">
            <Button onClick={onPrevious} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-4">
              {currentIndex + 1} of {items.length}
            </span>
            <Button onClick={onNext} disabled={currentIndex === items.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
            <PracticeCarousel
              items={shuffledWords}
              currentIndex={currentWordIndex}
              onNext={() => setCurrentWordIndex(prev => Math.min(prev + 1, shuffledWords.length - 1))}
              onPrevious={() => setCurrentWordIndex(prev => Math.max(prev - 1, 0))}
              onShuffle={() => {
                const shuffled = [...shuffledWords].sort(() => Math.random() - 0.5);
                setShuffledWords(shuffled);
                setCurrentWordIndex(0);
              }}
              title="Practice Words"
              color="#1947e5"
              emptyMessage="No saved words yet"
            />

            {/* Practice Phrases Carousel */}
            <PracticeCarousel
              items={shuffledPhrases}
              currentIndex={currentPhraseIndex}
              onNext={() => setCurrentPhraseIndex(prev => Math.min(prev + 1, shuffledPhrases.length - 1))}
              onPrevious={() => setCurrentPhraseIndex(prev => Math.max(prev - 1, 0))}
              onShuffle={() => {
                const shuffled = [...shuffledPhrases].sort(() => Math.random() - 0.5);
                setShuffledPhrases(shuffled);
                setCurrentPhraseIndex(0);
              }}
              title="Practice Phrases"
              color="#1947e5"
              emptyMessage="No saved phrases yet"
            />

            {/* Practice Readings Carousel */}
            <PracticeCarousel
              items={shuffledReadings}
              currentIndex={currentReadingIndex}
              onNext={() => setCurrentReadingIndex(prev => Math.min(prev + 1, shuffledReadings.length - 1))}
              onPrevious={() => setCurrentReadingIndex(prev => Math.max(prev - 1, 0))}
              onShuffle={() => {
                const shuffled = [...shuffledReadings].sort(() => Math.random() - 0.5);
                setShuffledReadings(shuffled);
                setCurrentReadingIndex(0);
              }}
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