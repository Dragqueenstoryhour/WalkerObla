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
  console.log(`🚀 Assignment API called for userId: ${userId}`);
  
  // Disable caching for debugging
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', Date.now().toString()); // Force unique response
  
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
  
  console.log(`🚀 Assignment API returning ${assignmentsWithProgress.length} assignments`);
  return success(res, assignmentsWithProgress);
}));

router.get('/:id', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: Looking for assignment ID:', assignmentId);
  
  const assignment = await storage.getAssignment(assignmentId);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: Assignment found:', assignment ? 'YES' : 'NO');
  
  if (!assignment) {
    console.log('🎯 ASSIGNMENT ACCESS DEBUG: Assignment not found in database');
    return error(res, "Assignment not found", 404);
  }
  
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: User ID:', userId);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: Assignment userId:', assignment.userId);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: Assignment clientEmail:', assignment.clientEmail);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: User email:', user?.email);
  
  // Check access: user must be the assigned client or match the email
  const hasAccess = assignment.userId === userId || 
                   (assignment.clientEmail && user?.email === assignment.clientEmail);
  console.log('🎯 ASSIGNMENT ACCESS DEBUG: Has access:', hasAccess);
  
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
      
      const baseUrl = process.env.CLIENT_BASE_URL || `${req.protocol}://${req.get('host')}`;
      
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Attempting to send email to:', clientEmail);
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Assignment ID:', assignment.id);
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Base URL:', baseUrl);
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Assignment title:', parsedAssignmentData.title);
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Therapist name:', therapistName);
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Client name:', clientName);
      
      const emailResult = await sendAssignmentNotification({
        clientEmail,
        clientName: clientName || 'Student',
        therapistName,
        assignmentTitle: parsedAssignmentData.title,
        assignmentDescription: parsedAssignmentData.description || undefined,
        dueDate: parsedAssignmentData.dueDate?.toISOString() || undefined,
        assignmentId: assignment.id,
        baseUrl
      });
      
      console.log('📧 ASSIGNMENT EMAIL DEBUG: Email send result:', emailResult);
    }
  } catch (emailError) {
    console.error('Failed to send assignment notification email:', emailError);
  }
  
    return success(res, assignment, 201);
  } catch (validationError: any) {
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

// Comprehensive assignment completion endpoint for Watch Then Practice and Word Pairs assignments
router.post('/:id/complete', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.claims.sub;
  const { assignmentType, results } = req.body;

  console.log(`📊 Processing ${assignmentType} assignment completion:`, {
    assignmentId,
    userId,
    resultsCount: results?.length
  });

  if (!results || !Array.isArray(results)) {
    return error(res, 'Results array is required', 400);
  }

  try {
    const savedResults = [];

    if (assignmentType === 'word-pairs') {
      // Handle word pairs assignment results
      for (const pairResult of results) {
        const { itemId, word1, word2, connection, sentences } = pairResult;

        if (!itemId) {
          console.warn(`⚠️ Skipping word pair "${word1}-${word2}" - no valid itemId`);
          continue;
        }

        console.log(`💾 Saving results for word pair: "${word1}+${word2}" (itemId: ${itemId})`);

        // Save each sentence attempt
        for (const sentence of sentences || []) {
          const pairResultSaved = await storage.saveAssignmentResult({
            assignmentId,
            itemId,
            userId,
            practiceType: 'word-pair',
            word: `${word1}+${word2}`,
            phrase: sentence.transcription,
            attemptNumber: sentence.attemptNumber,
            pronunciationScore: Math.round((sentence.word1Score + sentence.word2Score) / 2), // Average of both words
            accuracyScore: sentence.word1Detected && sentence.word2Detected ? 100 : 0,
            fluencyScore: Math.round((sentence.word1Score + sentence.word2Score) / 2),
            completenessScore: sentence.word1Detected && sentence.word2Detected ? 100 : 0,
            practiceDate: new Date().toISOString()
          });
          savedResults.push(pairResultSaved);
        }
      }
    } else {
      // Handle watch-practice and other assignment results (existing logic)
      for (const wordResult of results) {
        const { itemId, word, animationPlays, wordPractice, phrasePractice } = wordResult;

        if (!itemId) {
          console.warn(`⚠️ Skipping word "${word}" - no valid itemId`);
          continue;
        }

        console.log(`💾 Saving results for word: "${word}" (itemId: ${itemId})`);

        // Save word practice attempts
        for (const attempt of wordPractice || []) {
          const wordResult = await storage.saveAssignmentResult({
            assignmentId,
            itemId,
            userId,
            practiceType: 'word',
            word: word,
            attemptNumber: attempt.attemptNumber,
            pronunciationScore: attempt.pronunciationScore,
            accuracyScore: attempt.accuracyScore,
            fluencyScore: attempt.fluencyScore,
            completenessScore: attempt.completenessScore,
            animationPlays: animationPlays,
            practiceDate: new Date().toISOString()
          });
          savedResults.push(wordResult);
        }

        // Save phrase practice attempts
        for (const phraseResult of phrasePractice || []) {
          for (const attempt of phraseResult.attempts || []) {
            const phraseResultSaved = await storage.saveAssignmentResult({
              assignmentId,
              itemId,
              userId,
              practiceType: 'phrase',
              word: word,
              phrase: phraseResult.phrase,
              phraseIndex: phraseResult.phraseIndex,
              attemptNumber: attempt.attemptNumber,
              pronunciationScore: attempt.pronunciationScore,
              accuracyScore: attempt.accuracyScore,
              fluencyScore: attempt.fluencyScore,
              completenessScore: attempt.completenessScore,
              practiceDate: new Date().toISOString()
            });
            savedResults.push(phraseResultSaved);
          }
        }
      }
    }

    // Mark assignment as completed
    await storage.markAssignmentCompleted(assignmentId, userId);

    // Calculate overall score for immediate feedback
    const overallScore = calculateOverallScore(results, assignmentType);

    console.log(`✅ Assignment ${assignmentId} completed successfully. Saved ${savedResults.length} results. Overall score: ${overallScore}%`);

    return success(res, {
      message: 'Assignment completed successfully',
      overallScore,
      resultsCount: savedResults.length,
      assignmentId
    });

  } catch (err) {
    console.error('❌ Error saving assignment completion:', err);
    return error(res, 'Failed to save assignment results', 500);
  }
}));

