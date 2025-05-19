CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"difficulty" text DEFAULT 'easy' NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"required_xp" integer NOT NULL,
	"unlockable_rewards" jsonb,
	"difficulty" text DEFAULT 'easy' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_levels_level_number_unique" UNIQUE("level_number")
);
--> statement-breakpoint
CREATE TABLE "practice_group_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"phrase_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"share_id" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practice_groups_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
CREATE TABLE "reading_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"word_count" integer NOT NULL,
	"reading_time" integer NOT NULL,
	"difficulty" text DEFAULT 'easy' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"content_id" integer NOT NULL,
	"pronunciation_score" integer,
	"fluency_score" integer,
	"words_read" integer,
	"feedback" jsonb,
	"recording_url" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_phrase_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"user_id" varchar,
	"name" text,
	"phrases" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_phrase_collections_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
CREATE TABLE "user_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"pronunciation_score" integer,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" text,
	"avatar_style" jsonb,
	"selected_rewards" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_saved_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"phrase" text NOT NULL,
	"phonetic" text,
	"difficulty" text,
	"assessment_results" jsonb,
	"source" text,
	"source_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"bio" text,
	"profile_image_url" text,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"total_exercises_completed" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp,
	"unlocked_rewards" jsonb,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"trial_end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");