import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Users, Star, Target, Award, Clock } from 'lucide-react';

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
  const { user, signInWithGoogle } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptanceData, setAcceptanceData] = useState<any>(null);

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

  const acceptInvitation = async () => {
    if (!user || !token) return;

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/accept-invitation/accept/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptanceData(data.data);
        setSuccess(true);
        
        // Redirect after showing success for 3 seconds
        setTimeout(() => {
          if (data.data?.hasAssignments) {
            setLocation('/my-words?tab=assignments');
          } else {
            setLocation('/my-words');
          }
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-green-600 text-xl">🎉 Welcome to Obla!</CardTitle>
            <CardDescription className="text-gray-600">
              You've successfully joined {therapistProfile?.name}'s speech therapy program!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptanceData?.hasAssignments && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">🎯 You have assignments waiting!</h4>
                <p className="text-sm text-blue-700">
                  {acceptanceData.assignmentsCount} assignment{acceptanceData.assignmentsCount > 1 ? 's' : ''} ready to start
                </p>
              </div>
            )}
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Redirecting you to your dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🎉 Welcome to Your Speech Journey!
              </h1>
              <p className="text-xl text-gray-600">
                {therapistProfile?.name} has invited you to join their personalized speech therapy program on Obla.
              </p>
            </div>

            {/* Therapist Profile Card */}
            <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur">
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
            <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur">
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

            {/* Call to Action */}
            <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to begin your journey?</h3>
                <p className="mb-6 text-blue-100">
                  Sign in with your Google account to accept this invitation and start improving your speech today.
                </p>
                
                <Button 
                  onClick={signInWithGoogle} 
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-8 text-lg"
                  size="lg"
                >
                  Sign In with Google
                </Button>

                <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-blue-100">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Secure
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Works on all devices
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Free to start
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Fine Print */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                By signing in, you'll be connected with {therapistProfile?.name} and can start your speech therapy program immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is logged in, show acceptance interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Accept Invitation</CardTitle>
              <CardDescription>
                You've been invited by <strong>{therapistProfile?.name}</strong> to join their speech therapy program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">You're all set!</h4>
                <p className="text-sm text-green-700 mb-3">
                  Signed in as: <strong>{user.email}</strong>
                </p>
                <p className="text-sm text-green-700">
                  Click accept to join {therapistProfile?.name}'s program and start your personalized speech therapy journey.
                </p>
              </div>
              
              <Button 
                onClick={acceptInvitation} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting invitation...
                  </>
                ) : (
                  'Accept Invitation & Start Journey'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}