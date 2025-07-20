import { Router } from 'express';
import memoize from 'memoizee';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';
import { sendClientInvitation } from '../email';
import { generateWordsWithSound, generateTopicPhrases } from '../openai';

const router = Router();

// Memoize OpenAI calls for therapist tools
const memoizedGenerateWordsWithSound = memoize(generateWordsWithSound, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGenerateTopicPhrases = memoize(generateTopicPhrases, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour

// Get therapist's assigned clients and pending invitations
router.get('/clients', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const clients = await storage.getTherapistClients(therapistId);
  const pendingInvitations = await storage.getPendingInvitations(therapistId);
  
  return success(res, {
    clients,
    pendingInvitations
  });
}));

// Add new client to therapist's roster by email
router.post('/clients', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const { clientEmail, notes } = req.body;
  
  const user = await storage.getUser(therapistId);
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const existingClients = await storage.getClientsByEmail(therapistId, [clientEmail]);
  
  if (existingClients.length > 0) {
    const client = existingClients[0];
    
    const existingRelationships = await storage.getTherapistClients(therapistId);
    const existingRelationship = existingRelationships.find(rel => rel.clientId === client.id);
    
    if (existingRelationship) {
      return error(res, 'Client is already assigned to you', 400);
    }
    
    const relationship = await storage.addTherapistClient({
      therapistId,
      clientId: client.id,
      isActive: true,
      notes: notes || null
    });
    
    return success(res, relationship, 201);
  } else {
    const invitation = await storage.createClientInvitation({
      therapistId,
      clientEmail,
      notes: notes || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    
    try {
      const therapistName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      await sendClientInvitation({
        clientEmail,
        therapistName,
        invitationToken: invitation.invitationToken,
        baseUrl
      });
      
      console.log('✅ Client invitation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
    }
    
    return success(res, {
      type: 'invitation',
      invitation,
      message: 'Invitation sent successfully'
    }, 201);
  }
}));

// Remove client from therapist's roster
router.delete('/clients/:clientId', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const { clientId } = req.params;
  
  const user = await storage.getUser(therapistId);
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  await storage.removeTherapistClient(therapistId, clientId);
  return success(res, { success: true });
}));

// Endpoint for therapists to get real-time assignment progress for all their patients
router.get('/assignments', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const assignments = await storage.getTherapistAssignments(therapistId);
  return success(res, assignments);
}));

// Get therapist's content library
router.get('/library', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const library = await storage.getContentLibrary(therapistId);
  return success(res, library);
}));

// Get public content library
router.get('/library/public', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const publicLibrary = await storage.getPublicContentLibrary();
  return success(res, publicLibrary);
}));

// Create new content library item
router.post('/library', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const contentData = {
    ...req.body,
    createdBy: therapistId
  };
  
  const content = await storage.createContentLibraryItem(contentData);
  return success(res, content, 201);
}));

// Generate words with sound endpoint for therapists
router.post('/generate-words', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const { sound, difficulty, count } = req.body;
  
  if (!sound) {
    return error(res, 'Sound parameter is required', 400);
  }
  
  const words = await memoizedGenerateWordsWithSound(sound, count || 8, difficulty || "4");
  return success(res, { words });
}));

// Generate topic-based words/phrases for therapists
router.post('/generate-topic', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const { topic, difficulty, type } = req.body;
  
  if (!topic) {
    return error(res, 'Topic parameter is required', 400);
  }
  
  const items = await memoizedGenerateTopicPhrases(topic, difficulty || "4", type || "words");
  return success(res, { items });
}));

export default router;
