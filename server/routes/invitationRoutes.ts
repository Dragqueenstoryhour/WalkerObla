import { Router } from 'express';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';

const router = Router();

// Accept client invitation
router.post('/accept/:token', protect, catchAsync(async (req: any, res) => {
  const { token } = req.params;
  const userId = req.user.claims.sub;
  
  const invitation = await storage.getClientInvitationByToken(token);
  if (!invitation) {
    return error(res, 'Invitation not found or expired', 404);
  }
  
  if (invitation.status !== 'pending') {
    return error(res, 'Invitation has already been processed', 400);
  }
  
  if (new Date() > new Date(invitation.expiresAt)) {
    return error(res, 'Invitation has expired', 400);
  }
  
  const user = await storage.getUser(userId);
  if (user && user.email !== invitation.clientEmail) {
    await storage.upsertUser({
      ...user,
      email: invitation.clientEmail
    });
  }
  
  await storage.addTherapistClient({
    therapistId: invitation.therapistId,
    clientId: userId,
    isActive: true,
    notes: invitation.notes
  });
  
  // Transfer any email-based assignments to the newly registered user
  await storage.transferEmailAssignments(invitation.clientEmail, userId);
  
  const userAssignments = await storage.getUserAssignments(userId);
  const hasAssignments = userAssignments && userAssignments.length > 0;
  
  await storage.updateClientInvitationStatus(invitation.id, 'accepted', new Date());
  
  return success(res, { 
    success: true, 
    message: 'Invitation accepted successfully',
    hasAssignments 
  });
}));

export default router;
