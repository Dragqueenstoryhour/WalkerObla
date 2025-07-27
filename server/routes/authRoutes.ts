import { Router } from 'express';
import { supabase } from '../supabaseClient';
import { storage } from '../storage';
import { createClient } from '@supabase/supabase-js';

// Create admin client for user creation
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminSupabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Admin Supabase client created for user management');
} else {
  console.warn('⚠️ Missing service role key, will fallback to regular signup');
}

const authRoutes = Router();

// 1. User Registration (Signup)
authRoutes.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName, role, licenseNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required.' });
  }

  try {
    console.log('🔧 Checking for existing user before creating:', email);
    
    // FIRST: Check if user already exists in our custom database
    const existingCustomUser = await storage.getUserByEmail(email);
    if (existingCustomUser) {
      console.log('❌ User already exists with role:', existingCustomUser.role);
      return res.status(409).json({ 
        error: `Account already exists with role: ${existingCustomUser.role}. Please sign in or use "Forgot My Password" to reset your password.` 
      });
    }

    // SECOND: Check if user exists in Supabase auth
    let existingAuthUser = null;
    if (adminSupabase) {
      try {
        const { data: userData } = await adminSupabase.auth.admin.getUserByEmail(email);
        existingAuthUser = userData.user;
        if (existingAuthUser) {
          console.log('❌ Supabase auth user already exists:', email);
          return res.status(409).json({ 
            error: 'Account already exists - please sign in or use "Forgot My Password" to reset your password.' 
          });
        }
      } catch (err) {
        console.log('✅ No existing Supabase user found, proceeding with creation');
      }
    }

    console.log('🔧 Creating new user with admin API:', email);
    
    let data: any, error: any;
    
    if (adminSupabase) {
      // Use admin client with service role key to create CONFIRMED user
      const result = await adminSupabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { 
          firstName,
          lastName,
          role: role || 'client'
        },
        email_confirm: true, // Force email to be confirmed immediately
        phone_confirm: true, // Also confirm phone if needed
      });
      data = result.data;
      error = result.error;
      
      if (data.user) {
        console.log('✅ User created with admin API, email confirmed:', data.user.email);
        console.log('✅ User confirmation status:', data.user.email_confirmed_at ? 'CONFIRMED' : 'NOT CONFIRMED');
      }
    } else {
      // Fallback approach: Use regular signup but modify project settings
      console.log('⚠️ Admin client not available, using regular signup');
      console.log('🚨 WARNING: This will require email confirmation unless Supabase settings are changed');
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            firstName,
            lastName,
            role: role || 'client'
          },
        },
      });
      data = result.data;
      error = result.error;
    }

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
        return res.status(409).json({ 
          error: 'Account already exists - please sign in or use "Forgot My Password" to reset your password.' 
        });
      }
      if (error.message.includes('Invalid email') || error.message.includes('Password should be at least 6 characters')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(500).json({ error: 'User creation failed: No user data returned.' });
    }

    // Create user record in our custom database table
    try {
      const customUser = await storage.upsertUser({
        id: data.user.id,
        username: `${firstName}_${lastName}_${Date.now()}`.toLowerCase(), // Generate unique username
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: role || 'client',
        licenseNumber: licenseNumber || null,
      });

      console.log('Created custom user record:', customUser.email, 'with role:', customUser.role);

      // Check if user was actually confirmed by admin API
      const isUserConfirmed = data.user?.email_confirmed_at !== null;
      console.log('📧 User email confirmation status:', isUserConfirmed ? 'CONFIRMED' : 'NOT CONFIRMED');
      
      if (!isUserConfirmed) {
        console.log('⚠️ Admin API failed to confirm user email - Supabase project settings may override admin API');
        console.log('💡 SOLUTION: Disable "Enable email confirmations" in Supabase Dashboard → Authentication → Settings');
        return res.status(200).json({
          message: 'User registered successfully. Please check your email for verification.',
          user: customUser,
          needsEmailConfirmation: true,
        });
      }

      // User is confirmed, attempt immediate sign-in
      console.log('🔑 Attempting immediate sign-in for confirmed user:', customUser.email);
      try {
        // Use admin client for sign-in to ensure it works with confirmed users
        const signInClient = adminSupabase || supabase;
        const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('❌ Failed to sign in newly created user:', signInError.message);
          console.log('🔧 Possible causes:');
          console.log('   1. Password policy enforcement');
          console.log('   2. User not actually confirmed despite admin API');
          console.log('   3. Supabase project settings preventing sign-in');
          
          return res.status(500).json({ 
            error: 'Account created but failed to sign in. Please try logging in manually.',
            debug: signInError.message 
          });
        }

        if (signInData.session) {
          // Successfully created account and signed in
          console.log('🎉 User created and signed in successfully:', customUser.email);
          console.log('🎯 Returning session for immediate frontend login');
          console.log('✅ Session details:', {
            userId: signInData.user?.id,
            email: signInData.user?.email,
            confirmed: signInData.user?.email_confirmed_at ? 'YES' : 'NO'
          });
          
          return res.status(200).json({
            message: 'User registered and logged in successfully.',
            user: customUser,
            session: signInData.session,
          });
        } else {
          console.error('❌ No session returned despite successful auth');
          return res.status(500).json({ 
            error: 'Account created but no session returned. Please try logging in manually.' 
          });
        }
      } catch (signInErr) {
        console.error('❌ Exception during immediate sign-in attempt:', signInErr);
        return res.status(500).json({ 
          error: 'Account created but failed to establish session. Please try logging in manually.',
          debug: signInErr.message 
        });
      }
    } catch (dbError: any) {
      console.error('Database user creation error:', dbError);
      // If database creation fails, we should clean up the Supabase user
      // but for now, just return an error
      return res.status(500).json({ error: 'Failed to create user profile in database.' });
    }
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// 2. User Login
authRoutes.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle specific Supabase errors for login
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (error.message.includes('Email not confirmed')) {
        return res.status(401).json({ error: 'Please confirm your email address before logging in.' });
      }
      return res.status(500).json({ error: error.message });
    }

    if (data.session && data.user) {
      console.log('LOGIN ENDPOINT: Processing login for user:', data.user.email);
      // Get custom user data from our database
      try {
        const customUser = await storage.getUser(data.user.id);
        
        if (!customUser) {
          console.log('LOGIN ENDPOINT: No custom user found during login, creating from Supabase user data...');
          console.log('LOGIN ENDPOINT: Supabase user metadata:', data.user.user_metadata);
          // If no custom user exists, create one from Supabase metadata
          const createdUser = await storage.upsertUser({
            id: data.user.id,
            username: data.user.email?.split('@')[0] || `user_${Date.now()}`,
            email: data.user.email || '',
            firstName: data.user.user_metadata?.firstName || '',
            lastName: data.user.user_metadata?.lastName || '',
            role: data.user.user_metadata?.role || 'client',
          });
          
          console.log('LOGIN ENDPOINT: Created user during login with role:', createdUser.role);
          console.log('LOGIN ENDPOINT: Returning created user:', { id: createdUser.id, email: createdUser.email, role: createdUser.role });
          return res.status(200).json({
            message: 'Logged in successfully.',
            user: createdUser, // Return our custom user data
            session: data.session,
          });
        }

        console.log('LOGIN ENDPOINT: Found custom user during login with role:', customUser.role);
        console.log('LOGIN ENDPOINT: Returning existing user:', { id: customUser.id, email: customUser.email, role: customUser.role });
        return res.status(200).json({
          message: 'Logged in successfully.',
          user: customUser, // Return our custom user data instead of Supabase user
          session: data.session,
        });
      } catch (dbError: any) {
        console.error('LOGIN ENDPOINT: Database error during login:', dbError);
        // Fallback to Supabase user if database fails
        console.log('LOGIN ENDPOINT: Falling back to Supabase user data');
        return res.status(200).json({
          message: 'Logged in successfully.',
          user: data.user,
          session: data.session,
        });
      }
    } else {
      return res.status(500).json({ error: 'Login failed: No session or user data returned.' });
    }
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. User Logout
authRoutes.post('/logout', async (req, res) => {
  try {
    // Server-side logout is primarily for logging purposes
    // The actual session invalidation is handled on the client side
    console.log('User logout request received');
    
    // Optionally: Add any server-side cleanup logic here
    // (e.g., clearing server-side sessions, logging logout events, etc.)
    
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error during logout.' });
  }
});