// Helper function to calculate overall score
function calculateOverallScore(results: any[], assignmentType: string): number {
  let totalScore = 0;
  let totalAttempts = 0;

  if (assignmentType === 'word-pairs') {
    // Handle word pairs scoring
    for (const pairResult of results) {
      for (const sentence of pairResult.sentences || []) {
        // Average the two word scores for each sentence
        const avgScore = (sentence.word1Score + sentence.word2Score) / 2;
        totalScore += avgScore;
        totalAttempts++;
      }
    }
  } else {
    // Handle watch-practice and other assignment types (existing logic)
    for (const wordResult of results) {
      // Count word practice attempts
      for (const attempt of wordResult.wordPractice || []) {
        totalScore += attempt.pronunciationScore || 0;
        totalAttempts++;
      }
      
      // Count phrase practice attempts
      for (const phraseResult of wordResult.phrasePractice || []) {
        for (const attempt of phraseResult.attempts || []) {
          totalScore += attempt.pronunciationScore || 0;
          totalAttempts++;
        }
      }
    }
  }

  return totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
}

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
    
    // Check if all items in the assignment are now completed
    const allItems = await storage.getAssignmentItems(assignmentId);
    const completedItems = allItems.filter(item => item.isCompleted);
    
    console.log(`🎯 Assignment ${assignmentId}: ${completedItems.length}/${allItems.length} items completed`);
    
    // If all items are completed, mark the assignment as completed
    if (completedItems.length === allItems.length && allItems.length > 0) {
      console.log(`🎉 Assignment ${assignmentId} is now complete! Updating assignment status.`);
      await storage.updateAssignment(assignmentId, {
        isCompleted: true,
        completedAt: new Date()
      });
    }
  }
  
  return success(res, result, 201);
}));

