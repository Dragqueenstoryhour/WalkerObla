import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { Star, Trophy, Clock, BarChart2, Flame } from 'lucide-react'; // Added Flame icon

const Account = () => {
  const { isAuthenticated, user, signOut } = useAuthContext(); // Destructure signOut
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userStats, setUserStats] = useState({
    totalPracticeMinutes: 0,
    pronunciationImprovement: 0,
    wordsLearned: 0,
    exercisesCompleted: 0,
    longestStreak: 0
  });

  useEffect(() => {
    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      navigate('/');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to view your account',
        variant: 'destructive',
      });
      return; // Stop execution if not authenticated
    }

    // --- START: Placeholder for API call to fetch real user stats ---
    // In a real application, you would make an API call here to fetch user-specific
    // statistics from your backend database (e.g., from tables related to user activity).
    // Example:
    // const fetchUserStats = async () => {
    //   try {
    //     const response = await fetch('/api/user/stats', {
    //       headers: {
    //         'Authorization': `Bearer ${user.token}` // Assuming you have a user token
    //       }
    //     });
    //     if (!response.ok) {
    //       throw new Error('Failed to fetch user stats');
    //     }
    //     const data = await response.json();
    //     setUserStats({
    //       totalPracticeMinutes: data.totalPracticeMinutes || 0,
    //       pronunciationImprovement: data.pronunciationImprovement || 0,
    //       wordsLearned: data.wordsLearned || 0,
    //       exercisesCompleted: data.exercisesCompleted || 0,
    //       longestStreak: data.longestStreak || 0
    //     });
    //   } catch (error) {
    //     console.error("Error fetching user stats:", error);
    //     toast({
    //       title: 'Error',
    //       description: 'Failed to load your progress.',
    //       variant: 'destructive',
    //     });
    //   }
    // };
    // fetchUserStats();
    // --- END: Placeholder for API call ---

    // For demonstration purposes, if you need to quickly see data while API is not connected,
    // uncomment the mock data below. Remember to remove it for production.
    // setUserStats({
    //   totalPracticeMinutes: 142,
    //   pronunciationImprovement: 28,
    //   wordsLearned: 87,
    //   exercisesCompleted: 32,
    //   longestStreak: 5
    // });

  }, [isAuthenticated, navigate, toast, signOut]); // Added signOut to dependency array

  const handleSignOut = () => {
    if (signOut) { // Ensure signOut function exists
      signOut();
      navigate('/'); // Redirect to home or login page after sign out
      toast({
        title: 'Signed Out',
        description: 'You have successfully signed out.',
      });
    }
  };

  if (!isAuthenticated || !user) {
    return null; // Don't render anything if not authenticated or user data is missing
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="shadow-md">
          <CardHeader className="bg-primary/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 border-2 border-primary rounded-full flex items-center justify-center bg-primary text-primary-foreground text-3xl">
                {(user.username || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>{user.username || 'User'}</CardTitle>
                <CardDescription>Joined {new Date().toLocaleDateString()}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span>{user.email || 'Not provided'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Membership:</span>
                <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded-full text-xs font-medium">
                  Free Plan
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4"> {/* Added gap-2 */}
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button> {/* Sign Out Button */}
            <Button variant="outline" size="sm">Edit Profile</Button>
          </CardFooter>
        </Card>

        {/* Stats Card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              Your speech and pronunciation improvement journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Practice Time */}
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Practice Time</span>
                    <span className="font-medium">{userStats.totalPracticeMinutes} minutes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(userStats.totalPracticeMinutes/300 * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Pronunciation Improvement */}
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <BarChart2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pronunciation Improvement</span>
                    <span className="font-medium">+{userStats.pronunciationImprovement}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${userStats.pronunciationImprovement}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Words Learned */}
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Words Learned</span>
                    <span className="font-medium">{userStats.wordsLearned}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(userStats.wordsLearned/100 * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Exercises Completed */}
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-full">
                  <Trophy className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Exercises Completed</span>
                    <span className="font-medium">{userStats.exercisesCompleted}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(userStats.exercisesCompleted/50 * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Longest Streak - NEWLY ADDED */}
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <Flame className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Longest Streak</span>
                    <span className="font-medium">{userStats.longestStreak} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(userStats.longestStreak/10 * 100, 100)}%` }}></div> {/* Example progress bar for streak */}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Card */}
        <Card className="md:col-span-2 bg-gradient-to-r from-primary/5 to-primary/20 border-primary/20">
          <CardHeader>
            <CardTitle>Upgrade to Premium</CardTitle>
            <CardDescription>
              Unlock advanced features to accelerate your speaking skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-lg mb-2">Advanced Speech Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Get detailed feedback on intonation, rhythm, and stress patterns
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-lg mb-2">Unlimited Practice</h3>
                <p className="text-muted-foreground text-sm">
                  Remove daily limits and practice as much as you want
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-lg mb-2">Personalized Routines</h3>
                <p className="text-muted-foreground text-sm">
                  AI-generated practice routines tailored to your needs
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/subscription">
              <Button className="w-full md:w-auto">
                Upgrade Now
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Account;