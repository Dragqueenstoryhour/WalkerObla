import { useState, useEffect } from 'react';
import { useAuth, AuthUser } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { Star, Trophy, Clock, BarChart2 } from 'lucide-react';

const Account = () => {
  const { isAuthenticated, user } = useAuth();
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
    }
    
    // Mock stats for now - in a real app these would come from an API call
    setUserStats({
      totalPracticeMinutes: 142,
      pronunciationImprovement: 28,
      wordsLearned: 87,
      exercisesCompleted: 32,
      longestStreak: 5
    });
  }, [isAuthenticated, navigate, toast]);

  if (!isAuthenticated || !user) {
    return null; // Don't render anything if not authenticated
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
          <CardFooter className="flex justify-end border-t pt-4">
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