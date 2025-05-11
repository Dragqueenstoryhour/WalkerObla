import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient, supabaseClient } from '../lib/supabaseClient';

// Define the user type
export interface AuthUser {
  id: string;
  username: string;
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

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Get current user data
  const { data: user, isLoading, isError } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user data query to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Signup mutation
  const signup = useMutation({
    mutationFn: async (credentials: SignupCredentials) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user data query to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      // Also invalidate the query to ensure it's refetched
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // OAuth login mutation
  const oauthLogin = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OAuth login failed');
      }
      
      return response.json();
    },
  });

  // Direct Supabase OAuth login (client-side alternative)
  const supabaseOAuthLogin = async (provider: OAuthProvider) => {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin + '/api/auth/callback',
      },
    });
    
    if (error) throw error;
    
    if (data && data.url) {
      // Redirect user to the OAuth provider's login page
      window.location.href = data.url;
    }
  };

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
    login: login.mutate,
    loginAsync: login.mutateAsync,
    isLoggingIn: login.isPending,
    loginError: login.error,
    signup: signup.mutate,
    signupAsync: signup.mutateAsync,
    isSigningUp: signup.isPending,
    signupError: signup.error,
    logout: logout.mutate,
    logoutAsync: logout.mutateAsync,
    isLoggingOut: logout.isPending,
    logoutError: logout.error,
    oauthLogin: oauthLogin.mutate,
    oauthLoginAsync: oauthLogin.mutateAsync,
    isOAuthLoggingIn: oauthLogin.isPending,
    oauthLoginError: oauthLogin.error,
    supabaseOAuthLogin
  };
}