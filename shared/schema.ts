import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Changed to varchar for Replit Auth user IDs
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("client"), // 'client', 'therapist', 'admin'
  licenseNumber: text("license_number"), // For therapists - professional license number
  specializations: jsonb("specializations"), // Array of specialization areas for therapists
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
}, (table) => {
  return {
    usersEmailIdx: uniqueIndex("users_email_idx").on(table.email),
    usersRoleIdx: index("users_role_idx").on(table.role),
    usersUsernameIdx: uniqueIndex("users_username_idx").on(table.username),
  };
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
  role?: string;
  licenseNumber?: string | null;
  specializations?: any; // jsonb type
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
}, (table) => {
  return {
    userProfilesUserIdIdx: uniqueIndex("user_profiles_user_id_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    readingContentSourceIdx: index("reading_content_source_idx").on(table.source),
    readingContentDifficultyIdx: index("reading_content_difficulty_idx").on(table.difficulty),
    readingContentCreatedAtIdx: index("reading_content_created_at_idx").on(table.createdAt),
  };
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
}, (table) => {
  return {
    wordFoldersUserIdIdx: index("word_folders_user_id_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    savedWordsUserIdIdx: index("saved_words_user_id_idx").on(table.userId),
    savedWordsWordIdx: index("saved_words_word_idx").on(table.word),
    savedWordsFolderIdIdx: index("saved_words_folder_id_idx").on(table.folderId),
  };
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
}, (table) => {
  return {
    readingSessionUserIdIdx: index("reading_session_user_id_idx").on(table.userId),
    readingSessionContentIdIdx: index("reading_session_content_id_idx").on(table.contentId),
    readingSessionCompletedAtIdx: index("reading_session_completed_at_idx").on(table.completedAt),
  };
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
}, (table) => {
  return {
    gameLevelsLevelNumberIdx: uniqueIndex("game_levels_level_number_idx").on(table.levelNumber),
    gameLevelsDifficultyIdx: index("game_levels_difficulty_idx").on(table.difficulty),
  };
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
}, (table) => {
  return {
    exercisesLevelIdIdx: index("exercises_level_id_idx").on(table.levelId),
    exercisesTypeIdx: index("exercises_type_idx").on(table.type),
    exercisesDifficultyIdx: index("exercises_difficulty_idx").on(table.difficulty),
  };
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
}, (table) => {
  return {
    userExercisesUserIdIdx: index("user_exercises_user_id_idx").on(table.userId),
    userExercisesExerciseIdIdx: index("user_exercises_exercise_id_idx").on(table.exerciseId),
    userExercisesCompletedIdx: index("user_exercises_completed_idx").on(table.completed),
  };
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
}, (table) => {
  return {
    sharedPhraseCollectionsShareIdIdx: uniqueIndex("shared_phrase_collections_share_id_idx").on(table.shareId),
    sharedPhraseCollectionsUserIdIdx: index("shared_phrase_collections_user_id_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    userSavedPhrasesUserIdIdx: index("user_saved_phrases_user_id_idx").on(table.userId),
    userSavedPhrasesSourceIdx: index("user_saved_phrases_source_idx").on(table.source),
    userSavedPhrasesPhraseIdx: index("user_saved_phrases_phrase_idx").on(table.phrase),
  };
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
}, (table) => {
  return {
    practiceGroupsUserIdIdx: index("practice_groups_user_id_idx").on(table.userId),
    practiceGroupsShareIdIdx: uniqueIndex("practice_groups_share_id_idx").on(table.shareId),
  };
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
}, (table) => {
  return {
    practiceGroupPhrasesGroupIdIdx: index("practice_group_phrases_group_id_idx").on(table.groupId),
    practiceGroupPhrasesPhraseIdIdx: index("practice_group_phrases_phrase_id_idx").on(table.phraseId),
  };
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
}, (table) => {
  return {
    userActivityUserIdIdx: index("user_activity_user_id_idx").on(table.userId),
    userActivityActivityTypeIdx: index("user_activity_activity_type_idx").on(table.activityType),
    userActivityCreatedAtIdx: index("user_activity_created_at_idx").on(table.createdAt),
    userActivityCompositeIdx: index("user_activity_composite_idx").on(table.userId, table.activityType, table.createdAt),
  };
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
}, (table) => {
  return {
    userStatsUserIdIdx: uniqueIndex("user_stats_user_id_idx").on(table.userId),
  };
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

// Assignments table for therapist-assigned homework
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Student receiving the assignment (nullable for email-based assignments)
  clientEmail: varchar("client_email"), // Email address for assignments to non-registered users
  therapistId: varchar("therapist_id").notNull(), // Therapist who created the assignment
  therapistName: text("therapist_name").notNull(), // Therapist display name
  title: text("title").notNull(), // Assignment title
  description: text("description"), // Optional description/instructions
  dueDate: timestamp("due_date"), // Optional due date
  invitationId: integer("invitation_id"), // Link to client invitation if created for email
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    assignmentsUserIdIdx: index("assignments_user_id_idx").on(table.userId),
    assignmentsClientEmailIdx: index("assignments_client_email_idx").on(table.clientEmail),
    assignmentsTherapistIdIdx: index("assignments_therapist_id_idx").on(table.therapistId),
    assignmentsDueDateIdx: index("assignments_due_date_idx").on(table.dueDate),
    assignmentsInvitationIdIdx: index("assignments_invitation_id_idx").on(table.invitationId),
  };
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  isCompleted: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// Assignment items (individual words/phrases within an assignment)
export const assignmentItems = pgTable("assignment_items", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  itemType: text("item_type").notNull(), // 'word' | 'phrase'
  content: text("content").notNull(), // The actual word or phrase
  syllabication: text("syllabication"), // For words - syllable breakdown
  phonetic: text("phonetic"), // Phonetic guide
  definition: text("definition"), // Optional definition
  difficulty: text("difficulty"), // Difficulty level
  isCompleted: boolean("is_completed").notNull().default(false),
  lastScore: real("last_score"), // Most recent pronunciation score (0-100)
  bestScore: real("best_score"), // Best pronunciation score achieved
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    assignmentItemsAssignmentIdIdx: index("assignment_items_assignment_id_idx").on(table.assignmentId),
    assignmentItemsIsCompletedIdx: index("assignment_items_is_completed_idx").on(table.isCompleted),
    assignmentItemsLastScoreIdx: index("assignment_items_last_score_idx").on(table.lastScore),
  };
});

export const insertAssignmentItemSchema = createInsertSchema(assignmentItems).omit({
  id: true,
  isCompleted: true,
  lastScore: true,
  bestScore: true,
  attemptCount: true,
  lastAttemptAt: true,
  createdAt: true,
});

export type InsertAssignmentItem = z.infer<typeof insertAssignmentItemSchema>;
export type AssignmentItem = typeof assignmentItems.$inferSelect;

// Assignment results for detailed tracking and therapist feedback
export const assignmentResults = pgTable("assignment_results", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  itemId: integer("item_id").notNull(),
  userId: varchar("user_id").notNull(),
  pronunciationScore: real("pronunciation_score"), // Overall pronunciation score
  accuracyScore: real("accuracy_score"), // Accuracy score
  fluencyScore: real("fluency_score"), // Fluency score
  completenessScore: real("completeness_score"), // Completeness score
  detailedResults: jsonb("detailed_results"), // Full assessment results from Azure
  audioUrl: text("audio_url"), // Optional: link to recorded audio
  practiceDate: timestamp("practice_date").notNull().defaultNow(),
}, (table) => {
  return {
    assignmentResultsAssignmentIdIdx: index("assignment_results_assignment_id_idx").on(table.assignmentId),
    assignmentResultsItemIdIdx: index("assignment_results_item_id_idx").on(table.itemId),
    assignmentResultsUserIdIdx: index("assignment_results_user_id_idx").on(table.userId),
    assignmentResultsPracticeDateIdx: index("assignment_results_practice_date_idx").on(table.practiceDate),
  };
});

