-- Table for user-specific video tests and results
CREATE TABLE IF NOT EXISTS public.video_tests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id text NOT NULL,
  playlist_id text NOT NULL,
  questions jsonb NOT NULL, -- The 10 MCQs
  user_answers jsonb, -- The answers provided by the user
  score integer, -- Final score
  performance_level text, -- e.g., 'Beginner', 'Intermediate', 'Expert'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id, playlist_id)
);

-- Enable Row Level Security
ALTER TABLE public.video_tests ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only interact with their own data
CREATE POLICY "Users can select own tests"
ON public.video_tests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tests"
ON public.video_tests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tests"
ON public.video_tests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_tests_user_id ON public.video_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_video_tests_playlist ON public.video_tests(user_id, playlist_id);
CREATE INDEX IF NOT EXISTS idx_video_tests_video ON public.video_tests(user_id, video_id);
