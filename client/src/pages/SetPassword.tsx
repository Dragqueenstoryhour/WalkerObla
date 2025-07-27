import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { supabaseClient } from '../lib/supabaseClient';

export default function SetPassword() {
  const [location, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type !== 'recovery' || !accessToken || !refreshToken) {
          setError('Invalid or expired password setup link. Please request a new invitation from your therapist.');
          setIsValidating(false);
          return;
        }

        const { error: sessionError } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          setError('Invalid or expired password setup link. Please request a new invitation from your therapist.');
        }
      } catch (err) {
        setError('Failed to validate password setup link. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      alert("Password set successfully! You can now sign in to your account.");

      setTimeout(() => {
        setLocation('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
      alert(err.message || "Failed to set password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Loader2 style={{ height: '48px', width: '48px', color: '#1976d2' }} className="animate-spin" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' }}>Validating your link...</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Please wait while we verify your password setup link</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <XCircle style={{ height: '64px', width: '64px', color: '#f44336', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#f44336', fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>Password Setup Issue</h2>
            <p style={{ color: '#666', margin: '0' }}>{error}</p>
          </div>
          <div style={{ backgroundColor: '#ffebee', padding: '16px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '16px' }}>
            <h4 style={{ fontWeight: '600', color: '#c62828', margin: '0 0 8px 0' }}>What you can do:</h4>
            <ul style={{ fontSize: '14px', color: '#d32f2f', margin: '0', paddingLeft: '20px', lineHeight: '1.5' }}>
              <li>• Contact your therapist for a new invitation</li>
              <li>• Make sure you're using the link from your most recent email</li>
              <li>• Try opening the link in a new browser window</li>
            </ul>
          </div>
          <button 
            onClick={() => setLocation('/')} 
            style={{ width: '100%', backgroundColor: '#1976d2', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            Go to Obla Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8f5e8 0%, #e3f2fd 100%)' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <CheckCircle style={{ height: '64px', width: '64px', color: '#4caf50', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#4caf50', fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>Password Set Successfully!</h2>
            <p style={{ color: '#666', margin: '0' }}>
              Your account is now ready to use. You'll be redirected to the login page shortly.
            </p>
          </div>
          <button 
            onClick={() => setLocation('/')} 
            style={{ width: '100%', backgroundColor: '#1976d2', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Lock style={{ height: '64px', width: '64px', color: '#1976d2', margin: '0 auto 16px' }} />
          <h2 style={{ color: '#1976d2', fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>Set Your Password</h2>
          <p style={{ color: '#666', margin: '0' }}>
            Create a secure password for your Obla account
          </p>
        </div>
        <form onSubmit={handlePasswordSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              minLength={6}
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="confirmPassword" style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={6}
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              backgroundColor: isLoading ? '#ccc' : '#1976d2', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ height: '16px', width: '16px' }} className="animate-spin" />
                Setting Password...
              </>
            ) : (
              'Set Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