export const insertAssignmentResultSchema = createInsertSchema(assignmentResults).omit({
  id: true,
  practiceDate: true,
});

export type InsertAssignmentResult = z.infer<typeof insertAssignmentResultSchema>;
export type AssignmentResult = typeof assignmentResults.$inferSelect;

// Therapist-Client relationships
export const therapistClients = pgTable("therapist_clients", {
  id: serial("id").primaryKey(),
  therapistId: varchar("therapist_id").notNull(), // The therapist's user ID
  clientId: varchar("client_id").notNull(), // The client's user ID
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), // Optional notes about the client-therapist relationship
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    therapistClientsTherapistIdIdx: index("therapist_clients_therapist_id_idx").on(table.therapistId),
    therapistClientsClientIdIdx: index("therapist_clients_client_id_idx").on(table.clientId),
    therapistClientsCompositeIdx: index("therapist_clients_composite_idx").on(table.therapistId, table.clientId),
  };
});

export const insertTherapistClientSchema = createInsertSchema(therapistClients).omit({
  id: true,
  assignedDate: true,
  createdAt: true,
});

export type InsertTherapistClient = z.infer<typeof insertTherapistClientSchema>;
export type TherapistClient = typeof therapistClients.$inferSelect;

// Client invitations for pending invites
export const clientInvitations = pgTable("client_invitations", {
  id: serial("id").primaryKey(),
  therapistId: varchar("therapist_id").notNull(), // The therapist sending the invitation
  clientEmail: text("client_email").notNull(), // Email address of the invited client
  invitationToken: text("invitation_token").notNull().unique(), // Unique token for the invitation
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  notes: text("notes"), // Optional notes about the invitation
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    clientInvitationsTherapistIdIdx: index("client_invitations_therapist_id_idx").on(table.therapistId),
    clientInvitationsClientEmailIdx: index("client_invitations_client_email_idx").on(table.clientEmail),
    clientInvitationsInvitationTokenIdx: uniqueIndex("client_invitations_invitation_token_idx").on(table.invitationToken),
    clientInvitationsStatusIdx: index("client_invitations_status_idx").on(table.status),
  };
});

