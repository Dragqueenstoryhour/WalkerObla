import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
// import { supabaseClient } from '../lib/supabaseClient'; // Not directly used in component logic, but fine to keep
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
    loginAsync, 
    logoutAsync, 
    signupAsync, 
    oauthLoginAsync,
    isOAuthLoggingIn 
  } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleOAuthLogin = async (provider: string) => {
    try {
      await oauthLoginAsync(provider as any);
    } catch (error: any) {
      // Check for provider not enabled error
      if (error.message && error.message.includes('provider is not enabled')) {
        toast({
          variant: "destructive",
          title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Sign-in Not Configured`,
          description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in needs to be enabled in Supabase. Please see the documentation for setup instructions.`
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
      await loginAsync(values);
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
      await signupAsync(values);
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
      await logoutAsync();
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
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"> {/* ADDED max-h-[90vh] and overflow-y-auto */}
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>
              Sign in or create an account to save your progress and access all features.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="social" className="w-full pt-4"> 
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="social" className="space-y-4 pt-4">
              <h3 className="text-lg font-medium text-center">Continue with a social provider</h3>

              <Button 
                type="button" 
                className="w-full bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black" 
                onClick={() => handleOAuthLogin('google')}
                disabled={isOAuthLoggingIn}
                size="lg"
              >
                <SiGoogle className="mr-2 h-5 w-5 text-[#4285F4]" />
                {isOAuthLoggingIn ? 'Connecting...' : 'Continue with Google'}
              </Button>

            </TabsContent>

            <TabsContent value="email" className="space-y-6 pt-4">
              <h3 className="text-lg font-medium text-center">
                Sign in or{' '}
                <button 
                  type="button"
                  className="text-blue-600 hover:text-blue-800 underline"
                  onClick={() => {
                    // Scroll to the signup form
                    const signupForm = document.getElementById('signup-form');
                    if (signupForm) {
                      signupForm.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  create an account
                </button>
                {' '}with email
              </h3>

              {/* Login Form */}
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <h4 className="text-md font-medium">Existing Account Login</h4>
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </Form>

              <Separator />

              {/* Signup Form */}
              <Form {...signupForm}>
                <form id="signup-form" onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <h4 className="text-md font-medium">Create New Account</h4>
                  <FormField
                    control={signupForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};