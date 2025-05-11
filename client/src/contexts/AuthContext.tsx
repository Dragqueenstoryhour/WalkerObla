import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, AuthUser, LoginCredentials, SignupCredentials, OAuthProvider } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Create a type that explicitly handles the undefined to null conversion
type SafeAuthUser = AuthUser | null;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  oauthLogin: (provider: OAuthProvider) => Promise<void>;
  isOAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { 
    user, 
    isLoading, 
    isAuthenticated,
    loginAsync,
    signupAsync,
    logoutAsync,
    supabaseOAuthLogin,
    isOAuthLoggingIn
  } = useAuth();

  const login = async (credentials: LoginCredentials) => {
    try {
      await loginAsync(credentials);
      toast({
        title: 'Successfully logged in',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Could not log in. Please check your credentials.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      await signupAsync(credentials);
      toast({
        title: 'Account created',
        description: 'Your account has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message || 'Could not create your account.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutAsync();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Logout failed',
        description: error.message || 'Could not log out.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const oauthLogin = async (provider: OAuthProvider) => {
    try {
      await supabaseOAuthLogin(provider);
      // No toast here as the page will redirect to OAuth provider
    } catch (error: any) {
      toast({
        title: 'OAuth login failed',
        description: error.message || 'Could not start OAuth login process.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Convert undefined to null explicitly
  const safeUser: SafeAuthUser = user || null;
  
  return (
    <AuthContext.Provider
      value={{
        user: safeUser,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        oauthLogin,
        isOAuthLoading: isOAuthLoggingIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};