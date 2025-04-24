import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface SubscriptionCardProps {
  onSubscribe?: () => void;
  onSuccess?: () => void;
}

export function SubscriptionCard({ onSubscribe, onSuccess }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSubscribe = async () => {
    try {
      setLoading(true);
      if (onSubscribe) onSubscribe();
      
      // Create subscription
      const response = await apiRequest("POST", "/api/subscription/create");
      const data = await response.json();
      
      if (data.clientSecret) {
        // Redirect to Stripe checkout
        window.location.href = `/checkout?client_secret=${data.clientSecret}&subscription_id=${data.subscriptionId}`;
      } else {
        // Subscription already active
        toast({
          title: "Subscription active",
          description: "You already have an active subscription!",
        });
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Subscription failed",
        description: "Could not create subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg border-2 border-primary/20 bg-card/95">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Badge variant="default" className="px-3 py-1 text-sm">
            7-DAY FREE TRIAL
          </Badge>
        </div>
        <CardTitle className="text-2xl font-bold text-primary">Premium Access</CardTitle>
        <CardDescription>
          Unlock all premium levels and features
        </CardDescription>
        <div className="mt-2 flex items-baseline justify-center">
          <span className="text-3xl font-extrabold tracking-tight">$14.99</span>
          <span className="ml-1 text-xl text-muted-foreground">/month</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          <li className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Access to all premium levels (8+)</span>
          </li>
          <li className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Advanced pronunciation exercises</span>
          </li>
          <li className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Exclusive pirate-themed challenges</span>
          </li>
          <li className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Priority in-game support</span>
          </li>
          <li className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>New premium content regularly</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full py-6 text-lg font-bold"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Start 7-Day Free Trial'
          )}
        </Button>
      </CardFooter>
      <div className="text-center pb-4 text-sm text-muted-foreground">
        No credit card required for trial. Cancel anytime.
      </div>
    </Card>
  );
}