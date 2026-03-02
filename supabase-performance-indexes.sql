-- Performance Optimization Indexes
-- Run this in Supabase: SQL Editor → New query → paste → Run
-- These indexes optimize API endpoint queries for better response times

-- Composite index for daily API key limit check
-- Optimizes: SELECT COUNT(*) FROM api_keys WHERE user_id = ? AND created_at >= ?
-- Used in: POST /api/api-keys (daily limit validation)
CREATE INDEX IF NOT EXISTS api_keys_user_id_created_at_idx 
  ON public.api_keys(user_id, created_at);

-- Index for sorting by usage (descending)
-- Optimizes: SELECT ... FROM api_keys WHERE user_id = ? ORDER BY usage DESC LIMIT 3
-- Used in: GET /api/usage-insights (top keys by usage)
CREATE INDEX IF NOT EXISTS api_keys_usage_idx 
  ON public.api_keys(usage DESC);

-- Index for users email lookups
-- Optimizes: SELECT ... FROM users WHERE email = ?
-- Used in: Auth JWT callback and getSessionUser
CREATE INDEX IF NOT EXISTS users_email_idx 
  ON public.users(email);

-- Note: The following indexes already exist in supabase-schema.sql:
-- - api_keys_user_id_idx (for filtering by user_id)
-- - api_keys_value_idx (for API key validation lookups)

-- Performance Impact:
-- 1. Daily limit check: Reduces query time from O(n) to O(log n) with composite index
-- 2. Usage insights sorting: Enables index-only scan instead of full table scan + sort
-- 3. Auth email lookups: Speeds up user role fetching in JWT callbacks
