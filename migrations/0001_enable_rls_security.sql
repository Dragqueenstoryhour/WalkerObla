-- Migration: Enable Row Level Security on all tables
-- This migration addresses all Supabase RLS security warnings
-- Created: 2025-07-26

-- Enable RLS on all public tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_words" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "word_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_saved_phrases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_group_phrases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reading_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "therapist_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_phrase_collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reading_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "game_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER POLICIES: Users can only access their own data
-- ============================================================================

-- Users table: Users can read/update their own record
CREATE POLICY "users_own_data" ON "users"
    FOR ALL USING (auth.uid()::text = id);

-- User profiles: Users can manage their own profile
CREATE POLICY "user_profiles_own_data" ON "user_profiles"
    FOR ALL USING (auth.uid()::text = user_id);

-- User stats: Users can view/update their own stats
CREATE POLICY "user_stats_own_data" ON "user_stats"
    FOR ALL USING (auth.uid()::text = user_id);

-- User activity: Users can view their own activity
CREATE POLICY "user_activity_own_data" ON "user_activity"
    FOR ALL USING (auth.uid()::text = user_id);

-- Saved words: Users can manage their own saved words
CREATE POLICY "saved_words_own_data" ON "saved_words"
    FOR ALL USING (auth.uid()::text = user_id);

-- Word folders: Users can manage their own folders
CREATE POLICY "word_folders_own_data" ON "word_folders"
    FOR ALL USING (auth.uid()::text = user_id);

-- User saved phrases: Users can manage their own phrases
CREATE POLICY "user_saved_phrases_own_data" ON "user_saved_phrases"
    FOR ALL USING (auth.uid()::text = user_id);

-- User exercises: Users can view/update their own exercise progress
CREATE POLICY "user_exercises_own_data" ON "user_exercises"
    FOR ALL USING (auth.uid()::text = user_id);

-- Practice groups: Users can manage their own practice groups
CREATE POLICY "practice_groups_own_data" ON "practice_groups"
    FOR ALL USING (auth.uid()::text = user_id);

-- Reading sessions: Users can view their own reading sessions
CREATE POLICY "reading_session_own_data" ON "reading_session"
    FOR ALL USING (auth.uid()::text = user_id);

-- ============================================================================
-- THERAPIST-CLIENT RELATIONSHIP POLICIES
-- ============================================================================

-- Therapist-client relationships: Therapists can manage their client relationships
CREATE POLICY "therapist_clients_therapist_access" ON "therapist_clients"
    FOR ALL USING (auth.uid()::text = therapist_id);

-- Therapist-client relationships: Clients can view their therapist relationships
CREATE POLICY "therapist_clients_client_access" ON "therapist_clients"
    FOR SELECT USING (auth.uid()::text = client_id);

-- Client invitations: Therapists can manage their own invitations
CREATE POLICY "client_invitations_therapist_access" ON "client_invitations"
    FOR ALL USING (auth.uid()::text = therapist_id);

-- ============================================================================
-- ASSIGNMENT POLICIES: Complex multi-party access
-- ============================================================================

-- Assignments: Therapists can manage assignments they created
CREATE POLICY "assignments_therapist_access" ON "assignments"
    FOR ALL USING (auth.uid()::text = therapist_id);

-- Assignments: Clients can view assignments assigned to them
CREATE POLICY "assignments_client_access" ON "assignments"
    FOR SELECT USING (auth.uid()::text = user_id);

-- Assignments: Clients can update completion status
CREATE POLICY "assignments_client_update" ON "assignments"
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Assignment items: Access through parent assignment
CREATE POLICY "assignment_items_therapist_access" ON "assignment_items"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_items.assignment_id 
            AND assignments.therapist_id = auth.uid()::text
        )
    );

CREATE POLICY "assignment_items_client_access" ON "assignment_items"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_items.assignment_id 
            AND assignments.user_id = auth.uid()::text
        )
    );

CREATE POLICY "assignment_items_client_update" ON "assignment_items"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_items.assignment_id 
            AND assignments.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_items.assignment_id 
            AND assignments.user_id = auth.uid()::text
        )
    );

-- Assignment results: Therapists can view results for their assignments
CREATE POLICY "assignment_results_therapist_access" ON "assignment_results"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_results.assignment_id 
            AND assignments.therapist_id = auth.uid()::text
        )
    );

-- Assignment results: Clients can create and view their own results
CREATE POLICY "assignment_results_client_access" ON "assignment_results"
    FOR ALL USING (auth.uid()::text = user_id);

