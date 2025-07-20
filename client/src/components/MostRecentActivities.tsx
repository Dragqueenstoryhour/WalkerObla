import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Book, MessageSquare, BookOpen, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { getAuthHeaders } from '@/lib/supabaseClient';

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
  source: string | null;
  metadata: any;
  createdAt: string;
}

interface RecentActivitiesResponse {
  activities: Activity[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface MostRecentActivitiesProps {
  className?: string;
}

interface PronunciationFeedback {
  totalActivities: number;
  averageScore: number;
  averageAccuracy: number;
  averageFluency: number;
  improvement: string;
  strengths: string[];
  areasForImprovement: string[];
  suggestions?: string[];
  practicePrompt?: {
    question: string;
    problemSound: string;
  };
}

const getActivityTypeColor = (activityType: string) => {
  switch (activityType) {
    case 'word_practice':
      return 'bg-blue-500 text-white';
    case 'phrase_practice':
      return 'bg-purple-500 text-white';
    case 'reading_session':
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getActivityTypeIcon = (activityType: string) => {
  switch (activityType) {
    case 'word_practice':
      return <Book className="h-3 w-3" />;
    case 'phrase_practice':
      return <MessageSquare className="h-3 w-3" />;
    case 'reading_session':
      return <BookOpen className="h-3 w-3" />;
    default:
      return <Book className="h-3 w-3" />;
  }
};

const getActivityTypeLabel = (activityType: string) => {
  switch (activityType) {
    case 'word_practice':
      return 'Words';
    case 'phrase_practice':
      return 'Phrases';
    case 'reading_session':
      return 'Reading';
    default:
      return 'Unknown';
  }
};

const getScoreColor = (score: number | null) => {
  if (score === null) return 'text-gray-500';
  if (score >= 90) return 'text-green-600 font-semibold';
  if (score >= 75) return 'text-blue-600 font-semibold';
  if (score >= 60) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
};

export function MostRecentActivities({ className }: MostRecentActivitiesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  const limit = 10;

  const { data: recentActivitiesResponse, isLoading, error } = useQuery<{success: boolean, data: RecentActivitiesResponse}>({
    queryKey: ['/api/user/recent-activities', currentPage, limit],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/user/recent-activities?page=${currentPage}&limit=${limit}`, {
        headers: authHeaders,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recent activities');
      }
      return response.json();
    }
  });

  // Unwrap the data from the backend response
  const recentActivities = recentActivitiesResponse?.data;

  const { data: feedbackResponse, isLoading: feedbackLoading } = useQuery<{success: boolean, data: PronunciationFeedback}>({
    queryKey: ['/api/user/pronunciation-feedback'],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/user/pronunciation-feedback', {
        headers: authHeaders,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch pronunciation feedback');
      }
      return response.json();
    },
    enabled: !isLoading && (recentActivities?.activities?.length ?? 0) > 0
  });

  // Unwrap the feedback data from the backend response
  const feedback = feedbackResponse?.data;

  const handlePrevPage = () => {
    if (recentActivities?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (recentActivities?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePracticePrompt = (problemSound: string) => {
    // Navigate to Words page with the problem sound as a search parameter
    setLocation(`/words?focus=${encodeURIComponent(problemSound)}`);
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Most Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Most Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load recent activities</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Most Recent Activities</CardTitle>
        <p className="text-sm text-gray-600">
          Your latest practice sessions and scores
        </p>
      </CardHeader>
      <CardContent>
        {/* AI-Powered Feedback Section */}
        {feedback && !feedbackLoading && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Feedback</h3>
            </div>
            
            {/* Feedback Content */}
            <div className="space-y-3 mb-4">
              {/* Improvement Status */}
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">{feedback.improvement}</p>
              </div>
              
              {/* Strengths */}
              {feedback.strengths && feedback.strengths.length > 0 && 
                feedback.strengths.map((strength, index) => (
                  <div key={`strength-${index}`} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">✅ {strength}</p>
                  </div>
                ))
              }
              
              {/* Areas for Improvement */}
              {feedback.areasForImprovement && feedback.areasForImprovement.length > 0 && 
                feedback.areasForImprovement.map((area, index) => (
                  <div key={`improvement-${index}`} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">📈 {area}</p>
                  </div>
                ))
              }
              
              {/* Additional suggestions if provided */}
              {feedback.suggestions && feedback.suggestions.length > 0 && 
                feedback.suggestions.map((suggestion, index) => (
                  <div key={`suggestion-${index}`} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{suggestion}</p>
                  </div>
                ))
              }
            </div>

            {/* Practice Prompt */}
            {feedback.practicePrompt && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-300">
                <p className="text-sm text-gray-800 mb-3">{feedback.practicePrompt.question}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handlePracticePrompt(feedback.practicePrompt!.problemSound)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-600 border-gray-300"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    No thanks
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading state for feedback */}
        {feedbackLoading && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-600">Feedback</h3>
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {(recentActivities?.activities?.length ?? 0) === 0 ? (
          <p className="text-gray-500 text-center py-8">No activities yet. Start practicing to see your progress!</p>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 font-semibold text-sm text-gray-700 border-b pb-2 mb-3">
              <div className="col-span-3">Activity Type</div>
              <div className="col-span-6">Content</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-1">Date</div>
            </div>

            {/* Activity Rows */}
            <div className="space-y-2">
              {recentActivities?.activities?.map((activity) => (
                <div key={activity.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="col-span-3">
                    <Badge 
                      className={`${getActivityTypeColor(activity.activityType)} flex items-center gap-1 text-xs`}
                    >
                      {getActivityTypeIcon(activity.activityType)}
                      {getActivityTypeLabel(activity.activityType)}
                    </Badge>
                  </div>
                  
                  <div className="col-span-6">
                    <p className="text-sm text-gray-800" title={activity.itemPracticed}>
                      {truncateText(activity.itemPracticed)}
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`text-sm ${getScoreColor(activity.score)}`}>
                      {activity.score !== null ? `${Math.round(activity.score)}%` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500">
                      {format(new Date(activity.createdAt), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {recentActivities && recentActivities.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Page {recentActivities.currentPage} of {recentActivities.totalPages} 
                  ({recentActivities.totalCount} total activities)
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!recentActivities.hasPrevPage}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!recentActivities.hasNextPage}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}