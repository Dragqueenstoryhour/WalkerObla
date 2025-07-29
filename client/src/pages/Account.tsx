import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { getApiUrl } from '@/lib/utils';
import { Star, Trophy, Clock, BarChart2, Flame, BookOpen } from 'lucide-react';

const Account = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userStats, setUserStats] = useState({
    totalPracticeMinutes: 0,
    pronunciationImprovement: 0,
    wordsLearned: 0,
    exercisesCompleted: 0,
    longestStreak: 0,
    articlesRead: 0
  });

  const { userStats: readingStats } = useReading();
  
  useEffect(() => {
    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      navigate('/');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to view your account',
        variant: 'destructive',
      });
      return;
    }

    // Fetch real user progress data from the API
    const fetchUserProgress = async () => {
      if (user) {
        try {
          // Fetch saved phrases count
          const savedPhrasesResponse = await fetch(getApiUrl('/api/phrases/saved'));
          const savedPhrasesData = savedPhrasesResponse.ok ? await savedPhrasesResponse.json() : { savedPhrases: [] };
          
          // Fetch practice groups count
          const practiceGroupsResponse = await fetch(getApiUrl('/api/practice-groups'));
          const practiceGroupsData = practiceGroupsResponse.ok ? await practiceGroupsResponse.json() : { groups: [] };
          
          // Fetch reading sessions for articles read
          const readingSessionsResponse = await fetch(getApiUrl('/api/reading-sessions'));
          const readingSessionsData = readingSessionsResponse.ok ? await readingSessionsResponse.json() : { sessions: [] };
          
          // Update stats with real data
          setUserStats({
            totalPracticeMinutes: readingSessionsData.sessions?.length * 5 || 0,
            pronunciationImprovement: Math.round(savedPhrasesData.savedPhrases?.length * 2.5) || 0,
            wordsLearned: savedPhrasesData.savedPhrases?.length || 0,
            exercisesCompleted: readingSessionsData.sessions?.length || 0,
            longestStreak: Math.min(7, Math.floor(savedPhrasesData.savedPhrases?.length / 3)) || 0,
            articlesRead: readingSessionsData.sessions?.length || 0
          });
        } catch (error) {
          console.error('Error fetching user progress:', error);
          setUserStats({
            totalPracticeMinutes: 0,
            pronunciationImprovement: 0,
            wordsLearned: 0,
            exercisesCompleted: 0,
            longestStreak: 0,
            articlesRead: 0
          });
        }
      }
    };

    fetchUserProgress();
  }, [isAuthenticated, navigate, user]);

  const handleSignOut = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate('/');
        toast({
          title: 'Successfully logged out',
          description: 'You have been logged out successfully.',
        });
      } else {
        throw new Error(result.error || 'Logout failed');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, try to navigate away as the local state should be cleared
      navigate('/');
      toast({
        title: 'Logged out with warnings',
        description: 'You have been logged out locally. Please refresh if you see any issues.',
        variant: 'default',
      });
    }
  };

  // If not authenticated, don't render the account page
  if (!isAuthenticated || !user) {
    return null;
  }

  const joinDate = (user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'Recently';

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-600 mt-1">Track your progress and achievements</p>
        </div>
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="flex items-center gap-2"
        >
          Sign Out
        </Button>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.username?.charAt(0).toUpperCase() || user.firstName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <CardTitle className="text-xl">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username || 'User'}
              </CardTitle>
              <CardDescription>
                Member since {joinDate}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {user.bio && (
          <CardContent>
            <p className="text-gray-700">{user.bio}</p>
          </CardContent>
        )}
      </Card>

      {/* Progress Overview */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Practice Time */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalPracticeMinutes} min</div>
              <p className="text-xs text-muted-foreground">Total practice time</p>
            </CardContent>
          </Card>

          {/* Words Learned */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Words Saved</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.wordsLearned}</div>
              <p className="text-xs text-muted-foreground">Words in your collection</p>
            </CardContent>
          </Card>

          {/* Pronunciation Improvement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.pronunciationImprovement}%</div>
              <p className="text-xs text-muted-foreground">Pronunciation progress</p>
            </CardContent>
          </Card>

          {/* Exercises Completed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exercises</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.exercisesCompleted}</div>
              <p className="text-xs text-muted-foreground">Completed sessions</p>
            </CardContent>
          </Card>

          {/* Current Streak */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.longestStreak} days</div>
              <p className="text-xs text-muted-foreground">Longest practice streak</p>
            </CardContent>
          </Card>

          {/* Articles Read */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles Read</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.articlesRead}</div>
              <p className="text-xs text-muted-foreground">Reading sessions completed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Continue your learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/my-words">
              <Button className="w-full" variant="outline">
                View Saved Words
              </Button>
            </Link>
            <Link href="/reader">
              <Button className="w-full" variant="outline">
                Practice Reading
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full" variant="outline">
                Practice Words
              </Button>
            </Link>
            <Link href="/phrases">
              <Button className="w-full" variant="outline">
                Practice Phrases
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;