// Endpoint to get detailed results for a specific assignment (for therapists)
// Get comprehensive assignment results for detailed reporting
router.get('/:id/comprehensive-results', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  const assignment = await storage.getAssignment(assignmentId);
  if (!assignment) {
    return error(res, "Assignment not found", 404);
  }
  
  // Check access permissions
  let hasAccess = false;
  
  // If user is the assigned client or matches the email
  if (assignment.userId === userId || (assignment.clientEmail && user?.email === assignment.clientEmail)) {
    hasAccess = true;
  }
  
  if (user?.role === 'therapist') {
    if (assignment.therapistId === userId) {
      hasAccess = true;
    } else if (assignment.userId) {
      // Check if therapist has a relationship with the client
      const relationship = await storage.getTherapistClient(userId, assignment.userId);
      if (relationship && relationship.isActive) {
        hasAccess = true;
      }
    }
  }
  
  if (!hasAccess) {
    return error(res, "Access denied", 403);
  }
  
  try {
    const results = await storage.getComprehensiveAssignmentResults(assignmentId);
    
    // Group results by item and practice type for better organization
    const groupedResults = results.reduce((groups: any, result: any) => {
      const key = `${result.itemId}-${result.word || result.itemContent}`;
      
      if (!groups[key]) {
        groups[key] = {
          itemId: result.itemId,
          word: result.word || result.itemContent,
          syllabication: result.syllabication,
          wordPractice: [],
          phrasePractice: [],
          overallScores: {
            pronunciation: 0,
            accuracy: 0,
            fluency: 0,
            completeness: 0,
            attemptCount: 0
          }
        };
      }
      
      const practiceData = {
        id: result.id,
        attemptNumber: result.attemptNumber,
        pronunciationScore: result.pronunciationScore,
        accuracyScore: result.accuracyScore,
        fluencyScore: result.fluencyScore,
        completenessScore: result.completenessScore,
        practiceDate: result.practiceDate,
        phrase: result.phrase,
        phraseIndex: result.phraseIndex
      };
      
      if (result.practiceType === 'phrase') {
        groups[key].phrasePractice.push(practiceData);
      } else {
        groups[key].wordPractice.push(practiceData);
      }
      
      // Update overall scores
      groups[key].overallScores.pronunciation += result.pronunciationScore || 0;
      groups[key].overallScores.accuracy += result.accuracyScore || 0;
      groups[key].overallScores.fluency += result.fluencyScore || 0;
      groups[key].overallScores.completeness += result.completenessScore || 0;
      groups[key].overallScores.attemptCount += 1;
      
      return groups;
    }, {});
    
    // Calculate averages
    Object.values(groupedResults).forEach((group: any) => {
      const count = group.overallScores.attemptCount;
      if (count > 0) {
        group.overallScores.pronunciation = Math.round(group.overallScores.pronunciation / count);
        group.overallScores.accuracy = Math.round(group.overallScores.accuracy / count);
        group.overallScores.fluency = Math.round(group.overallScores.fluency / count);
        group.overallScores.completeness = Math.round(group.overallScores.completeness / count);
      }
    });
    
    console.log(`📊 Retrieved ${results.length} results for assignment ${assignmentId}, grouped into ${Object.keys(groupedResults).length} items`);
    
    return success(res, {
      assignmentId,
      totalResults: results.length,
      itemCount: Object.keys(groupedResults).length,
      results: Object.values(groupedResults)
    });
    
  } catch (err) {
    console.error('❌ Error fetching comprehensive assignment results:', err);
    return error(res, 'Failed to fetch assignment results', 500);
  }
}));

// Endpoint to generate pronunciation insights for an assignment
router.get('/:id/insights', protect, catchAsync(async (req: any, res) => {
  const assignmentId = parseInt(req.params.id);

  try {
    const results = await storage.getComprehensiveAssignmentResults(assignmentId);

    if (results.length === 0) {
      return success(res, { insights: "Not enough data for insights." });
    }

    // Separate words into correct and incorrect based on a threshold
    const correctWords = results
      .filter(r => r.pronunciationScore && r.pronunciationScore > 70)
      .map(r => r.word || r.itemContent);
      
    const incorrectWords = results
      .filter(r => r.pronunciationScore && r.pronunciationScore <= 70)
      .map(r => r.word || r.itemContent);

    // Generate insights using the memoized OpenAI function
    const insights = await memoizedGeneratePronunciationInsights(correctWords, incorrectWords);
    
    console.log(`🧠 Generated insights for assignment ${assignmentId}`);
    return success(res, { insights });

  } catch (err) {
    console.error(`❌ Error generating insights for assignment ${assignmentId}:`, err);
    return error(res, 'Failed to generate pronunciation insights', 500);
  }
}));

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


// Database query endpoint to check recent invitations and assignments (must come before general debug route)
router.get('/debug/recent/:type', catchAsync(async (req: any, res) => {
  const { type } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (type === 'invitations') {
    try {
      const recentInvitations = await storage.getRecentInvitations(limit);
      return success(res, {
        type: 'recent_invitations',
        count: recentInvitations.length,
        invitations: recentInvitations
      });
    } catch (error) {
      console.log('⚠️ getRecentInvitations not implemented in storage, using fallback');
      return success(res, {
        type: 'recent_invitations',
        message: 'getRecentInvitations method not implemented in storage layer',
        fallback: true
      });
    }
  } else if (type === 'assignments') {
    try {
      const recentAssignments = await storage.getRecentAssignments(limit);
      return success(res, {
        type: 'recent_assignments',
        count: recentAssignments.length,
        assignments: recentAssignments
      });
    } catch (error) {
      console.log('⚠️ getRecentAssignments not implemented in storage, using fallback');
      return success(res, {
        type: 'recent_assignments',
        message: 'getRecentAssignments method not implemented in storage layer',
        fallback: true
      });
    }
  }
  
  return error(res, 'Invalid debug type. Use /debug/recent/invitations or /debug/recent/assignments', 400);
}));

// Debug endpoint to check specific tokens and assignments
router.get('/debug/:type/:value', catchAsync(async (req: any, res) => {
  const { type, value } = req.params;
  
  if (type === 'token') {
    const invitation = await storage.getClientInvitationByToken(value);
    return success(res, {
      token: value,
      found: !!invitation,
      invitation: invitation || null
    });
  } else if (type === 'assignment') {
    const assignmentId = parseInt(value);
    const assignment = await storage.getAssignment(assignmentId);
    return success(res, {
      assignmentId,
      found: !!assignment,
      assignment: assignment || null
    });
  }
  
  return error(res, 'Invalid debug type. Use /debug/token/{token} or /debug/assignment/{id}', 400);
}));

export default router;
