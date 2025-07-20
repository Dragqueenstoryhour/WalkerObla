import {
  users,
  userProfiles,
  readingContent,
  wordFolders,
  savedWords,
  readingSession,
  gameLevels,
  exercises,
  userExercises,
  sharedPhraseCollections,
  userSavedPhrases,
  practiceGroups,
  practiceGroupPhrases,
  userActivity,
  userStats,
  assignments,
  assignmentItems,
  assignmentResults,
  therapistClients,
  clientInvitations,
  contentLibrary,
  type User,
  type UpsertUser,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type ReadingContent,
  type InsertReadingContent,
  type WordFolder,
  type InsertWordFolder,
  type SavedWord,
  type InsertSavedWord,
  type ReadingSession,
  type InsertReadingSession,
  type GameLevel,
  type InsertGameLevel,
  type Exercise,
  type InsertExercise,
  type UserExercise,
  type InsertUserExercise,
  type SharedPhraseCollection,
  type InsertSharedPhraseCollection,
  type UserSavedPhrase,
  type InsertUserSavedPhrase,
  type PracticeGroup,
  type InsertPracticeGroup,
  type PracticeGroupPhrase,
  type InsertPracticeGroupPhrase,
  type UserActivity,
  type InsertUserActivity,
  type UserStats,
  type InsertUserStats,
  type Assignment,
  type InsertAssignment,
  type AssignmentItem,
  type InsertAssignmentItem,
  type AssignmentResult,
  type InsertAssignmentResult,
  type TherapistClient,
  type InsertTherapistClient,
  type ClientInvitation,
  type InsertClientInvitation,
  type ContentLibrary,
  type InsertContentLibrary,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, sql, count, avg, ne, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User stats operations
  getUserStats(userId: string): Promise<UserStats | undefined>;
  updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats>;
  
  // User activity tracking
  recordActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  getUserActivityStats(userId: string): Promise<{
    wordStats: { total: number; avgScore: number; recent: UserActivity[] };
    phraseStats: { total: number; avgScore: number; recent: UserActivity[] };
    readingStats: { total: number; avgScore: number; recent: UserActivity[] };
  }>;
  getRecentActivities(userId: string, limit?: number, offset?: number): Promise<UserActivity[]>;
  getTotalActivitiesCount(userId: string): Promise<number>;
  
  // User profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  
  // Reading content operations
  getReadingContent(): Promise<ReadingContent[]>;
  getReadingContentById(id: number): Promise<ReadingContent | undefined>;
  createReadingContent(content: InsertReadingContent): Promise<ReadingContent>;
  
  // Word folder operations
  getWordFolders(userId: string): Promise<WordFolder[]>;
  createWordFolder(folder: InsertWordFolder): Promise<WordFolder>;
  updateWordFolder(id: number, updates: Partial<WordFolder>): Promise<WordFolder>;
  deleteWordFolder(id: number): Promise<void>;
  
  // Saved words operations
  getSavedWords(userId: string, folderId?: number): Promise<SavedWord[]>;
  createSavedWord(word: InsertSavedWord): Promise<SavedWord>;
  updateSavedWord(id: number, updates: Partial<SavedWord>): Promise<SavedWord>;
  deleteSavedWord(id: number): Promise<void>;
  
  // Reading session operations
  getReadingSessions(userId: string): Promise<ReadingSession[]>;
  createReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  updateReadingSession(id: number, updates: Partial<ReadingSession>): Promise<ReadingSession>;
  
  // Game level operations
  getGameLevels(): Promise<GameLevel[]>;
  getGameLevelById(id: number): Promise<GameLevel | undefined>;
  createGameLevel(level: InsertGameLevel): Promise<GameLevel>;
  
  // Exercise operations
  getExercises(levelId?: number): Promise<Exercise[]>;
  getExerciseById(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // User exercise operations
  getUserExercises(userId: string): Promise<UserExercise[]>;
  getUserExercise(userId: string, exerciseId: number): Promise<UserExercise | undefined>;
  createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise>;
  updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise>;
  
  // Shared phrase collections
  getSharedPhraseCollection(shareId: string): Promise<SharedPhraseCollection | undefined>;
  createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection>;
  
  // User saved phrases operations
  getUserSavedPhrases(userId: string): Promise<UserSavedPhrase[]>;
  createUserSavedPhrase(phrase: InsertUserSavedPhrase): Promise<UserSavedPhrase>;
  deleteUserSavedPhrase(id: number): Promise<void>;

  // User saved readings operations
  getUserSavedReadings(userId: string): Promise<UserSavedPhrase[]>;
  createUserSavedReading(content: InsertUserSavedPhrase): Promise<UserSavedPhrase>;
  
  // Practice group operations
  getPracticeGroups(userId: string): Promise<PracticeGroup[]>;
  getPracticeGroup(id: number): Promise<PracticeGroup | undefined>;
  createPracticeGroup(group: InsertPracticeGroup): Promise<PracticeGroup>;
  updatePracticeGroup(id: number, updates: Partial<PracticeGroup>): Promise<PracticeGroup>;
  deletePracticeGroup(id: number): Promise<void>;
  
  // Practice group phrase operations
  getPracticeGroupPhrases(groupId: number): Promise<PracticeGroupPhrase[]>;
  addPhraseToPracticeGroup(groupPhrase: InsertPracticeGroupPhrase): Promise<PracticeGroupPhrase>;
  removePhrasesFromPracticeGroup(groupId: number, phraseIds: number[]): Promise<void>;
  
  // Assignment operations
  getUserAssignments(userId: string): Promise<Assignment[]>;
  getTherapistAssignments(therapistId: string): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment>;
  deleteAssignment(id: number): Promise<void>;
  
  // Assignment item operations
  getAssignmentItems(assignmentId: number): Promise<AssignmentItem[]>;
  createAssignmentItem(item: InsertAssignmentItem): Promise<AssignmentItem>;
  updateAssignmentItem(id: number, updates: Partial<AssignmentItem>): Promise<AssignmentItem>;
  deleteAssignmentItem(id: number): Promise<void>;
  
  // Assignment result operations
    getAssignmentResults(assignmentId: number): Promise<AssignmentResult[]>;
    createAssignmentResult(result: InsertAssignmentResult): Promise<AssignmentResult>;
    getAssignmentProgress(assignmentId: number): Promise<{
      totalItems: number;
      completedItems: number;
      averageScore: number;
    }>;
    // User saved readings operations
    getUserSavedReadings(userId: string): Promise<UserSavedPhrase[]>;
    createUserSavedReading(content: InsertUserSavedPhrase): Promise<UserSavedPhrase>;
    
    // Therapist-client relationship operations
    getTherapistClients(therapistId: string): Promise<(TherapistClient & { client: User })[]>;
    addTherapistClient(relationship: InsertTherapistClient): Promise<TherapistClient>;
    removeTherapistClient(therapistId: string, clientId: string): Promise<void>;
    getClientsByEmail(therapistId: string, emails: string[]): Promise<User[]>;
    
    // Client invitation operations
    createClientInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation>;
    getClientInvitations(therapistId: string): Promise<ClientInvitation[]>;
    getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
    updateClientInvitationStatus(id: number, status: string, acceptedAt?: Date): Promise<ClientInvitation>;
    getPendingInvitations(therapistId: string): Promise<ClientInvitation[]>;

    // Content library operations for therapists
    getContentLibrary(therapistId: string): Promise<ContentLibrary[]>;
    getPublicContentLibrary(): Promise<ContentLibrary[]>;
    createContentLibraryItem(content: InsertContentLibrary): Promise<ContentLibrary>;
    updateContentLibraryItem(id: number, updates: Partial<ContentLibrary>): Promise<ContentLibrary>;
    deleteContentLibraryItem(id: number): Promise<void>;
    
    // Health check for deployment readiness
    healthCheck(): Promise<void>;
  } // Closing brace for IStorage interface

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new Error("Failed to fetch user");
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          level: 1,
          xp: 0,
          totalExercisesCompleted: 0,
          streakDays: 0,
          lastActivityDate: null,
          unlockedRewards: {},
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          trialEndDate: null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
          },
        })
        .returning();
      
      // If this is a new user with an email, transfer any email-based assignments
      if (userData.email) {
        await this.transferEmailAssignments(userData.email, userData.id);
      }
      
      return user;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw new Error("Failed to upsert user");
    }
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }

  async updateUserStats(userId: string, statsUpdate: Partial<UserStats>): Promise<UserStats> {
    const [stats] = await db
      .insert(userStats)
      .values({
        userId,
        ...statsUpdate,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          ...statsUpdate,
          updatedAt: new Date(),
        },
      })
      .returning();
    return stats;
  }

  // User activity tracking
  async recordActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db.insert(userActivity).values(activity).returning();
    
    // Update user stats based on activity
    await this.updateStatsFromActivity(activity);
    
    return newActivity;
  }

  async getUserActivities(userId: string, limit = 50): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit);
  }

  private async updateStatsFromActivity(activity: InsertUserActivity): Promise<void> {
    const currentStats = await this.getUserStats(activity.userId);
    
    const updates: Partial<UserStats> = {
      lastPracticeDate: new Date(),
      totalPracticeTime: (currentStats?.totalPracticeTime || 0) + (activity.duration || 0),
    };

    // Update activity-specific counters
    switch (activity.activityType) {
      case 'word_practice':
        updates.totalWordsPracticed = (currentStats?.totalWordsPracticed || 0) + 1;
        break;
      case 'phrase_practice':
        updates.totalPhrasesPracticed = (currentStats?.totalPhrasesPracticed || 0) + 1;
        break;
      case 'reading_session':
        updates.totalReadingSessions = (currentStats?.totalReadingSessions || 0) + 1;
        break;
    }

    // Update averages if scores are available
    if (activity.score !== null && activity.score !== undefined) {
      const totalActivities = await db
        .select({ count: count() })
        .from(userActivity)
        .where(and(
          eq(userActivity.userId, activity.userId),
          sql`${userActivity.score} IS NOT NULL`
        ));

      const avgScores = await db
        .select({
          avgPronunciation: avg(userActivity.score),
          avgAccuracy: avg(userActivity.accuracy),
          avgFluency: avg(userActivity.fluency),
        })
        .from(userActivity)
        .where(eq(userActivity.userId, activity.userId));

      if (avgScores[0]) {
        updates.averagePronunciationScore = Math.round(Number(avgScores[0].avgPronunciation) || 0);
        updates.averageAccuracyScore = Math.round(Number(avgScores[0].avgAccuracy) || 0);
        updates.averageFluencyScore = Math.round(Number(avgScores[0].avgFluency) || 0);
      }
    }

    await this.updateUserStats(activity.userId, updates);
  }

  // User profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values(profile).returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const [profile] = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile;
  }

  // Reading content operations
  async getReadingContent(): Promise<ReadingContent[]> {
    return await db.select().from(readingContent).orderBy(desc(readingContent.createdAt));
  }

  async getReadingContentById(id: number): Promise<ReadingContent | undefined> {
    const [content] = await db.select().from(readingContent).where(eq(readingContent.id, id));
    return content;
  }

  async createReadingContent(content: InsertReadingContent): Promise<ReadingContent> {
    const [newContent] = await db.insert(readingContent).values(content).returning();
    return newContent;
  }

  // Word folder operations
  async getWordFolders(userId: string): Promise<WordFolder[]> {
    return await db
      .select()
      .from(wordFolders)
      .where(eq(wordFolders.userId, userId))
      .orderBy(asc(wordFolders.name));
  }

  async createWordFolder(folder: InsertWordFolder): Promise<WordFolder> {
    const [newFolder] = await db.insert(wordFolders).values(folder).returning();
    return newFolder;
  }

  async updateWordFolder(id: number, updates: Partial<WordFolder>): Promise<WordFolder> {
    const [folder] = await db
      .update(wordFolders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wordFolders.id, id))
      .returning();
    return folder;
  }

  async deleteWordFolder(id: number): Promise<void> {
    await db.delete(wordFolders).where(eq(wordFolders.id, id));
  }

  // Saved words operations
  async getSavedWords(userId: string, folderId?: number): Promise<SavedWord[]> {
    if (folderId !== undefined) {
      return await db
        .select()
        .from(savedWords)
        .where(and(eq(savedWords.userId, userId), eq(savedWords.folderId, folderId)))
        .orderBy(desc(savedWords.createdAt));
    }
    
    return await db
      .select()
      .from(savedWords)
      .where(eq(savedWords.userId, userId))
      .orderBy(desc(savedWords.createdAt));
  }

  async createSavedWord(word: InsertSavedWord): Promise<SavedWord> {
    const [newWord] = await db.insert(savedWords).values(word).returning();
    return newWord;
  }

  async updateSavedWord(id: number, updates: Partial<SavedWord>): Promise<SavedWord> {
    const [word] = await db
      .update(savedWords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedWords.id, id))
      .returning();
    return word;
  }

  async deleteSavedWord(id: number): Promise<void> {
    await db.delete(savedWords).where(eq(savedWords.id, id));
  }

  // Reading session operations
  async getReadingSessions(userId: string): Promise<ReadingSession[]> {
    return await db
      .select()
      .from(readingSession)
      .where(eq(readingSession.userId, userId))
      .orderBy(desc(readingSession.createdAt));
  }

  async createReadingSession(session: InsertReadingSession): Promise<ReadingSession> {
    const [newSession] = await db.insert(readingSession).values(session).returning();
    return newSession;
  }

  async updateReadingSession(id: number, updates: Partial<ReadingSession>): Promise<ReadingSession> {
    const [session] = await db
      .update(readingSession)
      .set(updates)
      .where(eq(readingSession.id, id))
      .returning();
    return session;
  }

  // Game level operations
  async getGameLevels(): Promise<GameLevel[]> {
    return await db.select().from(gameLevels).orderBy(asc(gameLevels.levelNumber));
  }

  async getGameLevelById(id: number): Promise<GameLevel | undefined> {
    const [level] = await db.select().from(gameLevels).where(eq(gameLevels.id, id));
    return level;
  }

  async createGameLevel(level: InsertGameLevel): Promise<GameLevel> {
    const [newLevel] = await db.insert(gameLevels).values(level).returning();
    return newLevel;
  }

  // Exercise operations
  async getExercises(levelId?: number): Promise<Exercise[]> {
    if (levelId !== undefined) {
      return await db
        .select()
        .from(exercises)
        .where(eq(exercises.levelId, levelId))
        .orderBy(asc(exercises.order));
    }
    
    return await db
      .select()
      .from(exercises)
      .orderBy(asc(exercises.order));
  }

  async getExerciseById(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db.insert(exercises).values(exercise).returning();
    return newExercise;
  }

  // User exercise operations
  async getUserExercises(userId: string): Promise<UserExercise[]> {
    return await db
      .select()
      .from(userExercises)
      .where(eq(userExercises.userId, userId))
      .orderBy(desc(userExercises.lastAttemptAt));
  }

  async getUserExercise(userId: string, exerciseId: number): Promise<UserExercise | undefined> {
    const [userExercise] = await db
      .select()
      .from(userExercises)
      .where(and(eq(userExercises.userId, userId), eq(userExercises.exerciseId, exerciseId)));
    return userExercise;
  }

  async createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise> {
    const [newUserExercise] = await db.insert(userExercises).values(userExercise).returning();
    return newUserExercise;
  }

  async updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise> {
    const [userExercise] = await db
      .update(userExercises)
      .set(updates)
      .where(eq(userExercises.id, id))
      .returning();
    return userExercise;
  }

  // Shared phrase collections
  async getSharedPhraseCollection(shareId: string): Promise<SharedPhraseCollection | undefined> {
    const [collection] = await db
      .select()
      .from(sharedPhraseCollections)
      .where(eq(sharedPhraseCollections.shareId, shareId));
    return collection;
  }

  async createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection> {
    const [newCollection] = await db.insert(sharedPhraseCollections).values(collection).returning();
    return newCollection;
  }

  // User saved phrases operations
  async getUserSavedPhrases(userId: string): Promise<UserSavedPhrase[]> {
    const phrases = await db
      .select()
      .from(userSavedPhrases)
      .where(and(
        eq(userSavedPhrases.userId, userId),
        ne(userSavedPhrases.source, 'reader_content')
      ))
      .orderBy(desc(userSavedPhrases.createdAt));
    return phrases;
  }

  async createUserSavedPhrase(phrase: InsertUserSavedPhrase): Promise<UserSavedPhrase> {
    const [newPhrase] = await db.insert(userSavedPhrases).values(phrase).returning();
    return newPhrase;
  }

  async deleteUserSavedPhrase(id: number): Promise<void> {
    await db.delete(userSavedPhrases).where(eq(userSavedPhrases.id, id));
  }

  // Practice group operations
  async getPracticeGroups(userId: string): Promise<PracticeGroup[]> {
    return await db
      .select()
      .from(practiceGroups)
      .where(eq(practiceGroups.userId, userId))
      .orderBy(desc(practiceGroups.createdAt));
  }

  async getPracticeGroup(id: number): Promise<PracticeGroup | undefined> {
    const [group] = await db.select().from(practiceGroups).where(eq(practiceGroups.id, id));
    return group;
  }

  async createPracticeGroup(group: InsertPracticeGroup): Promise<PracticeGroup> {
    const [newGroup] = await db.insert(practiceGroups).values(group).returning();
    return newGroup;
  }

  async updatePracticeGroup(id: number, updates: Partial<PracticeGroup>): Promise<PracticeGroup> {
    const [group] = await db
      .update(practiceGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(practiceGroups.id, id))
      .returning();
    return group;
  }

  async deletePracticeGroup(id: number): Promise<void> {
    // First delete all phrases in the group
    await db.delete(practiceGroupPhrases).where(eq(practiceGroupPhrases.groupId, id));
    // Then delete the group
    await db.delete(practiceGroups).where(eq(practiceGroups.id, id));
  }

  // Practice group phrase operations
  async getPracticeGroupPhrases(groupId: number): Promise<PracticeGroupPhrase[]> {
    return await db
      .select()
      .from(practiceGroupPhrases)
      .where(eq(practiceGroupPhrases.groupId, groupId))
      .orderBy(desc(practiceGroupPhrases.addedAt));
  }

  async addPhraseToPracticeGroup(groupPhrase: InsertPracticeGroupPhrase): Promise<PracticeGroupPhrase> {
    const [newGroupPhrase] = await db.insert(practiceGroupPhrases).values(groupPhrase).returning();
    return newGroupPhrase;
  }

  async removePhrasesFromPracticeGroup(groupId: number, phraseIds: number[]): Promise<void> {
    await db
      .delete(practiceGroupPhrases)
      .where(
        and(
          eq(practiceGroupPhrases.groupId, groupId),
          inArray(practiceGroupPhrases.phraseId, phraseIds)
        )
      );
  }

  async getUserActivityStats(userId: string): Promise<{
    wordStats: { total: number; avgScore: number; recent: UserActivity[] };
    phraseStats: { total: number; avgScore: number; recent: UserActivity[] };
    readingStats: { total: number; avgScore: number; recent: UserActivity[] };
  }> {
    // Get word practice activities
    const wordActivities = await db
      .select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, 'word_practice')
      ))
      .orderBy(desc(userActivity.createdAt));

    // Get phrase practice activities  
    const phraseActivities = await db
      .select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, 'phrase_practice')
      ))
      .orderBy(desc(userActivity.createdAt));

    // Get reading session activities
    const readingActivities = await db
      .select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, 'reading_session')
      ))
      .orderBy(desc(userActivity.createdAt));

    // Calculate averages and get recent items
    const calculateStats = (activities: UserActivity[]) => ({
      total: activities.length,
      avgScore: activities.length > 0 
        ? activities.reduce((sum, a) => sum + (a.score || 0), 0) / activities.length 
        : 0,
      recent: activities.slice(0, 10)
    });

    return {
      wordStats: calculateStats(wordActivities),
      phraseStats: calculateStats(phraseActivities),
      readingStats: calculateStats(readingActivities)
    };
  }

  // Get paginated recent activities for Most Recent Activities table
  async getRecentActivities(userId: string, limit: number = 10, offset: number = 0): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Get total count of activities for pagination
  async getTotalActivitiesCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userActivity)
      .where(eq(userActivity.userId, userId));
    
    return result[0]?.count || 0;
  }

  // Assignment operations
  async getUserAssignments(userId: string): Promise<Assignment[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Get assignments either by userId OR by matching email address
    return db
      .select()
      .from(assignments)
      .where(
        or(
          eq(assignments.userId, userId),
          user.email ? eq(assignments.clientEmail, user.email) : sql`false`
        )
      )
      .orderBy(desc(assignments.createdAt));
  }

  async getTherapistAssignments(therapistId: string): Promise<Assignment[]> {
    return db
      .select()
      .from(assignments)
      .where(eq(assignments.therapistId, therapistId))
      .orderBy(desc(assignments.createdAt));
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id));
    return assignment;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [created] = await db
      .insert(assignments)
      .values(assignment)
      .returning();
    return created;
  }

  async updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment> {
    const [updated] = await db
      .update(assignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updated;
  }

  async deleteAssignment(id: number): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // Assignment item operations
  async getAssignmentItems(assignmentId: number): Promise<AssignmentItem[]> {
    return db
      .select()
      .from(assignmentItems)
      .where(eq(assignmentItems.assignmentId, assignmentId))
      .orderBy(asc(assignmentItems.createdAt));
  }

  async createAssignmentItem(item: InsertAssignmentItem): Promise<AssignmentItem> {
    const [created] = await db
      .insert(assignmentItems)
      .values(item)
      .returning();
    return created;
  }

  async updateAssignmentItem(id: number, updates: Partial<AssignmentItem>): Promise<AssignmentItem> {
    const [updated] = await db
      .update(assignmentItems)
      .set(updates)
      .where(eq(assignmentItems.id, id))
      .returning();
    return updated;
  }

  async deleteAssignmentItem(id: number): Promise<void> {
    await db.delete(assignmentItems).where(eq(assignmentItems.id, id));
  }

  // Assignment result operations
  async getAssignmentResults(assignmentId: number): Promise<AssignmentResult[]> {
    return db
      .select()
      .from(assignmentResults)
      .where(eq(assignmentResults.assignmentId, assignmentId))
      .orderBy(desc(assignmentResults.practiceDate));
  }

  async createAssignmentResult(result: InsertAssignmentResult): Promise<AssignmentResult> {
    const [created] = await db
      .insert(assignmentResults)
      .values(result)
      .returning();
    return created;
  }

  async getAssignmentProgress(assignmentId: number): Promise<{
    totalItems: number;
    completedItems: number;
    averageScore: number;
  }> {
    const items = await this.getAssignmentItems(assignmentId);
    const totalItems = items.length;
    const completedItems = items.filter(item => item.isCompleted).length;
    
    // Calculate average score from best scores of completed items
    const completedItemsWithScores = items.filter(item => item.isCompleted && item.bestScore !== null);
    const averageScore = completedItemsWithScores.length > 0
      ? completedItemsWithScores.reduce((sum, item) => sum + (item.bestScore || 0), 0) / completedItemsWithScores.length
      : 0;

    return {
      totalItems,
      completedItems,
      averageScore: Math.round(averageScore)
    };
  }

  // Transfer email-based assignments to a newly registered user
  async transferEmailAssignments(userEmail: string, userId: string): Promise<void> {
    await db
      .update(assignments)
      .set({ 
        userId: userId, 
        clientEmail: null, // Clear email since user is now registered
        updatedAt: new Date() 
      })
      .where(and(
        eq(assignments.clientEmail, userEmail),
        sql`${assignments.userId} IS NULL` // Only transfer assignments without a userId
      ));
  }

  // User saved readings operations (stored as phrases with reader_content source)
  async getUserSavedReadings(userId: string): Promise<UserSavedPhrase[]> {
    const readings = await db
      .select()
      .from(userSavedPhrases)
      .where(and(
        eq(userSavedPhrases.userId, userId),
        eq(userSavedPhrases.source, 'reader_content')
      ))
      .orderBy(desc(userSavedPhrases.createdAt));
    return readings;
  }

  async createUserSavedReading(content: InsertUserSavedPhrase): Promise<UserSavedPhrase> {
    const [newReading] = await db.insert(userSavedPhrases).values(content).returning();
    return newReading;
  }

  // Therapist-client relationship operations
  async getTherapistClients(therapistId: string): Promise<(TherapistClient & { client: User })[]> {
    const relationships = await db
      .select({
        id: therapistClients.id,
        therapistId: therapistClients.therapistId,
        clientId: therapistClients.clientId,
        assignedDate: therapistClients.assignedDate,
        isActive: therapistClients.isActive,
        notes: therapistClients.notes,
        createdAt: therapistClients.createdAt,
        client: users
      })
      .from(therapistClients)
      .innerJoin(users, eq(therapistClients.clientId, users.id))
      .where(and(
        eq(therapistClients.therapistId, therapistId),
        eq(therapistClients.isActive, true)
      ))
      .orderBy(desc(therapistClients.assignedDate));
    
    return relationships;
  }

  async addTherapistClient(relationship: InsertTherapistClient): Promise<TherapistClient> {
    const [newRelationship] = await db
      .insert(therapistClients)
      .values(relationship)
      .returning();
    return newRelationship;
  }

  async removeTherapistClient(therapistId: string, clientId: string): Promise<void> {
    await db
      .update(therapistClients)
      .set({ isActive: false })
      .where(and(
        eq(therapistClients.therapistId, therapistId),
        eq(therapistClients.clientId, clientId)
      ));
  }

  async getClientsByEmail(therapistId: string, emails: string[]): Promise<User[]> {
    if (emails.length === 0) return [];
    
    const clients = await db
      .select()
      .from(users)
      .where(and(
        sql`${users.email} = ANY(${emails})`,
        eq(users.role, 'client')
      ));
    
    return clients;
  }

  // Client invitation operations
  async createClientInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation> {
    const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const [newInvitation] = await db
      .insert(clientInvitations)
      .values({
        ...invitation,
        invitationToken,
        expiresAt
      })
      .returning();
    return newInvitation;
  }

  async getClientInvitations(therapistId: string): Promise<ClientInvitation[]> {
    const invitations = await db
      .select()
      .from(clientInvitations)
      .where(eq(clientInvitations.therapistId, therapistId))
      .orderBy(desc(clientInvitations.sentAt));
    
    return invitations;
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(clientInvitations)
      .where(eq(clientInvitations.invitationToken, token));
    
    return invitation;
  }

  async updateClientInvitationStatus(id: number, status: string, acceptedAt?: Date): Promise<ClientInvitation> {
    const [updatedInvitation] = await db
      .update(clientInvitations)
      .set({ status, acceptedAt })
      .where(eq(clientInvitations.id, id))
      .returning();
    
    return updatedInvitation;
  }

  async getPendingInvitations(therapistId: string): Promise<ClientInvitation[]> {
    const invitations = await db
      .select()
      .from(clientInvitations)
      .where(and(
        eq(clientInvitations.therapistId, therapistId),
        eq(clientInvitations.status, 'pending')
      ))
      .orderBy(desc(clientInvitations.sentAt));
    
    return invitations;
  }

  // Content library operations for therapists
  async getContentLibrary(therapistId: string): Promise<ContentLibrary[]> {
    const content = await db
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.createdBy, therapistId))
      .orderBy(desc(contentLibrary.updatedAt));
    
    return content;
  }

  async getPublicContentLibrary(): Promise<ContentLibrary[]> {
    const content = await db
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.isPublic, true))
      .orderBy(desc(contentLibrary.usageCount), desc(contentLibrary.updatedAt));
    
    return content;
  }

  async createContentLibraryItem(content: InsertContentLibrary): Promise<ContentLibrary> {
    const [newContent] = await db
      .insert(contentLibrary)
      .values(content)
      .returning();
    return newContent;
  }

  async updateContentLibraryItem(id: number, updates: Partial<ContentLibrary>): Promise<ContentLibrary> {
    const [updatedContent] = await db
      .update(contentLibrary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentLibrary.id, id))
      .returning();
    return updatedContent;
  }

  async deleteContentLibraryItem(id: number): Promise<void> {
    await db
      .delete(contentLibrary)
      .where(eq(contentLibrary.id, id));
  }

  // Health check for deployment readiness
  async healthCheck(): Promise<void> {
    try {
      // Simple database connectivity test
      await db.select().from(users).limit(1);
    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const storage = new DatabaseStorage();