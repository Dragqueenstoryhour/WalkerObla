import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void; // Callback to switch to signup dialog
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onSignupClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isForgotPassword) {
      // Handle forgot password
      try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth-callback`,
        });

        if (error) {
          throw error;
        }

        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for a link to reset your password.",
          duration: 5000,
        });
        
        setIsForgotPassword(false);
        onClose();
      } catch (error: any) {
        toast({
          title: "Reset Failed",
          description: error.message || "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Handle regular login
      const result = await login(email, password);

      if (result.success) {
        toast({
          title: "Login Successful",
          description: "You have been logged in.",
        });
        onClose(); // Close dialog on successful login
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-labelledby="login-title" aria-describedby="login-description" className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle id="login-title">Welcome Back</DialogTitle>
          <DialogDescription id="login-description">
            Sign in to access your personalized assignments and track your progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full"
            />
          </div>
          {!isForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full"
              />
            </div>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          >
            {isSubmitting 
              ? (isForgotPassword ? 'Sending Reset Email...' : 'Signing In...')
              : (isForgotPassword ? 'Send Reset Email' : 'Sign In')
            }
          </Button>
        </form>
        <div className="text-center text-sm border-t pt-4 space-y-2">
          <div>
            <span className="text-gray-600">Don't have an account? </span>
            <Button variant="link" onClick={onSignupClick} className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium">
              Sign Up
            </Button>
          </div>
          <div>
            <Button 
              variant="link" 
              onClick={() => setIsForgotPassword(!isForgotPassword)} 
              className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium"
            >
              {isForgotPassword ? 'Back to Sign In' : 'Forgot My Password?'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
