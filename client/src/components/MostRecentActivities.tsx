import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Book, MessageSquare, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

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
  const limit = 10;

  const { data: recentActivities, isLoading, error } = useQuery<RecentActivitiesResponse>({
    queryKey: ['/api/user/recent-activities', currentPage, limit],
    queryFn: async () => {
      const response = await fetch(`/api/user/recent-activities?page=${currentPage}&limit=${limit}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recent activities');
      }
      return response.json();
    }
  });

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
        {recentActivities?.activities.length === 0 ? (
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
              {recentActivities?.activities.map((activity) => (
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