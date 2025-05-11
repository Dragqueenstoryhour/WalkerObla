import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { supabaseClient, getCurrentUser, getSession } from '../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

// Define the user type
export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImageUrl?: string;
  level?: number;
  xp?: number;
  // Add any other user properties here
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  firstName?: string;
  lastName?: string;
}

export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter';

/**
 * Convert Supabase User to our AuthUser type
 */
function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email || undefined,
    username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name,
    profileImageUrl: user.user_metadata?.avatar_url
  };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  
  // Set up auth state listener
  useEffect(() => {
    // Check for existing session
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Get current session
        const currentSession = await getSession();
        setSession(currentSession);
        
        // Get user data
        if (currentSession?.user) {
          const authUser = mapSupabaseUser(currentSession.user);
          setUser(authUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          const authUser = mapSupabaseUser(newSession.user);
          setUser(authUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'USER_UPDATED' && newSession?.user) {
          const authUser = mapSupabaseUser(newSession.user);
          setUser(authUser);
        }
      }
    );
    
    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // Email/password login
  const loginWithEmail = async (credentials: LoginCredentials) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (error) throw error;
    return data;
  };
  
  // Email/password signup
  const signupWithEmail = async (credentials: SignupCredentials) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          first_name: credentials.firstName,
          last_name: credentials.lastName
        }
      }
    });
    
    if (error) throw error;
    return data;
  };
  
  // Logout
  const logout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  };
  
  // OAuth login
  const oauthLogin = async (provider: OAuthProvider) => {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth-callback.html`,
        skipBrowserRedirect: false
      }
    });
    
    if (error) {
      if (error.message.includes('provider is not enabled')) {
        throw new Error(`The ${provider} provider is not enabled in your Supabase project. Please see ENABLE_GOOGLE_OAUTH.md for setup instructions.`);
      }
      throw error;
    }
    
    return data;
  };
  
  // Login mutation
  const login = useMutation({
    mutationFn: loginWithEmail
  });
  
  // Signup mutation
  const signup = useMutation({
    mutationFn: signupWithEmail
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout
  });
  
  // OAuth login mutation
  const oauthLoginMutation = useMutation({
    mutationFn: oauthLogin
  });
  
  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    login: login.mutate,
    loginAsync: login.mutateAsync,
    isLoggingIn: login.isPending,
    loginError: login.error,
    signup: signup.mutate,
    signupAsync: signup.mutateAsync,
    isSigningUp: signup.isPending,
    signupError: signup.error,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,
    oauthLogin: oauthLoginMutation.mutate,
    oauthLoginAsync: oauthLoginMutation.mutateAsync,
    isOAuthLoggingIn: oauthLoginMutation.isPending,
    oauthLoginError: oauthLoginMutation.error
  };
}