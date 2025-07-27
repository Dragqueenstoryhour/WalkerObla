import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';

interface SignupFormProps {
  invitationToken?: string; // Optional invitation token for therapist association
}

export const SignupForm: React.FC<SignupFormProps> = ({ invitationToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshUser } = useAuth(); // Use refreshUser to update auth state after signup
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          firstName, 
          lastName, 
          role: 'user',
          invitationToken // Include invitation token if present
        }),
      });

      const data = await response.json();
      
      console.log('🔍 Signup response:', { 
        ok: response.ok, 
        status: response.status, 
        hasSession: !!data.session, 
        message: data.message 
      });

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // If a session is returned, it means the user was auto-logged in
      if (data.session) {
        console.log('✅ Session received, proceeding with auto-login');
        // Set the session in Supabase client to enable immediate auth state
        await supabaseClient.auth.setSession(data.session);
        
        // Show welcome message
        toast({
          title: "Welcome to Obla! 🎉",
          description: "Your account has been created. Let's start practicing!",
          duration: 5000,
        });
        
        // Force immediate auth state refresh
        try {
          // Wait a bit longer to ensure session is fully established
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Force refresh of auth state
          await refreshUser();
          
          // Dispatch custom event to start tutorial
          window.dispatchEvent(new Event('startTutorial'));
          
          // Redirect to /my-words
          window.location.href = '/my-words';
        } catch (error) {
          console.error('Error refreshing auth state:', error);
          // Fallback: reload page to ensure auth state is updated
          window.location.reload();
        }
      } else {
        // Email confirmation is required (fallback case)
        toast({
          title: "Signup Successful",
          description: "Please check your email for verification.",
        });
        // No onClose needed here as it's not a dialog
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      toast({
        title: "Signup Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create an Account</h2>
        <p className="text-gray-600">
          Join the Obla platform to start improving your speech
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="John"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Doe"
              className="w-full"
            />
          </div>
        </div>
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
            placeholder=""
            className="w-full"
          />
        </div>
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
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
      {/* Removed "Already have an account?" section as it's not relevant for a standalone signup on this page */}
    </div>
  );
};