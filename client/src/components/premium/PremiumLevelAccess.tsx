import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';

interface PremiumLevelAccessProps {
  levelNumber: number;
  onContinue?: () => void;
}

export function PremiumLevelAccess({ levelNumber, onContinue }: PremiumLevelAccessProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if level requires premium and if user has access
  const { data: accessData, isLoading } = useQuery({
    queryKey: [`/api/game/levels/${levelNumber}/access`],
  });

  const handleSubscribe = () => {
    setLocation('/subscription');
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Checking level access...</div>;
  }

  // If the level is not premium or user has access, nothing to show
  if (!accessData?.isPremiumLevel || accessData?.hasAccess) {
    return null;
  }

  // Show premium access required message
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-2 border-primary/10">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Premium Level</CardTitle>
        <CardDescription>
          This is a premium level that requires a subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-primary/5 p-4 rounded-lg space-y-2">
          <div className="flex items-center text-sm mb-2">
            <Sparkles className="h-4 w-4 text-amber-500 mr-2" />
            <span className="font-medium">Premium Features:</span>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Advanced pronunciation exercises</li>
            <li>• Exclusive pirate-themed challenges</li>
            <li>• Priority in-game support</li>
            <li>• New premium content regularly</li>
          </ul>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Subscribe for just $14.99/month with a 7-day free trial
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-2">
        <Button 
          onClick={handleSubscribe} 
          className="w-full"
        >
          Subscribe Now
        </Button>
        <Button 
          variant="ghost" 
          onClick={handleContinue}
          className="w-full"
        >
          Continue to Free Levels
        </Button>
      </CardFooter>
    </Card>
  );
}