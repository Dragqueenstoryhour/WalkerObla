#!/usr/bin/env node

/**
 * Database checking script for user activities
 * This script helps verify the database state and table structure
 * 
 * Usage:
 * 1. Make sure your DATABASE_URL is set
 * 2. Run: node check-database.js
 */

const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

class DatabaseChecker {
  constructor() {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      process.exit(1);
    }
    
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async checkConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection successful');
      console.log(`   Current time: ${result.rows[0].now}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async checkTableExists(tableName) {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      client.release();
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Table '${tableName}': ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      return exists;
    } catch (error) {
      console.error(`❌ Error checking table '${tableName}':`, error.message);
      return false;
    }
  }

  async getTableStructure(tableName) {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      client.release();
      
      if (result.rows.length === 0) {
        console.log(`❌ No columns found for table '${tableName}'`);
        return [];
      }
      
      console.log(`\n📋 Table structure for '${tableName}':`);
      console.log('Column Name'.padEnd(20), 'Type'.padEnd(15), 'Nullable', 'Default');
      console.log('-'.repeat(70));
      
      result.rows.forEach(col => {
        console.log(
          col.column_name.padEnd(20),
          col.data_type.padEnd(15),
          col.is_nullable.padEnd(8),
          col.column_default || 'NULL'
        );
      });
      
      return result.rows;
    } catch (error) {
      console.error(`❌ Error getting structure for '${tableName}':`, error.message);
      return [];
    }
  }

  async countRecords(tableName) {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      client.release();
      
      const count = parseInt(result.rows[0].count);
      console.log(`📊 Table '${tableName}' has ${count} records`);
      return count;
    } catch (error) {
      console.error(`❌ Error counting records in '${tableName}':`, error.message);
      return 0;
    }
  }

  async getUserActivitySample() {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT id, user_id, activity_type, item_practiced, score, created_at
        FROM user_activity 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      client.release();
      
      if (result.rows.length === 0) {
        console.log('📭 No user activities found in database');
        return [];
      }
      
      console.log('\n📝 Sample user activities:');
      console.log('ID'.padEnd(5), 'User ID'.padEnd(15), 'Type'.padEnd(15), 'Item'.padEnd(20), 'Score', 'Created At');
      console.log('-'.repeat(90));
      
      result.rows.forEach(row => {
        console.log(
          row.id.toString().padEnd(5),
          (row.user_id || 'NULL').padEnd(15),
          (row.activity_type || 'NULL').padEnd(15),
          (row.item_practiced || 'NULL').substring(0, 18).padEnd(20),
          (row.score || 'NULL').toString().padEnd(5),
          row.created_at ? new Date(row.created_at).toISOString().substring(0, 19) : 'NULL'
        );
      });
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting user activity sample:', error.message);
      return [];
    }
  }

  async getUserSample() {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT id, username, email, role, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      client.release();
      
      if (result.rows.length === 0) {
        console.log('📭 No users found in database');
        return [];
      }
      
      console.log('\n👥 Sample users:');
      console.log('ID'.padEnd(20), 'Username'.padEnd(15), 'Email'.padEnd(25), 'Role'.padEnd(10), 'Created At');
      console.log('-'.repeat(90));
      
      result.rows.forEach(row => {
        console.log(
          (row.id || 'NULL').substring(0, 18).padEnd(20),
          (row.username || 'NULL').padEnd(15),
          (row.email || 'NULL').padEnd(25),
          (row.role || 'NULL').padEnd(10),
          row.created_at ? new Date(row.created_at).toISOString().substring(0, 19) : 'NULL'
        );
      });
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting users sample:', error.message);
      return [];
    }
  }

  async checkUserActivitiesByType() {
    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT 
          activity_type,
          COUNT(*) as total_count,
          COUNT(score) as scored_count,
          AVG(score) as avg_score,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM user_activity 
        GROUP BY activity_type
        ORDER BY total_count DESC
      `);
      client.release();
      
      if (result.rows.length === 0) {
        console.log('📭 No user activities found for analysis');
        return [];
      }
      
      console.log('\n📊 User activities by type:');
      console.log('Type'.padEnd(18), 'Total', 'Scored', 'Avg Score', 'Earliest'.padEnd(12), 'Latest');
      console.log('-'.repeat(80));
      
      result.rows.forEach(row => {
        console.log(
          (row.activity_type || 'NULL').padEnd(18),
          row.total_count.toString().padEnd(5),
          row.scored_count.toString().padEnd(6),
          row.avg_score ? Math.round(row.avg_score).toString().padEnd(9) : 'NULL'.padEnd(9),
          row.earliest ? row.earliest.toISOString().substring(0, 10).padEnd(12) : 'NULL'.padEnd(12),
          row.latest ? row.latest.toISOString().substring(0, 10) : 'NULL'
        );
      });
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error analyzing user activities by type:', error.message);
      return [];
    }
  }

  async runFullCheck() {
    console.log('🔍 DATABASE HEALTH CHECK FOR USER ACTIVITIES');
    console.log('=' .repeat(60));
    
    // Check connection
    const connected = await this.checkConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed without database connection');
      return;
    }
    
    console.log('\n📋 CHECKING REQUIRED TABLES');
    console.log('-' .repeat(30));
    
    // Check if required tables exist
    const requiredTables = ['users', 'user_activity', 'user_stats'];
    const tableStatus = {};
    
    for (const table of requiredTables) {
      tableStatus[table] = await this.checkTableExists(table);
    }
    
    // Get table structures for existing tables
    for (const table of requiredTables) {
      if (tableStatus[table]) {
        await this.getTableStructure(table);
      }
    }
    
    console.log('\n📊 RECORD COUNTS');
    console.log('-' .repeat(20));
    
    // Count records in existing tables
    for (const table of requiredTables) {
      if (tableStatus[table]) {
        await this.countRecords(table);
      }
    }
    
    // Show sample data if user_activity table exists
    if (tableStatus['user_activity']) {
      await this.getUserActivitySample();
      await this.checkUserActivitiesByType();
    }
    
    // Show sample users if users table exists
    if (tableStatus['users']) {
      await this.getUserSample();
    }
    
    console.log('\n🎯 SUMMARY & RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (!tableStatus['user_activity']) {
      console.log(`
❌ CRITICAL: user_activity table is missing!
   This is required for the activity endpoints to work.
   
   To fix:
   1. Check if you have pending migrations: npm run db:push
   2. Look for migration files that create user_activity table
   3. The table should be defined in shared/schema.ts
`);
    } else if (await this.countRecords('user_activity') === 0) {
      console.log(`
⚠️  user_activity table exists but is empty.
   This means:
   - New user with no practice activities yet
   - Activities endpoints will return empty arrays
   - This is normal for new users
   
   To create test data:
   1. Use the app to practice words/phrases with assessment
   2. Use the /api/user/activity POST endpoint
   3. Run: node test-user-activities.js --test-sample
`);
    } else {
      console.log(`
✅ user_activity table exists and has data.
   If endpoints are still returning empty:
   1. Check authentication (JWT tokens)
   2. Verify user ID in requests matches database
   3. Check if activities have scores (null vs number)
   4. Look for errors in server logs
`);
    }
    
    await this.pool.end();
  }
}

// Run the check
async function main() {
  const checker = new DatabaseChecker();
  await checker.runFullCheck();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseChecker };