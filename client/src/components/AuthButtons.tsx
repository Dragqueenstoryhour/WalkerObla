import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";

interface AuthButtonsProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({ 
  className = "",
  variant = "default",
  size = "default" 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" size={size} disabled className={className}>
        Loading...
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden md:inline">
          Hi, {user && 'username' in user ? user.username : 'Pirate'}!
        </span>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => window.location.href = "/api/logout"}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.location.href = "/api/login"}
    >
      Sign In to Save Progress
    </Button>
  );
};