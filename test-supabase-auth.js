// Test script for Supabase Auth integration
// Run with: node test-supabase-auth.js

import { createClient } from '@supabase/supabase-js';

// Supabase connection details
const supabaseUrl = 'https://hehogfyncmkakwxrgocj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaG9nZnluY21rYWt3eHJnb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njg2NDksImV4cCI6MjA2MjU0NDY0OX0.yR5n4YzA4sbr4GQejD_yT4mnPU6_Zwhs9twDvOu60Jk';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection by getting the Supabase auth configuration
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log('Session data:', data);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function testSignUp() {
  console.log('\nTesting sign up functionality...');
  
  // Generate a random email to avoid conflicts
  const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'Password123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: randomEmail,
      password: password,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });
    
    if (error) {
      console.error('❌ Sign up failed:', error.message);
      return false;
    }
    
    console.log('✅ Sign up successful!');
    console.log('User data:', data.user);
    return true;
  } catch (error) {
    console.error('❌ Sign up failed:', error.message);
    return false;
  }
}

async function testOAuthUrl() {
  console.log('\nTesting Google OAuth URL generation...');
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5000/api/auth/callback'
      }
    });
    
    if (error) {
      console.error('❌ OAuth URL generation failed:', error.message);
      return false;
    }
    
    console.log('✅ OAuth URL generation successful!');
    console.log('OAuth URL:', data.url);
    return true;
  } catch (error) {
    console.error('❌ OAuth URL generation failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('==== Supabase Auth Integration Test ====\n');
  
  // Test connection
  const connectionResult = await testConnection();
  if (!connectionResult) {
    console.error('Connection test failed. Please check your Supabase URL and key.');
    return;
  }
  
  // Test sign up
  const signUpResult = await testSignUp();
  if (!signUpResult) {
    console.error('Sign up test failed. Please check your Supabase configuration.');
  }
  
  // Test OAuth URL generation
  const oauthResult = await testOAuthUrl();
  if (!oauthResult) {
    console.error('OAuth URL generation test failed. Please check your Supabase configuration.');
  }
  
  console.log('\n==== Test Summary ====');
  console.log(`Connection test: ${connectionResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Sign up test: ${signUpResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`OAuth URL test: ${oauthResult ? '✅ Passed' : '❌ Failed'}`);
}

runTests().catch(error => {
  console.error('Test failed with an unexpected error:', error);
});