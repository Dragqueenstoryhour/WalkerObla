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
  getRecentActivities(userId: string, limit?: number): Promise<UserActivity[]>;
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
    sendAssignmentToClients(data: {
      sourceAssignmentId: number;
      clientIds: string[];
      therapistId: string;
      therapistName: string;
      dueDate?: string;
      therapistNotes?: string;
    }): Promise<{ assignments: Assignment[]; items: AssignmentItem[] }>;
    
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
    getContentLibraryItem(id: number): Promise<ContentLibrary | undefined>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw new Error("Failed to fetch user by email");
    }
  }

  async getTherapistClient(therapistId: string, clientId: string): Promise<TherapistClient | undefined> {
    try {
      // Get ANY relationship (active or inactive) between this therapist and client
      const [relationship] = await db
        .select()
        .from(therapistClients)
        .where(and(
          eq(therapistClients.therapistId, therapistId),
          eq(therapistClients.clientId, clientId)
        ));
      return relationship;
    } catch (error) {
      console.error("Error fetching therapist-client relationship:", error);
      throw new Error("Failed to fetch therapist-client relationship");
    }
  }

  async updateTherapistClientStatus(therapistId: string, clientId: string, isActive: boolean): Promise<TherapistClient> {
    try {
      const [relationship] = await db
        .update(therapistClients)
        .set({ isActive })
        .where(and(
          eq(therapistClients.therapistId, therapistId),
          eq(therapistClients.clientId, clientId)
        ))
        .returning();
      
      if (!relationship) {
        throw new Error("Therapist-client relationship not found");
      }
      
      return relationship;
    } catch (error) {
      console.error("Error updating therapist-client relationship status:", error);
      throw new Error("Failed to update therapist-client relationship status");
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    console.log(`🔧 upsertUser called with:`, { id: userData.id, email: userData.email, role: userData.role });
    
    // FIRST: Check if there's an existing user with this email (handles synthetic clients)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      const existing = existingUserByEmail[0];
      console.log(`🔧 Found existing user with same email:`, { id: existing.id, email: existing.email, role: existing.role });
      
      // If it's a synthetic client (starts with 'client_'), transfer assignments to OAuth user
      if (existing.id.startsWith('client_') && userData.id !== existing.id) {
        console.log(`🔧 Transferring assignments from synthetic client ${existing.id} to OAuth user ${userData.id}`);
        
        // First, change the synthetic client's email to avoid constraint violation
        await db
          .update(users)
          .set({ email: `${existing.email}.synthetic` })
          .where(eq(users.id, existing.id));
        
        // Transfer all assignments from synthetic client to OAuth user
        await db
          .update(assignments)
          .set({ userId: userData.id })
          .where(eq(assignments.userId, existing.id));
          
        console.log(`🔧 Assignments transferred and synthetic client email updated`);
        
        // Now proceed with creating the OAuth user
      } else if (existing.id === userData.id) {
        // Same user ID, just update the record
        console.log(`🔧 Updating existing user with same ID`);
        const [user] = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      } else {
        // Different OAuth user with same email - this shouldn't happen but handle gracefully
        console.log(`🔧 Warning: Different user with same email exists`);
        return existing;
      }
    }

    // Standard upsert for new users
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
    } catch (error: any) {
      console.error("Error upserting user:", error);
      console.error("User data:", userData);
      
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        if (error.constraint === 'users_email_idx') {
          throw new Error(`User with email ${userData.email} already exists`);
        }
        if (error.constraint === 'users_username_idx') {
          throw new Error(`Username ${userData.username} already exists`);
        }
        throw new Error(`Unique constraint violation: ${error.constraint}`);
      }
      
      throw new Error(`Failed to upsert user: ${error.message}`);
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
    console.log(`🔍 getUserAssignments called for userId: ${userId}`);
    
    const user = await this.getUser(userId);
    console.log(`🔍 User found:`, user ? { id: user.id, email: user.email, role: user.role } : 'No user found');
    
    if (!user) return [];

    // Get assignments by multiple criteria:
    // 1. Direct userId match
    // 2. clientEmail match
    // 3. Any user with same email who has assignments (handles therapist-created vs OAuth users)
    let conditions = [
      eq(assignments.userId, userId),
      user.email ? eq(assignments.clientEmail, user.email) : sql`false`
    ];

    console.log(`🔍 Initial conditions: Direct userId match, clientEmail match for ${user.email}`);

    // If this user has an email, also check for assignments to other users with same email
    if (user.email) {
      const usersWithSameEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, user.email));
      
      console.log(`🔍 Users with same email (${user.email}):`, usersWithSameEmail);
      
      const userIds = usersWithSameEmail.map(u => u.id);
      if (userIds.length > 0) {
        conditions.push(inArray(assignments.userId, userIds));
        console.log(`🔍 Added userIds to search:`, userIds);
      }
    }

    // Also check all assignments to see what's in the database
    const allAssignments = await db.select().from(assignments);
    console.log(`🔍 Total assignments in database: ${allAssignments.length}`);
    if (allAssignments.length > 0) {
      console.log(`🔍 Sample assignments:`, allAssignments.slice(0, 3).map(a => ({
        id: a.id,
        userId: a.userId,
        clientEmail: a.clientEmail,
        title: a.title
      })));
    }

    const result = await db
      .select()
      .from(assignments)
      .where(or(...conditions))
      .orderBy(desc(assignments.createdAt));

    console.log(`🔍 Query result: Found ${result.length} assignments for user ${userId}`);
    if (result.length > 0) {
      console.log(`🔍 Found assignments:`, result.map(a => ({ id: a.id, title: a.title, userId: a.userId })));
    }

    return result;
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

  // Send existing assignment to multiple clients
  async sendAssignmentToClients(data: {
    sourceAssignmentId: number;
    clientIds: string[];
    therapistId: string;
    therapistName: string;
    dueDate?: string;
    therapistNotes?: string;
  }): Promise<{ assignments: Assignment[]; items: AssignmentItem[] }> {
    // Get the source assignment and its items
    const sourceAssignment = await this.getAssignment(data.sourceAssignmentId);
    if (!sourceAssignment) {
      throw new Error('Source assignment not found');
    }

    const sourceItems = await this.getAssignmentItems(data.sourceAssignmentId);

    const createdAssignments: Assignment[] = [];
    const createdItems: AssignmentItem[] = [];

    // Create a new assignment for each client
    for (const clientId of data.clientIds) {
      // Create assignment
      const newAssignment = await this.createAssignment({
        userId: clientId,
        therapistId: data.therapistId,
        therapistName: data.therapistName,
        title: sourceAssignment.title,
        description: data.therapistNotes 
          ? `${sourceAssignment.description || ''}\n\nNotes from your therapist: ${data.therapistNotes}`.trim()
          : sourceAssignment.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      });

      createdAssignments.push(newAssignment);

      // Create assignment items
      for (const sourceItem of sourceItems) {
        const newItem = await this.createAssignmentItem({
          assignmentId: newAssignment.id,
          itemType: sourceItem.itemType,
          content: sourceItem.content,
          syllabication: sourceItem.syllabication,
          phonetic: sourceItem.phonetic,
          definition: sourceItem.definition,
          difficulty: sourceItem.difficulty
        });

        createdItems.push(newItem);
      }
    }

    return { assignments: createdAssignments, items: createdItems };
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

  // Therapist-client relationship operations
  async getTherapistClients(therapistId: string): Promise<(TherapistClient & { client: User })[]> {
    console.log(`🔍 getTherapistClients called for therapist: ${therapistId}`);
    
    // First, let's see ALL relationships for this therapist (including inactive)
    const allRelationships = await db
      .select({
        id: therapistClients.id,
        therapistId: therapistClients.therapistId,
        clientId: therapistClients.clientId,
        assignedDate: therapistClients.assignedDate,
        isActive: therapistClients.isActive,
        notes: therapistClients.notes,
        createdAt: therapistClients.createdAt,
        client: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          licenseNumber: users.licenseNumber,
          specializations: users.specializations,
          level: users.level,
          xp: users.xp,
          totalExercisesCompleted: users.totalExercisesCompleted,
          streakDays: users.streakDays,
          lastActivityDate: users.lastActivityDate,
          unlockedRewards: users.unlockedRewards,
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
          subscriptionStatus: users.subscriptionStatus,
          subscriptionStartDate: users.subscriptionStartDate,
          subscriptionEndDate: users.subscriptionEndDate,
          trialEndDate: users.trialEndDate,
          createdAt: users.createdAt
        }
      })
      .from(therapistClients)
      .innerJoin(users, eq(therapistClients.clientId, users.id))
      .where(eq(therapistClients.therapistId, therapistId))
      .orderBy(desc(therapistClients.assignedDate));
    
    console.log(`🔍 ALL relationships for therapist ${therapistId}:`, allRelationships.map(r => ({
      relationshipId: r.id,
      clientId: r.clientId,
      clientEmail: r.client.email,
      isActive: r.isActive,
      assignedDate: r.assignedDate
    })));
    
    // Now filter for active only and exclude synthetic users (those with .synthetic email suffix)
    const activeRelationships = allRelationships.filter(r => 
      r.isActive && !r.client.email.endsWith('.synthetic')
    );
    
    console.log(`🔍 ACTIVE relationships for therapist ${therapistId}:`, activeRelationships.map(r => ({
      relationshipId: r.id,
      clientId: r.clientId,
      clientEmail: r.client.email,
      isActive: r.isActive
    })));
    
    return activeRelationships;
  }

  async addTherapistClient(relationship: InsertTherapistClient): Promise<TherapistClient> {
    const [newRelationship] = await db
      .insert(therapistClients)
      .values(relationship)
      .returning();
    return newRelationship;
  }

  async removeTherapistClient(therapistId: string, clientId: string): Promise<void> {
    // Deactivate the therapist-client relationship (soft delete)
    await db
      .update(therapistClients)
      .set({ isActive: false })
      .where(and(
        eq(therapistClients.therapistId, therapistId),
        eq(therapistClients.clientId, clientId)
      ));

    // Find the client's email to update pending invitations
    const client = await this.getUser(clientId);
    if (client && client.email) {
      // Update any pending invitations for this client from this therapist to 'expired'
      await db
        .update(clientInvitations)
        .set({ status: 'expired', acceptedAt: new Date() }) // Set acceptedAt to now for expiration timestamp
        .where(and(
          eq(clientInvitations.therapistId, therapistId),
          eq(clientInvitations.clientEmail, client.email),
          eq(clientInvitations.status, 'pending')
        ));
    }
  }

  async getClientsByEmail(therapistId: string, emails: string[]): Promise<User[]> {
    if (emails.length === 0) return [];
    
    const clients = await db
      .select()
      .from(users)
      .where(and(
        inArray(users.email, emails),
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

  async getContentLibraryItem(id: number): Promise<ContentLibrary | undefined> {
    const [content] = await db
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.id, id));
    
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