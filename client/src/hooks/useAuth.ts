import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClient, getAuthHeaders } from "../lib/supabaseClient";
import { getApiUrl } from "../lib/utils";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: authResponse, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      console.log('Fetching user authentication status...');
      const authHeaders = await getAuthHeaders();
      console.log('Auth headers prepared:', Object.keys(authHeaders).length > 0 ? 'Token present' : 'No token');
      
      const response = await fetch(getApiUrl("/api/auth/user"), {
        headers: authHeaders,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Auth check failed:', response.status, errorData);
        const error = new Error(`${response.status}: ${errorData}`);
        (error as any).status = response.status;
        throw error;
      }
      
      const data = await response.json();
      console.log('User authenticated successfully');
      return data;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) errors
      if (error?.status === 401) return false;
      // Don't retry on network errors (status 0)
      if (error?.status === 0) return false;
      // Only retry other errors, max 1 time
      return failureCount < 1;
    },
    retryOnMount: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Extract user from the response (backend returns { user: ... })
  const user = authResponse?.user || null;

  // Handle errors gracefully to prevent unhandled rejections
  if (error) {
    // Silently handle auth errors to prevent unhandled rejections
    if (error?.status === 401 || error?.status === 0) {
      console.debug('Auth check failed (expected for non-authenticated users):', error?.status);
    } else {
      console.error('Unexpected auth error:', error);
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: String(email), password: String(password) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.session) {
        await supabaseClient.auth.setSession(data.session);
        // Wait a moment for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Clear current query cache and refetch fresh user data
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      
      // Explicitly refetch the user data and wait for it
      const updatedUserData = await queryClient.fetchQuery({
        queryKey: ["/api/auth/user"],
        queryFn: async () => {
          console.log('Re-fetching user data after login...');
          const authHeaders = await getAuthHeaders();
          
          const userResponse = await fetch(getApiUrl("/api/auth/user"), {
            headers: authHeaders,
            credentials: "include",
          });
          
          if (!userResponse.ok) {
            const errorData = await userResponse.text();
            console.error('Failed to fetch user data after login:', userResponse.status, errorData);
            const error = new Error(`${userResponse.status}: ${errorData}`);
            (error as any).status = userResponse.status;
            throw error;
          }
          
          const userData = await userResponse.json();
          console.log('User data fetched after login:', userData.user?.role);
          return userData;
        },
        staleTime: 0, // Force fresh fetch
      });

      return { success: true, user: updatedUserData.user };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');
      
      // Step 1: Clear all auth-related queries immediately for instant UI update
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Step 2: Clear local Supabase session
      await supabaseClient.auth.signOut();
      console.log('Local session cleared');
      
      // Step 3: Force a complete cache reset to ensure UI updates
      queryClient.clear();
      
      // Step 4: Notify backend (non-blocking)
      fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(response => {
        if (response.ok) {
          console.log('Server logout notification successful');
        } else {
          console.warn('Server logout notification failed, but local logout succeeded');
        }
      }).catch(error => {
        console.warn('Server logout request failed:', error);
      });

      console.log('Logout completed successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Logout error:', err);
      // Even if logout fails, ensure local state is cleared
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      return { success: false, error: err.message };
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data...');
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      
      const freshUserData = await queryClient.fetchQuery({
        queryKey: ["/api/auth/user"],
        queryFn: async () => {
          const authHeaders = await getAuthHeaders();
          
          const response = await fetch(getApiUrl("/api/auth/user"), {
            headers: authHeaders,
            credentials: "include",
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error('Refresh auth check failed:', response.status, errorData);
            const error = new Error(`${response.status}: ${errorData}`);
            (error as any).status = response.status;
            throw error;
          }
          
          const data = await response.json();
          console.log('User data refreshed successfully:', data.user?.role);
          return data;
        },
        staleTime: 0,
      });
      
      return freshUserData.user;
    } catch (err) {
      console.error('Error refreshing user data:', err);
      return null;
    }
  };

  // User is authenticated if we have user data and no 401 error
  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: String(email), password: String(password) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      if (data.session) {
        await supabaseClient.auth.setSession(data.session);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      const updatedUserData = await queryClient.fetchQuery({
        queryKey: ["/api/auth/user"],
        queryFn: async () => {
          console.log('Re-fetching user data after signup...');
          const authHeaders = await getAuthHeaders();
          
          const userResponse = await fetch(getApiUrl("/api/auth/user"), {
            headers: authHeaders,
            credentials: "include",
          });
          
          if (!userResponse.ok) {
            const errorData = await userResponse.text();
            console.error('Failed to fetch user data after signup:', userResponse.status, errorData);
            const error = new Error(`${userResponse.status}: ${errorData}`);
            (error as any).status = userResponse.status;
            throw error;
          }
          
          const userData = await userResponse.json();
          console.log('User data fetched after signup:', userData.user?.role);
          return userData;
        },
        staleTime: 0,
      });

      return { success: true, user: updatedUserData.user };
    } catch (err: any) {
      console.error('Sign up error:', err);
      return { success: false, error: err.message };
    }
  };

  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    signUp,
    error,
  };
}