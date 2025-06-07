import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AuthButtonsProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({ 
  className = "",
  variant = "default",
  size = "default",
  showText = true
}) => {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    login,
    logout
  } = useAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" size={size} disabled className={className}>
        <div className="animate-pulse w-5 h-5 mr-2 rounded-full bg-gray-300"></div>
        {showText && <span>Loading...</span>}
      </Button>
    );
  }

  if (isAuthenticated && user) {
    const userData = user as any;
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 border-2 border-primary">
          <AvatarImage src={userData.profileImageUrl || undefined} alt={userData.username || 'User'} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {(userData.username || userData.firstName || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {showText && (
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium leading-none">
              {userData.username || `${userData.firstName} ${userData.lastName}` || 'User'}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-1">
              Logged In
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className={`${className} border-primary text-primary hover:bg-primary hover:text-primary-foreground`}
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-1" />
          {showText && <span>Sign Out</span>}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} bg-primary hover:bg-primary/90 text-primary-foreground`}
      onClick={login}
    >
      <LogIn className="h-4 w-4 mr-1" />
      {showText && <span>Sign In</span>}
    </Button>
  );
};