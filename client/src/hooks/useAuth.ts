import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { 
  supabaseClient, 
  getCurrentUser, 
  getSession, 
  initializeAuth,
  getAuthToken
} from '../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { apiRequest } from '@/lib/queryClient';

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

/**
 * Fetch user data from our API using the auth token
 */
async function fetchUserData(authUser: AuthUser | null): Promise<AuthUser | null> {
  if (!authUser) return null;
  
  try {
    const token = await getAuthToken();
    if (!token) return authUser;
    
    // Fetch additional user data from our API
    const userData = await fetch('/api/auth/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => res.json());
    
    // Merge the data
    return {
      ...authUser,
      ...userData,
      // Ensure we keep auth user properties if they're missing from API response
      email: userData.email || authUser.email,
      username: userData.username || authUser.username,
      firstName: userData.firstName || authUser.firstName,
      lastName: userData.lastName || authUser.lastName,
      profileImageUrl: userData.profileImageUrl || authUser.profileImageUrl
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return authUser;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  
  // Set up auth state listener
  useEffect(() => {
    // Initialize auth and check for existing session
    const setupAuth = async () => {
      setIsLoading(true);
      try {
        // Initialize auth and handle OAuth callback if needed
        const currentSession = await initializeAuth();
        setSession(currentSession);
        
        // Get user data from Supabase
        if (currentSession?.user) {
          const authUser = mapSupabaseUser(currentSession.user);
          
          // Fetch additional user data from our API
          const fullUserData = await fetchUserData(authUser);
          setUser(fullUserData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          const authUser = mapSupabaseUser(newSession.user);
          
          // Fetch additional user data from our API
          const fullUserData = await fetchUserData(authUser);
          setUser(fullUserData);
          
          // Invalidate any cached user data
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          
          // Clear user data from cache
          queryClient.invalidateQueries();
        } else if (event === 'USER_UPDATED' && newSession?.user) {
          const authUser = mapSupabaseUser(newSession.user);
          
          // Fetch additional user data from our API
          const fullUserData = await fetchUserData(authUser);
          setUser(fullUserData);
          
          // Invalidate any cached user data
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        }
      }
    );
    
    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [queryClient]);
  
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
  
  // OAuth login with popup window
  const oauthLogin = async (provider: OAuthProvider) => {
    try {
      // Start OAuth flow with popup window
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth-callback.html`,
          skipBrowserRedirect: true // Important: We'll use the popup approach
        }
      });
      
      if (error) {
        if (error.message.includes('provider is not enabled')) {
          throw new Error(`The ${provider} provider is not enabled in your Supabase project. Please see ENABLE_GOOGLE_OAUTH.md for setup instructions.`);
        }
        throw error;
      }
      
      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }
      
      // Open popup window for the OAuth flow
      const popup = window.open(
        data.url,
        'Login with ' + provider,
        'width=800,height=600'
      );
      
      if (!popup) {
        throw new Error('Popup window was blocked. Please allow popups for this site.');
      }
      
      // Return a promise that will resolve when the popup completes
      return new Promise((resolve, reject) => {
        // Set a timeout to reject if the popup doesn't complete in a reasonable time
        const timeout = setTimeout(() => {
          reject(new Error('OAuth login timed out. Please try again.'));
        }, 120000); // 2 minutes timeout
        
        // Listen for messages from the popup
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'SUPABASE_AUTH_CALLBACK') {
            // Clear timeout and remove listener
            clearTimeout(timeout);
            window.removeEventListener('message', messageListener);
            
            // Resolve the promise
            resolve({ provider, success: true });
          }
        };
        
        // Add message listener
        window.addEventListener('message', messageListener);
      });
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
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
    mutationFn: logout,
    onSuccess: () => {
      // Clear all query cache on logout
      queryClient.clear();
    }
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