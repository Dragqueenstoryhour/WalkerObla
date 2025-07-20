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

interface SignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void; // Callback to switch to login dialog
}

export const SignupDialog: React.FC<SignupDialogProps> = ({ isOpen, onClose, onLoginClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth(); // Use login to automatically log in after signup if email confirmation is off
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
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      toast({
        title: "Signup Successful",
        description: data.message || "Please check your email for verification.",
      });

      // If a session is returned, it means email confirmation is off, so log them in
      if (data.session) {
        // The backend already logged them in, just need to refresh auth state
        // For simplicity, we can just close the dialog and let useAuth re-fetch
        onClose();
      } else {
        // Email confirmation is on, just close the dialog
        onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign Up</DialogTitle>
          <DialogDescription>
            Create your account to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </DialogFooter>
        </form>
        <div className="text-center text-sm mt-4">
          Already have an account? {' '}
          <Button variant="link" onClick={onLoginClick} className="p-0 h-auto">
            Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};