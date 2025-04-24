import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from 'wouter';

// Load Stripe outside of component to avoid recreating instance on rerender
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // Confirm payment
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription/success`,
      },
    });

    // Handle payment error
    if (error) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'An error occurred with your payment');
      toast({
        title: "Payment failed",
        description: error.message || 'An error occurred with your payment',
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-destructive text-sm">{errorMessage}</div>
      )}
      
      <div className="flex justify-between items-center">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setLocation('/subscription')}
          disabled={loading}
        >
          Back
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || loading}
          className="min-w-[150px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Get client secret from URL parameters
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('client_secret');
    
    if (secret) {
      setClientSecret(secret);
    } else {
      toast({
        title: "Error",
        description: "Missing payment information. Please try again.",
        variant: "destructive",
      });
      setLocation('/subscription');
    }
  }, [toast, setLocation]);

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/10">
        <CardHeader>
          <CardTitle>Complete your subscription</CardTitle>
          <CardDescription>
            Enter your payment details to start your 7-day free trial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0099FF',
                  borderRadius: '6px',
                },
              },
            }}
          >
            <CheckoutForm />
          </Elements>
        </CardContent>
        <CardFooter className="flex-col space-y-2 text-center text-sm text-muted-foreground">
          <p>You won't be charged during your free trial.</p>
          <p>After 7 days, your subscription will be $14.99/month.</p>
          <p>Cancel anytime before your trial ends.</p>
        </CardFooter>
      </Card>
    </div>
  );
}