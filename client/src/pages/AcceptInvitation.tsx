import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react';

interface InvitationDetails {
  therapistName: string;
  clientEmail: string;
  expiresAt: string;
  status: string;
}

export default function AcceptInvitation() {
  const [location, setLocation] = useLocation();
  const { user, signInWithGoogle } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(`/api/therapist/invitation/${token}`);
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
        setSuccess(true);
        setTimeout(() => {
          if (data.data?.hasAssignments) {
            setLocation('/my-words?tab=assignments');
          } else {
            setLocation('/my-words');
          }
        }, 2000);
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
            <CardTitle className="text-green-600">Invitation Accepted!</CardTitle>
            <CardDescription>
              You've successfully joined {invitation?.therapistName}'s program. 
              Redirecting you to your assignments...
            </CardDescription>
          </CardHeader>
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
                To accept this invitation, please sign in with your Google account.
              </p>
            </div>
            <Button 
              onClick={signInWithGoogle} 
              className="w-full"
              size="lg"
            >
              Sign In with Google
            </Button>
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
            disabled={isAccepting}
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
