import { Router } from 'express';
import { storage } from '../storage';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';

const router = Router();

// Accept invitation endpoint - requires authentication
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
    const userAssignments = await storage.getAssignments(userId);
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