import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Clock, Target, TrendingUp, Award, BookOpen, Mic, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

interface UserStats {
  totalWordsPracticed: number;
  totalPhrasesPracticed: number;
  totalReadingSessions: number;
  totalPracticeTime: number;
  averagePronunciationScore: number | null;
  averageAccuracyScore: number | null;
  averageFluencyScore: number | null;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
}

interface RecentActivity {
  id: number;
  activityType: string;
  itemPracticed: string;
  score: number | null;
  difficulty: string | null;
  source: string | null;
  createdAt: string;
}

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Handle stats error
  useEffect(() => {
    if (statsError && isUnauthorizedError(statsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [statsError, toast]);

  if (authLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const stats: UserStats = statsData?.stats || {
    totalWordsPracticed: 0,
    totalPhrasesPracticed: 0,
    totalReadingSessions: 0,
    totalPracticeTime: 0,
    averagePronunciationScore: null,
    averageAccuracyScore: null,
    averageFluencyScore: null,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
  };

  const recentActivities: RecentActivity[] = statsData?.recentActivities || [];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'word_practice':
        return <Mic className="h-4 w-4" />;
      case 'phrase_practice':
        return <Volume2 className="h-4 w-4" />;
      case 'reading_session':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'word_practice':
        return 'Word Practice';
      case 'phrase_practice':
        return 'Phrase Practice';
      case 'reading_session':
        return 'Reading Session';
      default:
        return 'Practice';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
          <AvatarFallback className="text-xl">
            {getInitials(user?.firstName, user?.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">
            {user?.firstName || user?.lastName 
              ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
              : user?.email || 'User'
            }
          </h1>
          <p className="text-muted-foreground">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">Level {user?.level || 1}</Badge>
            <Badge variant="outline">{user?.xp || 0} XP</Badge>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Words Practiced</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWordsPracticed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phrases Practiced</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPhrasesPracticed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Sessions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReadingSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalPracticeTime)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Average Scores
            </CardTitle>
            <CardDescription>Your pronunciation assessment averages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.averagePronunciationScore !== null ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pronunciation</span>
                    <span>{stats.averagePronunciationScore}%</span>
                  </div>
                  <Progress value={stats.averagePronunciationScore} className="h-2" />
                </div>

                {stats.averageAccuracyScore !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Accuracy</span>
                      <span>{stats.averageAccuracyScore}%</span>
                    </div>
                    <Progress value={stats.averageAccuracyScore} className="h-2" />
                  </div>
                )}

                {stats.averageFluencyScore !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fluency</span>
                      <span>{stats.averageFluencyScore}%</span>
                    </div>
                    <Progress value={stats.averageFluencyScore} className="h-2" />
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No assessment data yet. Start practicing to see your scores!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Streak Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Practice Streaks
            </CardTitle>
            <CardDescription>Your consistency in practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Streak</span>
              <Badge variant={stats.currentStreak > 0 ? "default" : "secondary"}>
                {stats.currentStreak} days
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Longest Streak</span>
              <Badge variant="outline">{stats.longestStreak} days</Badge>
            </div>
            {stats.lastPracticeDate && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Last practice: {new Date(stats.lastPracticeDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest practice sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.activityType)}
                      <div>
                        <p className="font-medium">{activity.itemPracticed}</p>
                        <p className="text-sm text-muted-foreground">
                          {getActivityTypeLabel(activity.activityType)}
                          {activity.difficulty && ` • ${activity.difficulty}`}
                          {activity.source && ` • ${activity.source}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.score !== null && (
                        <p className="font-medium">{activity.score}%</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {index < recentActivities.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}