-- ============================================================================
-- CONTENT LIBRARY POLICIES
-- ============================================================================

-- Content library: Therapists can manage their own content
CREATE POLICY "content_library_creator_access" ON "content_library"
    FOR ALL USING (auth.uid()::text = created_by);

-- Content library: All therapists can view public content
CREATE POLICY "content_library_public_read" ON "content_library"
    FOR SELECT USING (
        is_public = true AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'therapist'
        )
    );

-- ============================================================================
-- SHARED CONTENT POLICIES
-- ============================================================================

-- Shared phrase collections: Creator can manage
CREATE POLICY "shared_phrase_collections_creator_access" ON "shared_phrase_collections"
    FOR ALL USING (auth.uid()::text = user_id);

-- Shared phrase collections: All authenticated users can view shared collections
CREATE POLICY "shared_phrase_collections_public_read" ON "shared_phrase_collections"
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Practice group phrases: Access through parent practice group
CREATE POLICY "practice_group_phrases_access" ON "practice_group_phrases"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM practice_groups 
            WHERE practice_groups.id = practice_group_phrases.group_id 
            AND practice_groups.user_id = auth.uid()::text
        )
    );

-- ============================================================================
-- SYSTEM/REFERENCE DATA POLICIES
-- ============================================================================

-- Reading content: All authenticated users can read
CREATE POLICY "reading_content_public_read" ON "reading_content"
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Reading content: Only admins can modify
CREATE POLICY "reading_content_admin_write" ON "reading_content"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "reading_content_admin_update" ON "reading_content"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "reading_content_admin_delete" ON "reading_content"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Game levels: All authenticated users can read
CREATE POLICY "game_levels_public_read" ON "game_levels"
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Game levels: Only admins can modify
CREATE POLICY "game_levels_admin_write" ON "game_levels"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "game_levels_admin_update" ON "game_levels"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "game_levels_admin_delete" ON "game_levels"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Exercises: All authenticated users can read
CREATE POLICY "exercises_public_read" ON "exercises"
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Exercises: Only admins can modify
CREATE POLICY "exercises_admin_write" ON "exercises"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "exercises_admin_update" ON "exercises"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "exercises_admin_delete" ON "exercises"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- SPECIAL ACCESS POLICIES FOR THERAPISTS
-- ============================================================================

-- Therapists can view client data for their assigned clients
CREATE POLICY "user_activity_therapist_access" ON "user_activity"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM therapist_clients 
            WHERE therapist_clients.client_id = user_activity.user_id 
            AND therapist_clients.therapist_id = auth.uid()::text
            AND therapist_clients.is_active = true
        )
    );

CREATE POLICY "user_stats_therapist_access" ON "user_stats"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM therapist_clients 
            WHERE therapist_clients.client_id = user_stats.user_id 
            AND therapist_clients.therapist_id = auth.uid()::text
            AND therapist_clients.is_active = true
        )
    );

CREATE POLICY "reading_session_therapist_access" ON "reading_session"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM therapist_clients 
            WHERE therapist_clients.client_id = reading_session.user_id 
            AND therapist_clients.therapist_id = auth.uid()::text
            AND therapist_clients.is_active = true
        )
    );

-- ============================================================================
-- ADMIN POLICIES: Admins have full access to user management
-- ============================================================================

-- Admins can view all user data
CREATE POLICY "users_admin_access" ON "users"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid()::text 
            AND admin_user.role = 'admin'
        )
    );

-- Admins can update user roles and system fields
CREATE POLICY "users_admin_update" ON "users"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid()::text 
            AND admin_user.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid()::text 
            AND admin_user.role = 'admin'
        )
    );

-- ============================================================================
-- COMMENTS AND NOTES
-- ============================================================================

-- This migration enables comprehensive Row Level Security across all tables
-- Key principles:
-- 1. Users own their personal data
-- 2. Therapists can access their clients' data through therapist_clients relationship
-- 3. Shared content has appropriate public/private access controls
-- 4. System reference data is readable by all authenticated users
-- 5. Admins have elevated privileges for system management
-- 6. Assignment system allows proper therapist-client workflow

-- Security considerations:
-- - All policies use auth.uid() to ensure Supabase authentication
-- - Complex joins ensure proper relationship validation
-- - WITH CHECK clauses prevent privilege escalation on updates
-- - Role-based access uses the users.role field consistently