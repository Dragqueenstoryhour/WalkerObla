import { Router } from 'express';
import { protect } from '../supabaseAuth';
import { success, error } from '../utils/response';
import { storage } from '../storage';
import { catchAsync } from '../utils/errorHandlers';
import { insertUserActivitySchema, insertUserSavedPhraseSchema, insertPracticeGroupSchema, userActivity } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNotNull, count } from 'drizzle-orm';
import { ACTIVITY_TYPE } from '../constants/activityTypes';

const router = Router();

// User stats endpoint
router.get('/stats', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const stats = await storage.getUserStats(userId);
  const activities = await storage.getUserActivities(userId, 10);
  
  return success(res, {
    stats: stats || {
      totalWordsPracticed: 0,
      totalPhrasesPracticed: 0,
      totalReadingSessions: 0,
      totalPracticeTime: 0,
      averagePronunciationScore: null,
      averageAccuracyScore: null,
      averageFluencyScore: null,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
    },
    recentActivities: activities
  });
}));

// User activity stats endpoint
router.get('/activity-stats', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const activityStats = await storage.getUserActivityStats(userId);
  return success(res, activityStats);
}));

// Get paginated recent activities for Most Recent Activities table
router.get('/recent-activities', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  
  // Get all recent activities (including those without scores for activity history)
  const recentActivities = await db
    .select()
    .from(userActivity)
    .where(eq(userActivity.userId, userId))
    .orderBy(desc(userActivity.createdAt))
    .limit(limit)
    .offset(offset);
  
  // Get total count of all activities for pagination
  const totalCountResult = await db
    .select({ count: count() })
    .from(userActivity)
    .where(eq(userActivity.userId, userId));
  const totalCount = totalCountResult[0]?.count || 0;

  return success(res, {
    activities: recentActivities,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    totalCount,
    hasNextPage: page * limit < totalCount,
    hasPrevPage: page > 1
  });
}));

// Activities endpoints for My Journey tab
router.get('/activities/words', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  
  const wordActivities = await db
    .select()
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, ACTIVITY_TYPE.WORD_PRACTICE),
        isNotNull(userActivity.score)
      )
    )
    .orderBy(desc(userActivity.createdAt))
    .limit(50);
  
  return success(res, wordActivities);
}));

router.get('/activities/phrases', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  
  const phraseActivities = await db
    .select()
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, ACTIVITY_TYPE.PHRASE_PRACTICE),
        isNotNull(userActivity.score)
      )
    )
    .orderBy(desc(userActivity.createdAt))
    .limit(50);
  
  return success(res, phraseActivities);
}));

router.get('/activities/readings', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  
  const readingActivities = await db
    .select()
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, ACTIVITY_TYPE.READING_SESSION),
        isNotNull(userActivity.score)
      )
    )
    .orderBy(desc(userActivity.createdAt))
    .limit(50);
  
  return success(res, readingActivities);
}));

// Activity recording endpoint
router.post('/activity', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const activityData = insertUserActivitySchema.parse({
    ...req.body,
    userId
  });
  
  const activity = await storage.recordActivity(activityData);
  return success(res, activity, 201);
}));

// Pronunciation feedback endpoint (alias for activity recording)
router.post('/pronunciation-feedback', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const activityData = insertUserActivitySchema.parse({
    ...req.body,
    userId
  });
  
  const activity = await storage.recordActivity(activityData);
  return success(res, activity, 201);
}));

// Get pronunciation feedback (gets recent activities with aggregated feedback)
router.get('/pronunciation-feedback', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const activities = await storage.getUserActivities(userId, 10);
  
  // Calculate aggregated feedback based on recent activities with scores
  const activitiesWithScores = activities.filter(activity => activity.score !== null);
  const totalActivities = activities.length;
  const scoredActivities = activitiesWithScores.length;
  
  if (scoredActivities === 0) {
    return success(res, {
      totalActivities,
      averageScore: 0,
      improvement: "No scored activities available",
      strengths: [],
      areasForImprovement: []
    });
  }
  
  const avgScore = activitiesWithScores.reduce((sum, activity) => sum + (activity.score || 0), 0) / scoredActivities;
  const avgAccuracy = activitiesWithScores.reduce((sum, activity) => sum + (activity.accuracy || 0), 0) / scoredActivities;
  const avgFluency = activitiesWithScores.reduce((sum, activity) => sum + (activity.fluency || 0), 0) / scoredActivities;
  
  const feedback = {
    totalActivities,
    averageScore: Math.round(avgScore),
    averageAccuracy: Math.round(avgAccuracy),
    averageFluency: Math.round(avgFluency),
    improvement: avgScore >= 80 ? "Excellent progress!" : avgScore >= 60 ? "Good improvement" : "Keep practicing",
    strengths: avgScore >= 70 ? ["Good pronunciation clarity"] : [],
    areasForImprovement: avgScore < 70 ? ["Focus on pronunciation accuracy"] : []
  };
  
  return success(res, feedback);
}));

