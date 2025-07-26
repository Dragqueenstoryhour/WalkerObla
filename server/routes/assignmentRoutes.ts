import { Router } from 'express';
import memoize from 'memoizee';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { catchAsync } from '../utils/errorHandlers';
import { storage } from '../storage';
import { insertAssignmentSchema, insertAssignmentItemSchema, insertAssignmentResultSchema } from '@shared/schema';
import { sendAssignmentNotification } from '../email';
import { generateAssignmentTemplate, generatePronunciationInsights } from '../openai';

const router = Router();

// Memoize OpenAI calls for insights and templates
const memoizedGeneratePronunciationInsights = memoize(generatePronunciationInsights, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour
const memoizedGenerateAssignmentTemplate = memoize(generateAssignmentTemplate, { maxAge: 3600000, preFetch: true }); // Cache for 1 hour

// Assignment routes
router.get('/', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const assignments = await storage.getUserAssignments(userId);
  
  const assignmentsWithProgress = await Promise.all(
    assignments.map(async (assignment) => {
      const progress = await storage.getAssignmentProgress(assignment.id);
      return {
        ...assignment,
        progress
      };
    })
  );
  
  return success(res, assignmentsWithProgress);
}));

router.get('/:id', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const assignment = await storage.getAssignment(assignmentId);
  
  if (!assignment) {
    return error(res, "Assignment not found", 404);
  }
  
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  // Check access: user must be the assigned client or match the email
  const hasAccess = assignment.userId === userId || 
                   (assignment.clientEmail && user?.email === assignment.clientEmail);
  
  if (!hasAccess) {
    return error(res, "Access denied", 403);
  }
  
  const items = await storage.getAssignmentItems(assignmentId);
  const progress = await storage.getAssignmentProgress(assignmentId);
  
  return success(res, {
    ...assignment,
    items,
    progress
  });
}));

router.patch('/:id', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  // Check if user is a therapist
  if (user?.role !== 'therapist') {
    return error(res, "Only therapists can edit assignments", 403);
  }
  
  const assignment = await storage.getAssignment(assignmentId);
  if (!assignment) {
    return error(res, "Assignment not found", 404);
  }
  
  // Check if the therapist owns this assignment
  if (assignment.therapistId !== userId) {
    return error(res, "You can only edit your own assignments", 403);
  }
  
  // Only allow updating title and description
  const allowedUpdates = {
    ...(req.body.title && { title: req.body.title }),
    ...(req.body.description && { description: req.body.description })
  };
  
  const updatedAssignment = await storage.updateAssignment(assignmentId, allowedUpdates);
  return success(res, updatedAssignment);
}));

router.post('/', protect, catchAsync(async (req: any, res) => {
  const { items, ...assignmentData } = req.body;
  console.log('Assignment creation request data:', JSON.stringify(assignmentData, null, 2));
  console.log('Assignment items:', JSON.stringify(items, null, 2));
  
  try {
    const parsedAssignmentData = insertAssignmentSchema.parse(assignmentData);
    const assignment = await storage.createAssignment(parsedAssignmentData);
  
  // Create assignment items if provided
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const itemData = insertAssignmentItemSchema.parse({
        ...item,
        assignmentId: assignment.id
      });
      await storage.createAssignmentItem(itemData);
    }
  }
  
  // Send email notification to client
  try {
    const therapist = await storage.getUser(parsedAssignmentData.therapistId);
    let clientEmail: string | undefined;
    let clientName: string | undefined;
    
    if (parsedAssignmentData.userId) {
      // Assignment to existing user
      const client = await storage.getUser(parsedAssignmentData.userId);
      if (client && client.email) {
        clientEmail = client.email;
        clientName = client.firstName && client.lastName 
          ? `${client.firstName} ${client.lastName}` 
          : client.username;
      }
    } else if (parsedAssignmentData.clientEmail) {
      // Assignment to email address (non-registered user)
      clientEmail = parsedAssignmentData.clientEmail;
      clientName = parsedAssignmentData.clientEmail.split('@')[0]; // Use email prefix as name
    }
    
    if (clientEmail && therapist) {
      const therapistName = therapist.firstName && therapist.lastName 
        ? `${therapist.firstName} ${therapist.lastName}` 
        : therapist.username;
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      await sendAssignmentNotification({
        clientEmail,
        clientName: clientName || 'Student',
        therapistName,
        assignmentTitle: parsedAssignmentData.title,
        assignmentDescription: parsedAssignmentData.description || undefined,
        dueDate: parsedAssignmentData.dueDate?.toISOString() || undefined,
        assignmentId: assignment.id,
        baseUrl
      });
    }
  } catch (emailError) {
    console.error('Failed to send assignment notification email:', emailError);
  }
  
    return success(res, assignment, 201);
  } catch (validationError) {
    console.error('Assignment validation error:', validationError);
    if (validationError.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: validationError.errors
      });
    }
    throw validationError;
  }
}));

router.post('/:id/items', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const itemData = insertAssignmentItemSchema.parse({
    ...req.body,
    assignmentId
  });
  const item = await storage.createAssignmentItem(itemData);
  return success(res, item, 201);
}));

router.patch('/items/:id', protect, catchAsync(async (req: any, res) => {
  const itemId = parseInt(req.params.id);
  const updates = insertAssignmentItemSchema.partial().parse(req.body);
  const updatedItem = await storage.updateAssignmentItem(itemId, updates);
  return success(res, updatedItem);
}));

router.post('/:id/results', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.claims.sub;
  
  const resultData = insertAssignmentResultSchema.parse({
    ...req.body,
    assignmentId,
    userId
  });
  
  const result = await storage.createAssignmentResult(resultData);
  
  if (req.body.itemId && req.body.pronunciationScore !== undefined) {
    const itemUpdates: any = {
      lastScore: req.body.pronunciationScore,
      attemptCount: req.body.attemptCount || 1,
      lastAttemptAt: new Date()
    };
    
    const item = await storage.getAssignmentItems(assignmentId);
    const currentItem = item.find(i => i.id === req.body.itemId);
    if (!currentItem?.bestScore || req.body.pronunciationScore > currentItem.bestScore) {
      itemUpdates.bestScore = req.body.pronunciationScore;
    }
    
    if (req.body.pronunciationScore > 70) {
      itemUpdates.isCompleted = true;
    }
    
    await storage.updateAssignmentItem(req.body.itemId, itemUpdates);
  }
  
  return success(res, result, 201);
}));

// Endpoint to get detailed results for a specific assignment (for therapists)
router.get('/:id/results', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const results = await storage.getAssignmentResults(assignmentId);
  return success(res, results);
}));

// Endpoint to get assignment progress summary (for real-time monitoring)
router.get('/:id/progress', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const progress = await storage.getAssignmentProgress(assignmentId);
  return success(res, progress);
}));

router.post('/insights', protect, catchAsync(async (req: any, res) => {
  const { correctWords, incorrectWords } = req.body;
  const insights = await memoizedGeneratePronunciationInsights(correctWords || [], incorrectWords || []);
  return success(res, insights);
}));

// Assignment Templates
router.post('/templates', protect, catchAsync(async (req: any, res) => {
  const { title, description, targetSound, category } = req.body;
  const words = await memoizedGenerateAssignmentTemplate(title, description, targetSound, category);
  return success(res, { words });
}));

export default router;
