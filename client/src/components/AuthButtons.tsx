import React, { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabaseClient } from '../lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { User, LogOut, LogIn, Mail, Github, Twitter, Facebook } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface AuthButtonsProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

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
    logout, 
    signup, 
    oauthLogin,
    isOAuthLoading 
  } = useAuthContext();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const handleOAuthLogin = async (provider: string) => {
    try {
      await oauthLogin(provider as any);
    } catch (error: any) {
      // Check for provider not enabled error
      if (error.message && error.message.includes('provider is not enabled')) {
        toast({
          variant: "destructive",
          title: "Google Sign-in Not Configured",
          description: "Google sign-in needs to be enabled in Supabase. Please see the ENABLE_GOOGLE_OAUTH.md file for setup instructions."
        });
      } else {
        toast({
          variant: "destructive",
          title: "OAuth Error",
          description: error.message || "Failed to start OAuth login. Please try again."
        });
      }
    }
  };
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });
  
  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setIsLoggingIn(true);
      await login(values);
      setIsDialogOpen(false);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const onSignupSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
      setIsSigningUp(true);
      await signup(values);
      setIsDialogOpen(false);
      toast({
        title: "Account created",
        description: "Your account has been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "There was an error creating your account",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "There was an error logging out",
        variant: "destructive",
      });
    }
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
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 border-2 border-primary">
          <AvatarImage src={user.profileImageUrl || undefined} alt={user.username || 'User'} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {(user.username || 'P').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {showText && (
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium leading-none">
              {user && 'username' in user ? user.username : 'User'}
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
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-1" />
          {showText && <span>Sign Out</span>}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size={size}
            className={`${className} bg-primary hover:bg-primary/90 text-primary-foreground`}
          >
            <LogIn className="h-4 w-4 mr-1" />
            {showText && <span>Sign In to Save Progress</span>}
            {!showText && <span>Sign In</span>}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>
              Sign in to save your progress and access all features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center">
            <h3 className="text-lg font-medium mb-6">Sign in with Google to get started</h3>
            
            <Button 
              type="button" 
              className="w-full bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black" 
              onClick={() => handleOAuthLogin('google')}
              disabled={isOAuthLoading}
              size="lg"
            >
              <SiGoogle className="mr-2 h-5 w-5 text-[#4285F4]" />
              {isOAuthLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
            
            <p className="mt-6 text-sm text-muted-foreground max-w-md text-center">
              We recommend using Google sign-in for the best experience. 
              Your progress and achievements will be saved to your account.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};