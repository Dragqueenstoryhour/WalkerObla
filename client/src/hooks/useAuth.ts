import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) errors
      if (error?.status === 401) return false;
      // Don't retry on network errors (status 0)
      if (error?.status === 0) return false;
      // Only retry other errors, max 1 time
      return failureCount < 1;
    },
    retryOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Handle errors gracefully to prevent unhandled rejections
  if (error) {
    // Silently handle auth errors to prevent unhandled rejections
    if (error?.status === 401 || error?.status === 0) {
      console.debug('Auth check failed (expected for non-authenticated users):', error?.status);
    } else {
      console.error('Unexpected auth error:', error);
    }
  }

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  // User is authenticated if we have user data and no 401 error
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    error,
  };
}