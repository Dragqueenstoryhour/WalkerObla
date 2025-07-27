import { Router } from 'express';
import memoize from 'memoizee';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';
import { sendClientInvitation, sendAssignmentNotification } from '../email';
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
  
  const clientRelationships = await storage.getTherapistClients(therapistId);
  const pendingInvitations = await storage.getPendingInvitations(therapistId);
  
  // Extract just the client data from the relationships
  const clients = clientRelationships.map(relationship => relationship.client);
  
  console.log(`🔍 Returning ${clients.length} clients to frontend:`, clients.map(c => ({ id: c.id, email: c.email, username: c.username })));
  
  return success(res, {
    clients,
    pendingInvitations
  });
}));

// Add new client to therapist's roster by email
router.post('/clients', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const { clientEmail, firstName, lastName, notes } = req.body;
  
  const user = await storage.getUser(therapistId);
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  try {
    // First, check if a user with this email already exists
    const existingUser = await storage.getUserByEmail(clientEmail);
    
    console.log(`🔍 Checking for existing user with email: ${clientEmail}`);
    console.log(`🔍 Found existing user:`, existingUser ? { id: existingUser.id, email: existingUser.email, role: existingUser.role } : 'None');
    
    if (existingUser) {
      // Check if this client is already associated with this therapist (including inactive relationships)
      const existingRelationship = await storage.getTherapistClient(therapistId, existingUser.id);
      
      console.log(`🔍 Checking relationship between therapist ${therapistId} and client ${existingUser.id}`);
      console.log(`🔍 Found existing relationship:`, existingRelationship ? { id: existingRelationship.id, isActive: existingRelationship.isActive } : 'None');
      
      if (existingRelationship) {
        if (existingRelationship.isActive) {
          // DEBUG: Let's check what getTherapistClients returns for debugging
          const allClients = await storage.getTherapistClients(therapistId);
          console.log(`🔍 All active clients for therapist:`, allClients.map(c => ({ 
            clientId: c.client.id, 
            email: c.client.email, 
            username: c.client.username,
            firstName: c.client.firstName,
            lastName: c.client.lastName,
            relationshipId: c.id,
            isActive: c.isActive 
          })));
          
          // DEBUG: Check if this specific client is in the list
          const thisClientInList = allClients.find(c => c.client.email === clientEmail);
          console.log(`🔍 Is ${clientEmail} in the active clients list?`, thisClientInList ? 'YES' : 'NO');
          
          if (!thisClientInList) {
            console.log(`❗ INCONSISTENCY DETECTED: Relationship exists and is active, but client not in getTherapistClients list!`);
            console.log(`❗ Relationship details:`, {
              id: existingRelationship.id,
              therapistId: existingRelationship.therapistId,
              clientId: existingRelationship.clientId,
              isActive: existingRelationship.isActive,
              assignedDate: existingRelationship.assignedDate
            });
            
            // FORCE FIX: If inconsistency detected, return success to force frontend refresh
            console.log(`🔧 FORCE FIX: Returning success to trigger frontend refresh`);
            return success(res, {
              type: 'inconsistency_fix',
              client: existingUser,
              relationship: existingRelationship,
              message: `Client ${clientEmail} is now available in your patient list`
            }, 200);
          }
          
          return error(res, `Client ${clientEmail} is already in your patient list`, 400);
        } else {
          // Reactivate the relationship instead of creating a new one
          console.log(`🔄 Reactivating existing relationship for ${clientEmail}`);
          const reactivatedRelationship = await storage.updateTherapistClientStatus(therapistId, existingUser.id, true);
          
          // Send invitation email for reactivated client
          try {
            // Create invitation record in database with secure token
            const invitation = await storage.createClientInvitation({
              therapistId,
              clientEmail: existingUser.email!,
              status: 'pending'
            });
            
            const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3001';
            
            await sendClientInvitation({
              clientEmail: existingUser.email!,
              clientName: existingUser.firstName && existingUser.lastName 
                ? `${existingUser.firstName} ${existingUser.lastName}` 
                : existingUser.username || 'Client',
              therapistName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || 'Your Therapist',
              invitationToken: invitation.invitationToken,
              baseUrl
            });
            console.log(`📧 Invitation email sent to reactivated client: ${clientEmail}`);
          } catch (emailError) {
            console.error(`❌ Failed to send invitation email to ${clientEmail}:`, emailError);
          }
          
          return success(res, {
            type: 'reactivated_client',
            client: existingUser,
            relationship: reactivatedRelationship,
            message: `Client ${clientEmail} reactivated and invitation sent successfully`
          }, 200);
        }
      }
      
      // Add existing user as new client to this therapist
      const relationship = await storage.addTherapistClient({
        therapistId,
        clientId: existingUser.id,
        isActive: true,
        notes: notes || null
      });

      // Send invitation email for existing user
      try {
        // Create invitation record in database with secure token
        const invitation = await storage.createClientInvitation({
          therapistId,
          clientEmail: existingUser.email!,
          status: 'pending'
        });
        
        const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3001';
        
        await sendClientInvitation({
          clientEmail: existingUser.email!,
          clientName: existingUser.firstName && existingUser.lastName 
            ? `${existingUser.firstName} ${existingUser.lastName}` 
            : existingUser.username || 'Client',
          therapistName: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.username || 'Your Therapist',
          invitationToken: invitation.invitationToken,
          baseUrl
        });
        console.log(`📧 Invitation email sent to existing user: ${clientEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send invitation email to ${clientEmail}:`, emailError);
      }

      console.log(`✅ Existing user added to client list: ${clientEmail} (ID: ${existingUser.id})`);
      
      return success(res, {
        type: 'existing_client',
        client: existingUser,
        relationship,
        message: `Existing user ${clientEmail} added to your client list and invitation sent successfully`
      }, 200);
    }
    
    // Create a new user account if none exists
    const timestamp = Date.now();
    const uniqueUsername = firstName && lastName 
      ? `${firstName}_${lastName}_${timestamp}` 
      : `${clientEmail.split('@')[0]}_${timestamp}`;
    
    const userId = `client_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = await storage.upsertUser({
      id: userId,
      email: clientEmail,
      username: uniqueUsername,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'client'
    });

    // Create the therapist-client relationship
    const relationship = await storage.addTherapistClient({
      therapistId,
      clientId: newUser.id,
      isActive: true,
      notes: notes || null
    });

    // Send invitation email for new user
    try {
      // Create invitation record in database with secure token
      const invitation = await storage.createClientInvitation({
        therapistId,
        clientEmail: newUser.email!,
        status: 'pending'
      });
      
      const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3001';
      
      await sendClientInvitation({
        clientEmail: newUser.email!,
        clientName: newUser.firstName && newUser.lastName 
          ? `${newUser.firstName} ${newUser.lastName}` 
          : newUser.username || 'Client',
        therapistName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username || 'Your Therapist',
        invitationToken: invitation.invitationToken,
        baseUrl
      });
      console.log(`📧 Invitation email sent to new user: ${clientEmail}`);
    } catch (emailError) {
      console.error(`❌ Failed to send invitation email to ${clientEmail}:`, emailError);
    }

    console.log(`✅ New user created and added to client list: ${clientEmail} (ID: ${newUser.id})`);
    
    return success(res, {
      type: 'new_client',
      client: newUser,
      relationship,
      message: `New user ${clientEmail} created, added to your client list, and invitation sent successfully`
    }, 201);
  } catch (err: any) {
    console.error(`❌ Error adding client ${clientEmail}:`, err);
    return error(res, `Failed to add client: ${err.message}`, 500);
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

// Update existing content library item
router.put('/library/:id', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const { id } = req.params;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  // Check if the therapist owns this content library item
  const existingItem = await storage.getContentLibraryItem(id);
  if (!existingItem || existingItem.createdBy !== therapistId) {
    return error(res, 'Content library item not found or access denied', 404);
  }
  
  const updatedContent = await storage.updateContentLibraryItem(id, req.body);
  return success(res, updatedContent);
}));

// Generate words with sound endpoint for therapists
router.post('/generate-words', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const user = await storage.getUser(therapistId);
  
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  const { sound, difficulty, count, position } = req.body;
  
  if (!sound) {
    return error(res, 'Sound parameter is required', 400);
  }
  
  const words = await memoizedGenerateWordsWithSound(sound, difficulty || "4", count || 8, position);
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

// Send existing assignment to multiple clients
router.post('/assignments/send', protect, catchAsync(async (req: any, res) => {
  const therapistId = req.user.claims.sub;
  const { assignmentId, clientIds, dueDate, therapistNotes } = req.body;
  
  const user = await storage.getUser(therapistId);
  if (!user || user.role !== 'therapist') {
    return error(res, 'Access denied. Therapist role required.', 403);
  }
  
  if (!assignmentId || !clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return error(res, 'assignmentId and clientIds array are required', 400);
  }
  
  // Verify that all clients belong to this therapist
  const therapistClients = await storage.getTherapistClients(therapistId);
  const therapistClientIds = therapistClients.map((rel: any) => rel.clientId || rel.client?.id);
  
  const invalidClientIds = clientIds.filter(id => !therapistClientIds.includes(id));
  if (invalidClientIds.length > 0) {
    return error(res, `Some clients are not assigned to you: ${invalidClientIds.join(', ')}`, 403);
  }
  
  try {
    const therapistName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username;
    
    // Send assignments to all clients
    const result = await storage.sendAssignmentToClients({
      sourceAssignmentId: assignmentId,
      clientIds,
      therapistId,
      therapistName,
      dueDate,
      therapistNotes
    });
    
    // Send email notifications to all clients
    let emailsSent = 0;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    for (const assignment of result.assignments) {
      const clientRelation = therapistClients.find((rel: any) => rel.clientId === assignment.userId);
      if (clientRelation && clientRelation.client) {
        const client = clientRelation.client;
        try {
          const clientName = client.firstName && client.lastName 
            ? `${client.firstName} ${client.lastName}` 
            : client.username || client.email?.split('@')[0] || 'Student';
            
          await sendAssignmentNotification({
            clientEmail: client.email!,
            clientName,
            therapistName,
            assignmentTitle: assignment.title,
            assignmentDescription: assignment.description || undefined,
            dueDate: assignment.dueDate?.toISOString(),
            assignmentId: assignment.id,
            baseUrl
          });
          
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${client.email}:`, emailError);
        }
      }
    }
    
    return success(res, {
      message: 'Assignments sent successfully',
      assignmentsCreated: result.assignments.length,
      itemsCreated: result.items.length,
      emailsSent,
      assignments: result.assignments
    });
    
  } catch (err: any) {
    console.error('Error sending assignments:', err);
    return error(res, err.message || 'Failed to send assignments', 500);
  }
}));

// Get invitation details by token (public endpoint for email links)
router.get('/invitation/:token', catchAsync(async (req: any, res) => {
  const { token } = req.params;
  
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
  
  // Get therapist name for display
  const therapist = await storage.getUser(invitation.therapistId);
  const therapistName = therapist?.firstName && therapist?.lastName 
    ? `${therapist.firstName} ${therapist.lastName}` 
    : therapist?.username || 'Your Therapist';
  
  return success(res, {
    therapistName,
    clientEmail: invitation.clientEmail,
    expiresAt: invitation.expiresAt,
    status: invitation.status
  });
}));

export default router;
