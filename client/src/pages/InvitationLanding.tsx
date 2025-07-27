import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Users, Star, Target, Award, Clock, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';

interface InvitationDetails {
  therapistName: string;
  clientEmail: string;
  expiresAt: string;
  status: string;
}

interface TherapistProfile {
  name: string;
  experience?: string;
  specialties?: string[];
  avatar?: string;
}

export default function InvitationLanding() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const { toast } = useToast();

  // No longer need showSignupDialog state

  // Extract token from URL path
  useEffect(() => {
    const pathParts = location.split('/');
    const tokenFromPath = pathParts[pathParts.length - 1];
    if (tokenFromPath && tokenFromPath !== 'invite') {
      setToken(tokenFromPath);
    } else {
      // Fallback to query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('token');
      setToken(invitationToken);
    }
  }, [location]);

  // Fetch invitation details
  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(`/api/therapist/invitation/${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvitation(data.data);
        
        // Create enhanced therapist profile
        setTherapistProfile({
          name: data.data.therapistName,
          experience: "15+ years experience", // Could be fetched from therapist profile
          specialties: ["Pronunciation", "Fluency", "Speech Clarity"], // Could be dynamic
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invitation not found or has expired');
      }
    } catch (err) {
      setError('Failed to load invitation details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSettingPassword(true);

    try {
      const response = await fetch('/api/invitation/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationToken: token,
          password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: invitation!.clientEmail,
        password: password
      });

      if (signInError) {
        throw signInError;
      }

      toast({
        title: "Welcome to Obla! 🎉",
        description: "Your account has been created successfully. Let's start practicing!",
      });

      // Redirect to dashboard
      setLocation('/my-words?tutorial=true');

    } catch (err: any) {
      console.error('Account creation error:', err);
      toast({
        title: "Account Creation Failed",
        description: err.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Automatically handle logged-in users
  useEffect(() => {
    if (user && invitation && !isLoading) {
      // User is already logged in, just redirect to dashboard with tutorial
      setLocation('/my-words?tutorial=true');
    }
  }, [user, invitation, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Loading your invitation...</h3>
                <p className="text-sm text-gray-600">Please wait while we prepare your welcome</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600 text-xl">Invitation Issue</CardTitle>
            <CardDescription className="text-gray-600">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">What you can do:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Check if the invitation link is correct</li>
                <li>• Contact your therapist for a new invitation</li>
                <li>• Try accessing from your original email</li>
              </ul>
            </div>
            <Button 
              onClick={() => setLocation('/')} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              Go to Obla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Removed success state - logged-in users auto-redirect to dashboard

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Header, Therapist Profile, Benefits */}
            <div>
              {/* Header */}
              <div className="text-center lg:text-left mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  🎉 Welcome to Your Speech Journey!
                </h1>
                <p className="text-xl text-gray-600">
                  {therapistProfile?.name} has invited you to join their personalized speech therapy program on Obla.
                </p>
              </div>

              {/* Therapist Profile Card */}
              <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur enhanced-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {therapistProfile?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{therapistProfile?.name}</h3>
                      <p className="text-gray-600">Speech-Language Pathologist</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-gray-500">{therapistProfile?.experience}</span>
                      </div>
                    </div>
                  </div>
                  
                  {therapistProfile?.specialties && (
                    <div className="flex flex-wrap gap-2">
                      {therapistProfile.specialties.map((specialty, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Benefits Section */}
              <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur enhanced-card">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">What you'll get:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-start space-x-3">
                      <Target className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Personalized exercises</h4>
                        <p className="text-gray-600 text-sm">Tailored to your specific speech goals</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Award className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Real-time pronunciation feedback</h4>
                        <p className="text-gray-600 text-sm">AI-powered analysis of your speech patterns</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Progress tracking and insights</h4>
                        <p className="text-gray-600 text-sm">Detailed analytics to monitor your improvement</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Gamified learning experience</h4>
                        <p className="text-gray-600 text-sm">Fun, engaging exercises that keep you motivated</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Password Setup Form */}
            <div className="lg:mt-20">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur enhanced-card">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <Lock className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">Create Your Account</h3>
                    <p className="text-gray-600">
                      You've been invited to join! Create a secure password to get started.
                    </p>
                  </div>
                  
                  <form onSubmit={handlePasswordSetup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={invitation?.clientEmail || ''}
                        disabled
                        className="w-full bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        New Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your new password"
                        required
                        minLength={6}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        required
                        minLength={6}
                        className="w-full"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSettingPassword}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                    >
                      {isSettingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account & Continue'
                      )}
                    </Button>
                  </form>
                  
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm text-gray-600">
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Secure
                    </span>
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Works on all devices
                    </span>
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Free to start
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Fine Print */}
          <div className="text-center mt-12">
            <p className="text-sm text-gray-500">
              By signing up, you'll be connected with {therapistProfile?.name} and can start your speech therapy program immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in users are automatically redirected above
  // This should never render for logged-in users
  return null;
}