// Get current user
authRoutes.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No valid Bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token in Authorization header.' });
    }

    console.log('Attempting to verify token for user auth...');
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase getUser error:', error.message, error.status);
      // Handle different types of auth errors
      if (error.message.includes('Invalid JWT') || 
          error.message.includes('JWT expired') ||
          error.message.includes('Auth session missing') ||
          error.status === 401) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
      }
      // For any other Supabase client error, return 500
      return res.status(500).json({ error: error.message || 'Supabase client error.' });
    }

    if (!supabaseUser) {
      return res.status(401).json({ error: 'Unauthorized: No user found for this token.' });
    }

    console.log('USER ENDPOINT: Supabase user authenticated:', supabaseUser.email);

    // Get custom user data from our database
    try {
      const customUser = await storage.getUser(supabaseUser.id);
      
      if (!customUser) {
        console.log('USER ENDPOINT: No custom user found, creating from Supabase user data...');
        console.log('USER ENDPOINT: Supabase user metadata:', supabaseUser.user_metadata);
        
        // TEMPORARY FIX: Override role for testing account
        let userRole = supabaseUser.user_metadata?.role || 'client';
        if (supabaseUser.email === 'walkereloucks@gmail.com') {
          console.log('USER ENDPOINT: TEMPORARY FIX - Setting role to therapist for test account');
          userRole = 'therapist';
        }
        
        // If no custom user exists, create one from Supabase metadata
        const createdUser = await storage.upsertUser({
          id: supabaseUser.id,
          username: supabaseUser.email?.split('@')[0] || `user_${Date.now()}`,
          email: supabaseUser.email || '',
          firstName: supabaseUser.user_metadata?.firstName || '',
          lastName: supabaseUser.user_metadata?.lastName || '',
          role: userRole,
        });
        
        console.log('USER ENDPOINT: Created user from metadata with role:', createdUser.role);
        console.log('USER ENDPOINT: Returning created user:', { id: createdUser.id, email: createdUser.email, role: createdUser.role });
        return res.status(200).json({ user: createdUser });
      }

      console.log('USER ENDPOINT: Found custom user with role:', customUser.role);
      
      // TEMPORARY FIX: Update role for testing account if it's wrong
      if (customUser.email === 'walkereloucks@gmail.com' && customUser.role !== 'therapist') {
        console.log('USER ENDPOINT: TEMPORARY FIX - Updating test account role from', customUser.role, 'to therapist');
        const updatedUser = await storage.upsertUser({
          ...customUser,
          role: 'therapist',
        });
        console.log('USER ENDPOINT: Updated user role to:', updatedUser.role);
        return res.status(200).json({ user: updatedUser });
      }
      
      console.log('USER ENDPOINT: Returning existing user:', { id: customUser.id, email: customUser.email, role: customUser.role });
      return res.status(200).json({ user: customUser });
    } catch (dbError: any) {
      console.error('USER ENDPOINT: Database error fetching user:', dbError);
      // Fallback to Supabase user if database fails
      console.log('USER ENDPOINT: Falling back to Supabase user data');
      return res.status(200).json({ user: supabaseUser });
    }
  } catch (err: any) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Internal server error while fetching user.' });
  }
});

export default authRoutes;