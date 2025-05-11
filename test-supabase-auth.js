// A simple script to test the Supabase Auth integration
console.log('Testing Supabase Auth integration...');

// Test signup
const testSignup = async () => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }),
    });
    
    const data = await response.json();
    console.log('Signup response:', data);
    return data;
  } catch (error) {
    console.error('Signup error:', error);
  }
};

// Test login
const testLogin = async () => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });
    
    const data = await response.json();
    console.log('Login response:', data);
    return data;
  } catch (error) {
    console.error('Login error:', error);
  }
};

// Test get user
const testGetUser = async () => {
  try {
    const response = await fetch('/api/auth/user');
    const data = await response.json();
    console.log('Get user response:', data);
    return data;
  } catch (error) {
    console.error('Get user error:', error);
  }
};

// Test config endpoint
const testConfig = async () => {
  try {
    const response = await fetch('/api/auth/config');
    const data = await response.json();
    console.log('Config response:', data);
    return data;
  } catch (error) {
    console.error('Config error:', error);
  }
};

// Test logout
const testLogout = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Logout response:', data);
    return data;
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Run tests
const runTests = async () => {
  console.log('Testing API config...');
  await testConfig();
  
  console.log('\nTesting signup...');
  await testSignup();
  
  console.log('\nTesting login...');
  await testLogin();
  
  console.log('\nTesting get user...');
  await testGetUser();
  
  console.log('\nTesting logout...');
  await testLogout();
  
  console.log('\nTesting get user after logout...');
  await testGetUser();
};

// Run the tests
runTests();