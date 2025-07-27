import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { LoginDialog } from './modals/LoginDialog';
import { Link } from 'wouter';

interface User {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role?: 'therapist' | 'user' | string;
  email?: string;
  user_metadata?: {
    name?: string;
    [key: string]: any;
  };
}

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
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLoginClick = () => {
    setShowLoginDialog(true);
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size={size} disabled className={className}>
        <div className="animate-pulse w-5 h-5 mr-2 rounded-full bg-gray-300"></div>
        {showText && <span>Loading...</span>}
      </Button>
    );
  }

  if (isAuthenticated && user) {
    const userData = user as User;

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
              {userData.user_metadata?.name || userData.email || 'User'}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-1">
              {userData.email}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoggingOut}
          className={cn(className, "border-primary text-primary hover:bg-primary hover:text-primary-foreground")}
          onClick={async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              navigate('/');
              
              // Fallback: If UI doesn't update after 500ms, force reload
              setTimeout(() => {
                if (isAuthenticated) {
                  console.log('🚪 Forcing page reload as fallback');
                  window.location.reload();
                }
              }, 500);
            } catch (error) {
              console.error('Logout failed:', error);
              // Force reload on error as well
              window.location.reload();
            } finally {
              setIsLoggingOut(false);
            }
          }}
        >
          <LogOut className="h-4 w-4 mr-1" />
          {showText && <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        className={cn(className, "bg-primary hover:bg-primary/90 text-primary-foreground")}
        onClick={handleLoginClick}
      >
        <LogIn className="h-4 w-4 mr-1" />
        {showText && <span>Sign In</span>}
      </Button>
      <Link href="/sign-up">
        <Button
          variant="outline"
          size={size}
          className={cn(className, "border-primary text-primary hover:bg-primary hover:text-primary-foreground")}
        >
          {showText && <span>Sign Up</span>}
        </Button>
      </Link>
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)} 
        onSignupClick={() => {
          setShowLoginDialog(false);
          navigate('/sign-up');
        }}
      />
    </div>
  );
};