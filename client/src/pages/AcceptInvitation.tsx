

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

interface InvitationDetails {
  therapistName: string;
  clientEmail: string;
  expiresAt: string;
  status: string;
}

export default function AcceptInvitation() {
  const [location, setLocation] = useLocation();
  const { user, signUp, isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [canAcceptInvitation, setCanAcceptInvitation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invitationToken = urlParams.get('token');
    setToken(invitationToken);
  }, []);

  // Fetch invitation details
  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  // Automatically accept invitation if user is authenticated and token is present
  useEffect(() => {
    if (user && user.access_token && token && isAuthenticated && !isAccepting && !success) {
      acceptInvitation();
    }
  }, [user, token, isAuthenticated, isAccepting, success]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/therapist/invitation/${token}`));
      if (response.ok) {
        const data = await response.json();
        setInvitation(data.data);
      } else {
        setError('Invitation not found or has expired');
      }
    } catch (err) {
      setError('Failed to load invitation details');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !token || !isAuthenticated) return;

    setIsAccepting(true);
    try {
      console.log("Attempting to accept invitation with token:", token, "and user access token:", user.access_token);
      const response = await fetch(getApiUrl(`/api/accept-invitation/accept/${token}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        // No immediate redirect, show welcome message
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

  const handleSignUp = async () => {
    setIsSigningUp(true);
    setError(null);
    try {
      const result = await signUp(email, password);
      if (result.success) {
        // After successful signup, user object in useAuth should be updated
        // The useEffect for canAcceptInvitation will re-evaluate
        if (token) {
          acceptInvitation();
        }
      } else {
        setError(result.error || 'Sign up failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up');
    } finally {
      setIsSigningUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-red-600">Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-green-600">Welcome to the Program!</CardTitle>
            <CardDescription>
              You've successfully joined <strong>{invitation?.therapistName}</strong>'s program.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">We're excited to have you on board!</p>
            <p className="mb-4">
              To get started, we recommend checking out our interactive tutorial.
            </p>
            <Button 
              onClick={() => setLocation('/my-words?tutorial=true')} 
              className="w-full mb-2"
            >
              Start Tutorial
            </Button>
            <Button 
              onClick={() => setLocation('/my-words')} 
              variant="outline" 
              className="w-full"
            >
              Go to My Words
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <CardTitle>Join Speech Therapy Program</CardTitle>
            <CardDescription>
              You've been invited by <strong>{invitation?.therapistName}</strong> to join their speech therapy program.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Please sign up or log in to accept this invitation.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                onClick={handleSignUp} 
                className="w-full"
                size="lg"
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing Up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-2" />
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited by <strong>{invitation?.therapistName}</strong> to join their speech therapy program.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">What you'll get:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Personalized speech exercises</li>
              <li>• Real-time pronunciation feedback</li>
              <li>• Progress tracking and insights</li>
            </ul>
          </div>
          
          <Button 
            onClick={acceptInvitation} 
            className="w-full"
            size="lg"
            disabled={isAccepting || !canAcceptInvitation}
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Signed in as: {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
