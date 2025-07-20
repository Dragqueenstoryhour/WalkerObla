#!/usr/bin/env node

/**
 * Comprehensive test script for user activity API endpoints
 * This helps debug data structures and test various scenarios
 * 
 * Usage:
 * 1. Start your server: npm run dev
 * 2. Run this script: node test-user-activities.js
 * 3. Or run specific tests: node test-user-activities.js --test-auth
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Test scenarios for debugging the user activity endpoints
 */
class UserActivityTester {
  constructor() {
    this.authToken = null;
    this.userId = null;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Add auth if available
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers,
        ...options
      });
      
      const data = await response.json();
      
      console.log(`\n=== ${options.method || 'GET'} ${endpoint} ===`);
      console.log(`Status: ${response.status}`);
      
      if (response.status >= 400) {
        console.log(`❌ Error Response:`, JSON.stringify(data, null, 2));
      } else {
        console.log(`✅ Success Response:`, JSON.stringify(data, null, 2));
      }
      
      return { response, data };
    } catch (error) {
      console.error(`❌ Network Error calling ${endpoint}:`, error.message);
      return { response: null, data: null, error };
    }
  }

  async testEndpointStructures() {
    console.log('\n🔍 TESTING USER ACTIVITY ENDPOINT STRUCTURES');
    console.log('=' .repeat(60));
    
    const endpoints = [
      '/api/user/activities/words',
      '/api/user/activities/phrases', 
      '/api/user/activities/readings',
      '/api/user/recent-activities',
      '/api/user/activity-stats',
      '/api/user/stats'
    ];

    for (const endpoint of endpoints) {
      await this.makeRequest(endpoint);
    }

    // Test pagination
    console.log('\n📄 Testing pagination...');
    await this.makeRequest('/api/user/recent-activities?page=1&limit=5');
    await this.makeRequest('/api/user/recent-activities?page=2&limit=3');
  }

  async createSampleActivity(activityType = 'word_practice', withScore = true) {
    const activityData = {
      activityType,
      itemPracticed: activityType === 'word_practice' ? 'hello' : 
                    activityType === 'phrase_practice' ? 'Hello world' : 
                    'Reading passage about nature',
      duration: 30,
      difficulty: 'easy',
      source: 'test',
      metadata: { testData: true }
    };

    if (withScore) {
      activityData.score = 85;
      activityData.accuracy = 90;
      activityData.fluency = 80;
      activityData.completeness = 95;
    }

    return await this.makeRequest('/api/user/activity', {
      method: 'POST',
      body: JSON.stringify(activityData)
    });
  }

  async testWithSampleData() {
    console.log('\n📝 CREATING SAMPLE DATA FOR TESTING');
    console.log('=' .repeat(60));

    // Create various types of activities
    console.log('\n➕ Creating sample activities...');
    
    // Word practices with scores
    await this.createSampleActivity('word_practice', true);
    await this.createSampleActivity('word_practice', true);
    
    // Phrase practices with scores  
    await this.createSampleActivity('phrase_practice', true);
    
    // Reading sessions with scores
    await this.createSampleActivity('reading_session', true);
    
    // Some activities without scores (practice without assessment)
    await this.createSampleActivity('word_practice', false);
    await this.createSampleActivity('phrase_practice', false);

    console.log('\n✅ Sample data created. Testing endpoints again...');
    await this.testEndpointStructures();
  }

  async testEmptyState() {
    console.log('\n🗂️ TESTING EMPTY STATE SCENARIOS');
    console.log('=' .repeat(60));
    
    // This simulates a new user with no activities
    await this.testEndpointStructures();
  }

  async testAuthenticationScenarios() {
    console.log('\n🔐 TESTING AUTHENTICATION SCENARIOS');
    console.log('=' .repeat(60));

    // Test without auth
    console.log('\n❌ Testing without authentication...');
    this.authToken = null;
    await this.makeRequest('/api/user/activities/words');

    // Test with invalid auth
    console.log('\n❌ Testing with invalid authentication...');
    this.authToken = 'invalid-token';
    await this.makeRequest('/api/user/activities/words');

    // Test with mock valid auth (you'd need to implement this)
    console.log('\n✅ Testing with mock valid authentication...');
    this.authToken = 'mock-valid-token';
    await this.makeRequest('/api/user/activities/words');
  }

  async runDiagnostics() {
    console.log('\n🏥 RUNNING DIAGNOSTICS');
    console.log('=' .repeat(60));

    // Test server connectivity
    try {
      const { response } = await this.makeRequest('/api/user/stats');
      
      if (!response) {
        console.log('❌ Cannot connect to server. Is it running on port 3000?');
        console.log('   Try: npm run dev');
        return false;
      }

      if (response.status === 401) {
        console.log('🔐 Authentication required. This is expected for protected endpoints.');
        console.log('   The endpoints are working but need proper authentication.');
        return true;
      }

      if (response.status === 500) {
        console.log('💾 Database connection or server error.');
        console.log('   Check your DATABASE_URL environment variable.');
        return false;
      }

      return true;
    } catch (error) {
      console.log('❌ Server connectivity test failed:', error.message);
      return false;
    }
  }

  printExpectedStructures() {
    console.log('\n📋 EXPECTED DATA STRUCTURES');
    console.log('=' .repeat(60));
    console.log(`
🔹 /api/user/activities/words, /phrases, /readings:
   Return: UserActivity[] 
   Filters: Only activities with scores (assessment results)
   
🔹 /api/user/recent-activities:
   Return: {
     activities: UserActivity[],      // All activities (with and without scores)
     currentPage: number,
     totalPages: number, 
     totalCount: number,
     hasNextPage: boolean,
     hasPrevPage: boolean
   }

🔹 /api/user/activity-stats:
   Return: {
     wordStats: { total: number, avgScore: number, recent: UserActivity[] },
     phraseStats: { total: number, avgScore: number, recent: UserActivity[] },
     readingStats: { total: number, avgScore: number, recent: UserActivity[] }
   }

🔹 UserActivity Schema:
   {
     id: number,
     userId: string,
     activityType: 'word_practice' | 'phrase_practice' | 'reading_session',
     itemPracticed: string,           // The word/phrase/content practiced
     score: number | null,            // 0-100 pronunciation score (null if no assessment)
     accuracy: number | null,         // 0-100 accuracy score
     fluency: number | null,          // 0-100 fluency score  
     completeness: number | null,     // 0-100 completeness score
     duration: number | null,         // Practice duration in seconds
     difficulty: string | null,       // 'easy', 'medium', 'hard'
     source: string | null,           // Where practice came from
     metadata: object | null,         // Additional context
     createdAt: string                // ISO timestamp
   }

🚨 COMMON ISSUES:
   1. Empty arrays: New users have no activities yet
   2. Authentication: Endpoints require valid JWT tokens  
   3. No scores: Activities created without assessment have null scores
   4. Database: user_activity table may not exist or be empty
`);
  }

  async runAllTests() {
    console.log('🧪 COMPREHENSIVE USER ACTIVITY API TESTING');
    console.log('=' .repeat(60));
    console.log('This script will test the user activity endpoints and help debug issues.\n');

    // Run diagnostics first
    const serverOk = await this.runDiagnostics();
    if (!serverOk) {
      console.log('\n❌ Server diagnostics failed. Please fix server issues first.');
      return;
    }

    // Print expected structures
    this.printExpectedStructures();

    // Test authentication scenarios
    await this.testAuthenticationScenarios();

    // Test empty state (typical for new users)
    await this.testEmptyState();

    console.log('\n🎯 SUMMARY & RECOMMENDATIONS');
    console.log('=' .repeat(60));
    console.log(`
To fully test the user activity endpoints:

1. 🔑 AUTHENTICATION:
   - Implement proper authentication in your client
   - Use Supabase Auth or your auth system to get valid JWT tokens
   - Pass tokens in Authorization header: "Bearer <token>"

2. 📊 CREATE TEST DATA:
   - Use the pronunciation assessment endpoints to create activities with scores
   - Test both scored activities (with assessment) and unscored (practice only)
   - Try different activity types: word_practice, phrase_practice, reading_session

3. 🗄️ DATABASE CHECK:
   - Verify user_activity table exists and is accessible
   - Check if your user has any activities in the database
   - Run database migration if user_activity table is missing

4. 🐛 DEBUGGING STEPS:
   - Check server logs for errors
   - Verify DATABASE_URL environment variable
   - Test with a known user ID that has activity data
   - Use browser dev tools to inspect actual API calls from frontend

5. 📈 FRONTEND INTEGRATION:
   - Empty states should show "No data available" messages
   - Loading states should show while data is fetching
   - Error states should handle authentication and network failures
`);
  }
}

// Command line interface
async function main() {
  const tester = new UserActivityTester();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--test-auth')) {
    await tester.testAuthenticationScenarios();
  } else if (args.includes('--test-empty')) {
    await tester.testEmptyState();
  } else if (args.includes('--test-sample')) {
    await tester.testWithSampleData();
  } else if (args.includes('--structures')) {
    tester.printExpectedStructures();
  } else {
    await tester.runAllTests();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserActivityTester };