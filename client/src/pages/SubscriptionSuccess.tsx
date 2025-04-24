import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from 'lucide-react';

export default function SubscriptionSuccess() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // You could trigger some analytics event or update UI state here
    console.log('Subscription successful');
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Subscription Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            Thank you for subscribing to our premium service! Your 7-day free trial has started.
          </p>
          <p className="text-muted-foreground">
            You now have access to all premium levels (8+) and features.
          </p>
          <div className="mt-6 p-4 bg-primary/5 rounded-lg">
            <h3 className="font-medium text-primary mb-2">What's included:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Access to all premium levels (8+)</li>
              <li>• Advanced pronunciation exercises</li>
              <li>• Exclusive pirate-themed challenges</li>
              <li>• Priority in-game support</li>
              <li>• New premium content regularly</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-4">
          <Button 
            onClick={() => setLocation('/game')} 
            className="w-full"
          >
            Continue to Game
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Your subscription will renew at $14.99/month after your trial ends. You can cancel anytime from your account settings.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}