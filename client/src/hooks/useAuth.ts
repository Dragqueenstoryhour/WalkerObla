import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Only retry on network errors, not auth errors
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

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