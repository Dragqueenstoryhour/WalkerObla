import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Changed to varchar for Replit Auth user IDs
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  totalExercisesCompleted: integer("total_exercises_completed").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
  unlockedRewards: jsonb("unlocked_rewards"),
  // Stripe subscription related fields for premium levels
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  bio: true,
  profileImageUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type UpsertUser = {
  id: string;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
};

// User profiles with avatar customization
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(), // Updated to match user ID type
  displayName: text("display_name"),
  avatarStyle: jsonb("avatar_style"), // Stores avatar customization settings
  selectedRewards: jsonb("selected_rewards"), // Currently selected cosmetic items
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Reading content
export const readingContent = pgTable("reading_content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  wordCount: integer("word_count").notNull(),
  readingTime: integer("reading_time").notNull(), // in seconds
  difficulty: text("difficulty").notNull().default("easy"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
});

export const insertReadingContentSchema = createInsertSchema(readingContent).omit({
  id: true,
  createdAt: true,
});

export type InsertReadingContent = z.infer<typeof insertReadingContentSchema>;
export type ReadingContent = typeof readingContent.$inferSelect;

// Word folders for organization
export const wordFolders = pgTable("word_folders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3b82f6"), // Default blue color
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWordFolderSchema = createInsertSchema(wordFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWordFolder = z.infer<typeof insertWordFolderSchema>;
export type WordFolder = typeof wordFolders.$inferSelect;

// Saved words with folder organization
export const savedWords = pgTable("saved_words", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  word: text("word").notNull(),
  syllabication: text("syllabication"), // Added for syllable breakdown display
  definition: text("definition"),
  pronunciation: text("pronunciation"),
  folderId: integer("folder_id"),
  difficultyLevel: integer("difficulty_level").default(1),
  practiceCount: integer("practice_count").default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  masteryLevel: integer("mastery_level").default(0), // 0-100 scale
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSavedWordSchema = createInsertSchema(savedWords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedWord = z.infer<typeof insertSavedWordSchema>;
export type SavedWord = typeof savedWords.$inferSelect;

// Reading session
export const readingSession = pgTable("reading_session", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Updated to match user ID type
  contentId: integer("content_id").notNull(),
  pronunciationScore: real("pronunciation_score"),
  fluencyScore: real("fluency_score"),
  wordsRead: integer("words_read"),
  feedback: jsonb("feedback"),
  recordingUrl: text("recording_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReadingSessionSchema = createInsertSchema(readingSession).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type ReadingSession = typeof readingSession.$inferSelect;

// Game levels and progression
export const gameLevels = pgTable("game_levels", {
  id: serial("id").primaryKey(),
  levelNumber: integer("level_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  requiredXP: integer("required_xp").notNull(),
  unlockableRewards: jsonb("unlockable_rewards"),
  difficulty: text("difficulty").notNull().default("easy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameLevelSchema = createInsertSchema(gameLevels).omit({
  id: true,
  createdAt: true,
});

export type InsertGameLevel = z.infer<typeof insertGameLevelSchema>;
export type GameLevel = typeof gameLevels.$inferSelect;

// Exercises for levels
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  levelId: integer("level_id").notNull(),
  type: text("type").notNull(), // 'word', 'phrase', 'sentence'
  content: text("content").notNull(),
  difficulty: text("difficulty").notNull().default("easy"),
  xpReward: integer("xp_reward").notNull().default(10),
  order: integer("order").notNull(), // Order within level
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

// User exercise progress
export const userExercises = pgTable("user_exercises", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Updated to match user ID type
  exerciseId: integer("exercise_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  pronunciationScore: real("pronunciation_score"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserExerciseSchema = createInsertSchema(userExercises).omit({
  id: true,
  createdAt: true,
});

export type InsertUserExercise = z.infer<typeof insertUserExerciseSchema>;
export type UserExercise = typeof userExercises.$inferSelect;

// Shared phrase collections for sharing exercises with others
export const sharedPhraseCollections = pgTable("shared_phrase_collections", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull().unique(), // Unique identifier for sharing
  userId: varchar("user_id"), // The user who created this collection (optional)
  name: text("name"),
  phrases: jsonb("phrases").notNull(), // Array of phrases with their properties
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSharedPhraseCollectionSchema = createInsertSchema(sharedPhraseCollections).omit({
  id: true,
  createdAt: true,
});

export type InsertSharedPhraseCollection = z.infer<typeof insertSharedPhraseCollectionSchema>;
export type SharedPhraseCollection = typeof sharedPhraseCollections.$inferSelect;

// User's saved phrases for "My Words" feature
export const userSavedPhrases = pgTable("user_saved_phrases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  phrase: text("phrase").notNull(),
  phonetic: text("phonetic"),
  difficulty: text("difficulty"),
  assessmentResults: jsonb("assessment_results"), // Last assessment result
  source: text("source"), // Where this phrase came from (e.g., "shared", "manual", "generated")
  sourceId: text("source_id"), // Optional ID reference to source (e.g., shareId if from shared)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSavedPhraseSchema = createInsertSchema(userSavedPhrases).omit({
  id: true,
  createdAt: true,
});

export type InsertUserSavedPhrase = z.infer<typeof insertUserSavedPhraseSchema>;
export type UserSavedPhrase = typeof userSavedPhrases.$inferSelect;

// Practice Groups for organizing phrases
export const practiceGroups = pgTable("practice_groups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  shareId: text("share_id").unique(), // Optional unique identifier for sharing
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPracticeGroupSchema = createInsertSchema(practiceGroups).omit({
  id: true,
  shareId: true,
  isShared: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPracticeGroup = z.infer<typeof insertPracticeGroupSchema>;
export type PracticeGroup = typeof practiceGroups.$inferSelect;

// Practice Group Phrases - linking phrases to groups
export const practiceGroupPhrases = pgTable("practice_group_phrases", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  phraseId: integer("phrase_id").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertPracticeGroupPhraseSchema = createInsertSchema(practiceGroupPhrases).omit({
  id: true,
  addedAt: true,
});

export type InsertPracticeGroupPhrase = z.infer<typeof insertPracticeGroupPhraseSchema>;
export type PracticeGroupPhrase = typeof practiceGroupPhrases.$inferSelect;

// User activity tracking for comprehensive statistics
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  activityType: text("activity_type").notNull(), // 'word_practice', 'phrase_practice', 'reading_session', 'assessment'
  itemPracticed: text("item_practiced").notNull(), // The word/phrase/content practiced
  score: real("score"), // 0-100 pronunciation score
  accuracy: real("accuracy"), // 0-100 accuracy score  
  fluency: real("fluency"), // 0-100 fluency score
  completeness: real("completeness"), // 0-100 completeness score
  duration: integer("duration"), // Practice duration in seconds
  difficulty: text("difficulty"), // easy, medium, hard
  source: text("source"), // Where the practice came from (e.g., "my-words", "topic-practice", "shared")
  metadata: jsonb("metadata"), // Additional context like topic, group name, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivity.$inferSelect;

// User statistics aggregation table for quick dashboard loading
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  totalWordsPracticed: integer("total_words_practiced").notNull().default(0),
  totalPhrasesPracticed: integer("total_phrases_practiced").notNull().default(0),
  totalReadingSessions: integer("total_reading_sessions").notNull().default(0),
  totalPracticeTime: integer("total_practice_time").notNull().default(0), // in seconds
  averagePronunciationScore: real("average_pronunciation_score"), // 0-100
  averageAccuracyScore: real("average_accuracy_score"), // 0-100
  averageFluencyScore: real("average_fluency_score"), // 0-100
  currentStreak: integer("current_streak").notNull().default(0), // consecutive practice days
  longestStreak: integer("longest_streak").notNull().default(0),
  lastPracticeDate: timestamp("last_practice_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;
