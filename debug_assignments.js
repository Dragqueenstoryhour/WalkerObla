import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';

// Import schema
import { users, assignments } from './shared/schema.js';

async function debugAssignments() {
  // Create database connection using the same setup as the app
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  console.log('🔍 Debugging Assignment Loading Issue...\n');

  try {
    // 1. Check the specific user
    const targetUserId = 'a748274a-0b00-4de5-bf1b-35460cbf3a4e';
    const targetEmail = 'adamlowendick@gmail.com';
    
    console.log('1. Checking target user details:');
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId));
    console.log('Target User:', JSON.stringify(targetUser, null, 2));
    
    // 2. Check all users with the same email
    console.log('\n2. Checking all users with email:', targetEmail);
    const usersWithSameEmail = await db.select().from(users).where(eq(users.email, targetEmail));
    console.log('Users with same email:', JSON.stringify(usersWithSameEmail, null, 2));
    
    // 3. Check all assignments
    console.log('\n3. Checking all assignments:');
    const allAssignments = await db.select().from(assignments);
    console.log('Total assignments:', allAssignments.length);
    allAssignments.forEach(assignment => {
      console.log(`- Assignment ${assignment.id}: userId=${assignment.userId}, clientEmail=${assignment.clientEmail}, therapistId=${assignment.therapistId}, title=${assignment.title}`);
    });
    
    // 4. Check assignments for the synthetic client ID mentioned
    const syntheticClientId = 'client_1753321624644_6yoh6hexb';
    console.log('\n4. Checking assignments for synthetic client ID:', syntheticClientId);
    const syntheticAssignments = await db.select().from(assignments).where(eq(assignments.userId, syntheticClientId));
    console.log('Synthetic client assignments:', JSON.stringify(syntheticAssignments, null, 2));
    
    // 5. Check assignments with the target email
    console.log('\n5. Checking assignments with target email:', targetEmail);
    const emailAssignments = await db.select().from(assignments).where(eq(assignments.clientEmail, targetEmail));
    console.log('Email-based assignments:', JSON.stringify(emailAssignments, null, 2));
    
    // 6. Check therapist details
    const therapistId = 'walkereloucks+1@gmail.com';
    console.log('\n6. Checking therapist details:');
    const therapist = await db.select().from(users).where(eq(users.id, therapistId));
    console.log('Therapist:', JSON.stringify(therapist, null, 2));
    
    // 7. Check therapist assignments
    console.log('\n7. Checking all therapist assignments:');
    const therapistAssignments = await db.select().from(assignments).where(eq(assignments.therapistId, therapistId));
    console.log('Therapist assignments:', JSON.stringify(therapistAssignments, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugAssignments();