import { useQuery } from "@tanstack/react-query";

// Define the user type
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  // Add any other user properties here
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}