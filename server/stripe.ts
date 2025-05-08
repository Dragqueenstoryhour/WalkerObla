import Stripe from "stripe";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function createPaymentIntent(amount: number, currency: string = 'usd'): Promise<{ clientSecret: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
    });
    
    return { clientSecret: paymentIntent.client_secret! };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment: ${error.message}`);
  }
}

export async function createSubscription(
  userId: string, 
  email: string, 
  name: string
): Promise<{ subscriptionId: string; clientSecret: string | null }> {
  try {
    // First check if user already has a subscription
    const userRecord = await db.query.users.findFirst({
      where: eq(schema.users.id, userId)
    });
    
    // If the user already has a subscription, return it
    if (userRecord?.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(userRecord.stripeSubscriptionId);
      
      // Return the subscription details
      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
      };
    }
    
    // Create or retrieve a customer
    let customerId = userRecord?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });
      
      customerId = customer.id;
      
      // Update the user record with the Stripe customer ID
      await db
        .update(schema.users)
        .set({ stripeCustomerId: customerId })
        .where(eq(schema.users.id, userId));
    }
    
    // Create a subscription with the customer
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: process.env.STRIPE_PRICE_ID || 'price_1NcYbTKKj0QZyg8yNvRZKHqd', // Default to a test price if not set
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    // Update the user record with the subscription ID
    await db
      .update(schema.users)
      .set({ 
        stripeSubscriptionId: subscription.id,
        hasPremium: true, 
      })
      .where(eq(schema.users.id, userId));
      
    // Return subscription details
    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
    };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}