import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  totalExercisesCompleted: integer("total_exercises_completed").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
  unlockedRewards: jsonb("unlocked_rewards"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User profiles with avatar customization
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReadingContentSchema = createInsertSchema(readingContent).omit({
  id: true,
  createdAt: true,
});

export type InsertReadingContent = z.infer<typeof insertReadingContentSchema>;
export type ReadingContent = typeof readingContent.$inferSelect;

// Reading session
export const readingSession = pgTable("reading_session", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  contentId: integer("content_id").notNull(),
  pronunciationScore: integer("pronunciation_score"),
  fluencyScore: integer("fluency_score"),
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
  userId: integer("user_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  pronunciationScore: integer("pronunciation_score"),
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
