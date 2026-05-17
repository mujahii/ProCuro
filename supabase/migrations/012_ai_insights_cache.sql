-- Daily-per-user cache for AI insight summaries (Gemini quota guard).
-- Auto-loads of the analytics panel read from this table; only an explicit
-- refresh from the UI bypasses the cache. One row per user — the latest
-- summary overwrites the previous one.

CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  user_id      UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  scope        TEXT NOT NULL DEFAULT 'analytics',
  summary      TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_insights_cache_generated_at_idx
  ON public.ai_insights_cache (generated_at DESC);

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own cached insight. Writes only happen through the
-- service-role key from the AI edge function / dev API, so no INSERT /
-- UPDATE / DELETE policy is needed.
DROP POLICY IF EXISTS "Users read own AI cache" ON public.ai_insights_cache;
CREATE POLICY "Users read own AI cache"
  ON public.ai_insights_cache
  FOR SELECT
  USING (auth.uid() = user_id);
