import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
