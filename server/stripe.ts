import Stripe from 'stripe';
import { User } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Monthly subscription price in cents ($14.99)
const SUBSCRIPTION_PRICE_CENTS = 1499;

// Trial period in days
const TRIAL_PERIOD_DAYS = 7;

// Premium level threshold (levels 8+)
export const PREMIUM_LEVEL_THRESHOLD = 8;

/**
 * Checks if a user has access to premium levels
 */
export async function userHasPremiumAccess(user: User): Promise<boolean> {
  // If user level is below premium threshold, no need to check subscription
  if (user.level < PREMIUM_LEVEL_THRESHOLD) {
    return true;
  }

  // If no subscription data, user doesn't have premium access
  if (!user.subscriptionStatus) {
    return false;
  }

  // Check subscription status
  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(user.subscriptionStatus);
}

/**
 * Creates a Stripe customer for a user
 */
export async function createStripeCustomer(user: User): Promise<string> {
  try {
    if (!user.email) {
      throw new Error('User email is required to create a Stripe customer');
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.username,
      metadata: {
        userId: user.id
      }
    });

    // Update user with Stripe customer ID
    await db.update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, user.id));

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create Stripe customer');
  }
}

/**
 * Creates a subscription for a user
 */
export async function createSubscription(userId: string): Promise<{
  clientSecret: string | null;
  subscriptionId: string;
}> {
  try {
    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create Stripe customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer(user);
    }

    // Create subscription with trial period
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pirate Speech Premium Access',
              description: 'Access to premium levels (8+) in Pirate Speech',
            },
            unit_amount: SUBSCRIPTION_PRICE_CENTS,
            recurring: {
              interval: 'month',
            },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: TRIAL_PERIOD_DAYS,
    });

    // Update user with subscription info
    await db.update(users)
      .set({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      })
      .where(eq(users.id, userId));

    // Get client secret for confirming the subscription
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    
    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Cancels a subscription
 */
export async function cancelSubscription(userId: string): Promise<void> {
  try {
    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || !user.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel subscription
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    // Update user subscription status
    await db.update(users)
      .set({
        subscriptionStatus: 'canceled',
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Handles Stripe webhook events
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionInDatabase(subscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleDeletedSubscription(deletedSubscription);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await handleSuccessfulPayment(invoice);
      }
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      if (failedInvoice.subscription) {
        await handleFailedPayment(failedInvoice);
      }
      break;
  }
}

/**
 * Updates subscription information in database
 */
async function updateSubscriptionInDatabase(subscription: Stripe.Subscription): Promise<void> {
  try {
    // Find user with this subscription
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscription.id));
    
    if (!user) {
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const userId = customer.metadata.userId;
      
      if (!userId) {
        throw new Error('Could not find user for subscription');
      }
      
      // Update user with subscription info
      await db.update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          subscriptionStartDate: new Date(subscription.current_period_start * 1000),
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        })
        .where(eq(users.id, userId));
    } else {
      // Update existing user subscription info
      await db.update(users)
        .set({
          subscriptionStatus: subscription.status,
          trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          subscriptionStartDate: new Date(subscription.current_period_start * 1000),
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        })
        .where(eq(users.id, user.id));
    }
  } catch (error) {
    console.error('Error updating subscription in database:', error);
  }
}

/**
 * Handles deleted subscription
 */
async function handleDeletedSubscription(subscription: Stripe.Subscription): Promise<void> {
  try {
    // Update user subscription status to canceled
    await db.update(users)
      .set({
        subscriptionStatus: 'canceled',
      })
      .where(eq(users.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('Error handling deleted subscription:', error);
  }
}

/**
 * Handles successful payment
 */
async function handleSuccessfulPayment(invoice: Stripe.Invoice): Promise<void> {
  try {
    // Update user subscription status if needed
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await updateSubscriptionInDatabase(subscription);
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Handles failed payment
 */
async function handleFailedPayment(invoice: Stripe.Invoice): Promise<void> {
  try {
    // Update user subscription status if needed
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await updateSubscriptionInDatabase(subscription);
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}