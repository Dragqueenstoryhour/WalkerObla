import { Router } from 'express';
import { storage } from '../storage';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { createClient } from '@supabase/supabase-js';

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
  console.log('✅ Admin Supabase client created for invitation routes');
} else {
  console.warn('⚠️ Missing service role key in invitation routes');
}

const router = Router();

// Accept invitation with password setup - no authentication required
router.post('/accept', catchAsync(async (req: any, res) => {
  console.log('🚀 INVITATION ACCEPT ENDPOINT HIT!', req.body);
  const { invitationToken, password } = req.body;

  if (!invitationToken || !password) {
    console.log('❌ Missing required fields:', { invitationToken: !!invitationToken, password: !!password });
    return error(res, 'Invitation token and password are required', 400);
  }

  console.log(`🎯 Setting up password for invitation token: ${invitationToken}`);

  // Get invitation details
  const invitation = await storage.getClientInvitationByToken(invitationToken);
  if (!invitation) {
    console.log(`❌ Invitation not found for token: ${invitationToken}`);
    return error(res, 'Invalid or expired invitation link', 404);
  }

  // Check if invitation is still valid
  if (invitation.status !== 'pending') {
    console.log(`❌ Invitation already processed: ${invitation.status}`);
    return error(res, 'Invitation has already been used', 400);
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    console.log(`❌ Invitation expired: ${invitation.expiresAt}`);
    return error(res, 'Invitation has expired', 400);
  }

  try {
    // Get the user by email to find their Supabase ID
    const user = await storage.getUserByEmail(invitation.clientEmail);
    if (!user) {
      return error(res, 'User account not found', 404);
    }

    console.log(`🔍 User ID from database: ${user.id} (type: ${typeof user.id})`);

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error('Failed to update user password:', updateError);
      return error(res, 'Failed to set password', 500);
    }

    // Create or update therapist-client relationship
    const existingRelationship = await storage.getTherapistClient(invitation.therapistId, user.id);
    
    if (existingRelationship) {
      if (!existingRelationship.isActive) {
        await storage.updateTherapistClientStatus(invitation.therapistId, user.id, true);
        console.log(`🔄 Reactivated relationship between ${invitation.therapistId} and ${user.id}`);
      }
    } else {
      await storage.addTherapistClient({
        therapistId: invitation.therapistId,
        clientId: user.id,
        isActive: true,
        notes: `Accepted invitation on ${new Date().toISOString()}`
      });
      console.log(`✅ Created new relationship between ${invitation.therapistId} and ${user.id}`);
    }

    // Mark invitation as accepted
    await storage.updateClientInvitationStatus(invitation.id, 'accepted', new Date());
    console.log(`✅ Invitation ${invitation.id} marked as accepted`);

    // Get therapist information for response
    const therapist = await storage.getUser(invitation.therapistId);
    const therapistName = therapist?.firstName && therapist?.lastName 
      ? `${therapist.firstName} ${therapist.lastName}` 
      : therapist?.username || 'Your Therapist';

    console.log(`🎉 Password set and invitation accepted successfully for ${invitation.clientEmail}`);

    return success(res, {
      message: 'Account created successfully',
      therapistName,
      userEmail: invitation.clientEmail
    }, 200);

  } catch (err: any) {
    console.error(`❌ Error setting up password:`, err);
    return error(res, 'Failed to create account', 500);
  }
}));

// Accept invitation endpoint - requires authentication (legacy)
router.post('/accept/:token', protect, catchAsync(async (req: any, res) => {
  const { token } = req.params;
  const userId = req.user.claims.sub;
  const userEmail = req.user.email;

  console.log(`🎯 Accepting invitation with token: ${token} for user: ${userEmail}`);

  // Get invitation details
  const invitation = await storage.getClientInvitationByToken(token);
  if (!invitation) {
    console.log(`❌ Invitation not found for token: ${token}`);
    return error(res, 'Invitation not found or expired', 404);
  }

  // Check if invitation is still valid
  if (invitation.status !== 'pending') {
    console.log(`❌ Invitation already processed: ${invitation.status}`);
    return error(res, 'Invitation has already been processed', 400);
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    console.log(`❌ Invitation expired: ${invitation.expiresAt}`);
    return error(res, 'Invitation has expired', 400);
  }

  // Verify email matches (case insensitive)
  if (invitation.clientEmail.toLowerCase() !== userEmail.toLowerCase()) {
    console.log(`❌ Email mismatch. Invitation: ${invitation.clientEmail}, User: ${userEmail}`);
    return error(res, 'This invitation is not for your email address', 403);
  }

  try {
    // Get the current user from database
    const user = await storage.getUser(userId);
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Check if therapist-client relationship already exists
    const existingRelationship = await storage.getTherapistClient(invitation.therapistId, userId);
    
    if (existingRelationship) {
      if (existingRelationship.isActive) {
        // Relationship already exists and is active
        console.log(`✅ Relationship already active between ${invitation.therapistId} and ${userId}`);
      } else {
        // Reactivate existing relationship
        await storage.updateTherapistClientStatus(invitation.therapistId, userId, true);
        console.log(`🔄 Reactivated relationship between ${invitation.therapistId} and ${userId}`);
      }
    } else {
      // Create new therapist-client relationship
      await storage.addTherapistClient({
        therapistId: invitation.therapistId,
        clientId: userId,
        isActive: true,
        notes: `Accepted invitation on ${new Date().toISOString()}`
      });
      console.log(`✅ Created new relationship between ${invitation.therapistId} and ${userId}`);
    }

    // Mark invitation as accepted
    await storage.updateClientInvitationStatus(invitation.id, 'accepted', new Date());
    console.log(`✅ Invitation ${invitation.id} marked as accepted`);

    // Get therapist information for response
    const therapist = await storage.getUser(invitation.therapistId);
    const therapistName = therapist?.firstName && therapist?.lastName 
      ? `${therapist.firstName} ${therapist.lastName}` 
      : therapist?.username || 'Your Therapist';

    // Check if user has any assignments
    const userAssignments = await storage.getUserAssignments(userId);
    const hasAssignments = userAssignments && userAssignments.length > 0;

    console.log(`🎉 Invitation accepted successfully for ${userEmail}`);

    return success(res, {
      message: 'Invitation accepted successfully',
      therapistName,
      hasAssignments,
      assignmentsCount: userAssignments?.length || 0,
      firstAssignment: hasAssignments ? userAssignments[0] : null
    }, 200);

  } catch (err: any) {
    console.error(`❌ Error accepting invitation:`, err);
    return error(res, 'Failed to accept invitation', 500);
  }
}));

export default router;