// User saved phrases (My Words) endpoints - returns only actual phrases
router.get('/saved-phrases', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  
  const phrases = await storage.getUserSavedPhrases(userId);
  
  return success(res, phrases);
}));

router.post('/saved-phrases', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const phraseData = insertUserSavedPhraseSchema.parse({
    ...req.body,
    userId
  });
  
  const phrase = await storage.createUserSavedPhrase(phraseData);
  return success(res, phrase, 201);
}));

router.delete('/saved-phrases/:id', protect, catchAsync(async (req: any, res) => {
  const phraseId = parseInt(req.params.id);
  await storage.deleteUserSavedPhrase(phraseId);
  return success(res, { success: true });
}));

// Practice groups endpoints
router.get('/practice-groups', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const groups = await storage.getPracticeGroups(userId);
  
  const groupsWithPhrases = await Promise.all(
    groups.map(async (group) => {
      const groupPhrases = await storage.getPracticeGroupPhrases(group.id);
      return { ...group, phraseCount: groupPhrases.length };
    })
  );
  
  return success(res, groupsWithPhrases);
}));

router.post('/practice-groups', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const groupData = insertPracticeGroupSchema.parse({
    ...req.body,
    userId
  });
  
  const group = await storage.createPracticeGroup(groupData);
  return success(res, group, 201);
}));

router.delete('/practice-groups/:id', protect, catchAsync(async (req: any, res) => {
  const groupId = parseInt(req.params.id);
  await storage.deletePracticeGroup(groupId);
  return success(res, { success: true });
}));

// Add phrase to practice group
router.post('/practice-groups/:groupId/phrases', protect, catchAsync(async (req: any, res) => {
  const groupId = parseInt(req.params.groupId);
  const { phraseId } = req.body;
  
  const groupPhrase = await storage.addPhraseToPracticeGroup({
    groupId,
    phraseId: parseInt(phraseId)
  });
  
  return success(res, groupPhrase, 201);
}));

// Saved words API endpoints (separate from phrases)
router.get('/saved-words', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const words = await storage.getSavedWords(userId);
  return success(res, words);
}));

router.post('/saved-words', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const { word, syllabication, folderId } = req.body;
  
  if (!word) {
    return error(res, 'Word is required', 400);
  }

  const wordData = {
    userId,
    word,
    syllabication: syllabication || null,
    folderId: folderId ? parseInt(folderId) : null,
    difficultyLevel: 1,
    practiceCount: 0,
    masteryLevel: 0
  };
  
  const savedWord = await storage.createSavedWord(wordData);
  return success(res, savedWord, 201);
}));

router.delete('/saved-words/:word', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const wordToDelete = decodeURIComponent(req.params.word);
  
  const words = await storage.getSavedWords(userId);
  const wordToRemove = words.find(w => w.word === wordToDelete);
  
  if (wordToRemove) {
    await storage.deleteSavedWord(wordToRemove.id);
  }
  
  return success(res, { success: true });
}));

// Saved readings endpoints
router.get('/saved-readings', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const readings = await storage.getUserSavedReadings(userId);
  return success(res, readings);
}));

router.post('/saved-readings', protect, catchAsync(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const readingData = insertUserSavedPhraseSchema.parse({
    ...req.body,
    userId,
    source: 'reader_content'
  });
  
  const reading = await storage.createUserSavedReading(readingData);
  return success(res, reading, 201);
}));

router.delete('/saved-readings/:id', protect, catchAsync(async (req: any, res) => {
  const readingId = parseInt(req.params.id);
  await storage.deleteUserSavedPhrase(readingId);
  return success(res, { success: true });
}));

export default router;