export const insertClientInvitationSchema = createInsertSchema(clientInvitations).omit({
  id: true,
  invitationToken: true,
  status: true,
  sentAt: true,
  acceptedAt: true,
  createdAt: true,
});

export type InsertClientInvitation = z.infer<typeof insertClientInvitationSchema>;
export type ClientInvitation = typeof clientInvitations.$inferSelect;

// Content Library for Therapists
export const contentLibrary = pgTable("content_library", {
  id: serial("id").primaryKey(),
  createdBy: varchar("created_by").notNull(), // Therapist who created this content
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(), // 'words', 'phrases', 'custom'
  items: jsonb("items").notNull(), // Array of words/phrases with metadata
  difficulty: text("difficulty").notNull().default("beginner"),
  category: text("category"), // e.g., "Articulation", "Fluency", "Voice"
  tags: jsonb("tags"), // Array of search tags
  isPublic: boolean("is_public").notNull().default(false), // Can other therapists use this?
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    contentLibraryCreatedByIdx: index("content_library_created_by_idx").on(table.createdBy),
    contentLibraryContentTypeIdx: index("content_library_content_type_idx").on(table.contentType),
    contentLibraryDifficultyIdx: index("content_library_difficulty_idx").on(table.difficulty),
    contentLibraryCategoryIdx: index("content_library_category_idx").on(table.category),
    contentLibraryIsPublicIdx: index("content_library_is_public_idx").on(table.isPublic),
  };
});

export const insertContentLibrarySchema = createInsertSchema(contentLibrary).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentLibrary = z.infer<typeof insertContentLibrarySchema>;
export type ContentLibrary = typeof contentLibrary.$inferSelect;