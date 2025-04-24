import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { SubscriptionCard } from '@/components/premium/SubscriptionCard';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Subscription() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelLoading, setCancelLoading] = useState(false);

  // Get subscription status
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: isAuthenticated,
  });

  // Mutation for canceling subscription
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      setCancelLoading(true);
      const res = await apiRequest("POST", "/api/subscription/cancel");
      if (!res.ok) {
        throw new Error('Failed to cancel subscription');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled successfully.",
      });
      // Invalidate subscription status query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      setCancelLoading(false);
    },
    onError: (error) => {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
      setCancelLoading(false);
    },
  });

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      cancelSubscription.mutate();
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // If user isn't authenticated, show login message
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Premium Subscription</CardTitle>
            <CardDescription>Please log in to subscribe</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <p className="mb-4">You need to be logged in to manage subscriptions</p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => window.location.href = "/api/login"} 
              className="w-full"
            >
              Log In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show loading spinner while checking authentication or subscription status
  if (authLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has an active subscription, show subscription details
  if (subscriptionData?.hasPremiumAccess) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Premium Subscription Active</CardTitle>
            <CardDescription>
              {subscriptionData.subscriptionStatus === 'trialing' 
                ? 'You are currently on your free trial' 
                : 'Your subscription is active'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">
                  {subscriptionData.subscriptionStatus === 'trialing' 
                    ? 'Free Trial' 
                    : subscriptionData.subscriptionStatus}
                </span>
              </div>
              {subscriptionData.trialEndDate && subscriptionData.subscriptionStatus === 'trialing' && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trial ends:</span>
                  <span className="font-medium">{formatDate(subscriptionData.trialEndDate)}</span>
                </div>
              )}
              {subscriptionData.subscriptionEndDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next billing date:</span>
                  <span className="font-medium">{formatDate(subscriptionData.subscriptionEndDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly price:</span>
                <span className="font-medium">$14.99</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Premium Benefits:</h3>
              <ul className="text-sm space-y-1">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-primary mr-2" />
                  <span>Access to all premium levels (8+)</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-primary mr-2" />
                  <span>Advanced pronunciation exercises</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-primary mr-2" />
                  <span>Exclusive pirate-themed challenges</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button 
              onClick={() => setLocation('/game')} 
              className="w-full"
            >
              Continue to Game
            </Button>
            <Button 
              variant="outline"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="w-full"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Otherwise, show subscription offer
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Unlock Premium Content</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Subscribe to get access to premium levels, advanced pronunciation exercises, and exclusive pirate-themed content.
        </p>
      </div>
      
      <div className="flex justify-center">
        <SubscriptionCard 
          onSubscribe={() => {
            if (!isAuthenticated) {
              toast({
                title: "Login Required",
                description: "Please log in to subscribe",
                variant: "destructive",
              });
              return false;
            }
            return true;
          }}
          onSuccess={() => setLocation('/game')}
        />
      </div>
    </div>
  );
}