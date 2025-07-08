import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from 'wouter';

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
  
  const [, navigate] = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);

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

    const handleAvatarClick = () => {
      navigate('/my-account');
    };

    const handleTherapistPortal = () => {
      navigate('/therapist');
    };

    return (
      <div className="flex items-center gap-2">
        {/* Show Therapist Portal button for therapists */}
        {userData.role === 'therapist' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTherapistPortal}
            className="bg-purple-600 hover:bg-purple-700 text-white border-none"
          >
            Therapist Portal
          </Button>
        )}
        <div className="relative">
          <Avatar 
            className="h-8 w-8 border-2 border-primary cursor-pointer hover:border-green-500 transition-colors"
            onClick={handleAvatarClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <AvatarImage src={userData.profileImageUrl || undefined} alt={userData.username || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(userData.username || userData.firstName || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showTooltip && (
            <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
              <span className="text-sm font-medium text-green-600">My Account</span>
            </div>
          )}
        </div>
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