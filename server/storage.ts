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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, sql, count, avg } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User stats operations
  getUserStats(userId: string): Promise<UserStats | undefined>;
  updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats>;
  
  // User activity tracking
  recordActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
    return user;
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
    return await db
      .select()
      .from(userSavedPhrases)
      .where(eq(userSavedPhrases.userId, userId))
      .orderBy(desc(userSavedPhrases.createdAt));
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
          sql`${practiceGroupPhrases.phraseId} = ANY(${phraseIds})`
        )
      );
  }
}

export const storage = new DatabaseStorage();