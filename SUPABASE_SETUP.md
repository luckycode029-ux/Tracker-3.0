# 🔄 Cross-Device Sync Setup Guide

This guide will help you set up progress synchronization across devices using Supabase.

## ✅ Step 1: Create Supabase Tables

1. Go to [app.supabase.com](https://app.supabase.com) → Your Project
2. Click **SQL Editor** → **New Query**
3. Copy and paste the SQL below (**DO NOT copy the word "sql" on the first line, only the actual code**):

```sql
-- Table for user progress (which videos they completed)
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id text NOT NULL,
  playlist_id text NOT NULL,
  completed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id, playlist_id)
);

-- Table for user playlists (cross-device sync)
CREATE TABLE IF NOT EXISTS user_playlists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  playlist_id text NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail text,
  video_count integer DEFAULT 0,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, playlist_id)
);

-- Table for video notes (AI-generated summaries - user-specific)
CREATE TABLE IF NOT EXISTS video_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id text NOT NULL,
  playlist_id text NOT NULL,
  topic text NOT NULL,
  source text,
  key_takeaways text[],
  concepts jsonb,
  must_remember text[],
  formula_or_logic jsonb,
  summary text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id, playlist_id)
);

-- Table for cached playlists and videos (shared across all users, no RLS)
CREATE TABLE IF NOT EXISTS cached_playlists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  thumbnail text,
  channel_title text,
  video_count integer DEFAULT 0,
  videos jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for cached video notes (shared across all users, no RLS)
-- Users can regenerate notes, which replaces the cached version
CREATE TABLE IF NOT EXISTS cached_video_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id text NOT NULL,
  playlist_id text NOT NULL,
  topic text NOT NULL,
  source text,
  key_takeaways text[],
  concepts jsonb,
  must_remember text[],
  formula_or_logic jsonb,
  summary text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(video_id, playlist_id)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_notes ENABLE ROW LEVEL SECURITY;
-- No RLS for cached tables (they are public/shared)

-- USER_PROGRESS POLICIES
-- Users can only see their own progress
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
ON user_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
ON user_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- USER_PLAYLISTS POLICIES
-- Users can only see their own playlists
CREATE POLICY "Users can view own playlists"
ON user_playlists FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own playlists
CREATE POLICY "Users can insert own playlists"
ON user_playlists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own playlists
CREATE POLICY "Users can update own playlists"
ON user_playlists FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete own playlists"
ON user_playlists FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- VIDEO_NOTES POLICIES (user-specific notes)
-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
ON video_notes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
ON video_notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
ON video_notes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
ON video_notes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- CACHED_PLAYLISTS POLICIES (No RLS - everyone can read, only app can write)
-- Allow anyone to read cached playlists
CREATE POLICY "Anyone can view cached playlists"
ON cached_playlists FOR SELECT
USING (true);

-- CACHED_VIDEO_NOTES POLICIES (No RLS - everyone can read, only app can write)
-- Allow anyone to read cached notes
CREATE POLICY "Anyone can view cached notes"
ON cached_video_notes FOR SELECT
USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_playlist ON user_progress(user_id, playlist_id);
CREATE INDEX idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX idx_user_playlists_playlist_id ON user_playlists(user_id, playlist_id);
CREATE INDEX idx_video_notes_user_id ON video_notes(user_id);
CREATE INDEX idx_video_notes_playlist ON video_notes(user_id, playlist_id);
CREATE INDEX idx_video_notes_video ON video_notes(user_id, video_id);
CREATE INDEX idx_cached_playlists_id ON cached_playlists(playlist_id);
CREATE INDEX idx_cached_notes_video ON cached_video_notes(video_id, playlist_id);
```

**⚠️ IMPORTANT:** When copying from the code block above:
- Start from the first `--` (comment)
- End with the last `INDEX` line
- Do NOT copy the word "sql" before the code
- Do NOT copy the backticks

4. Paste into Supabase SQL Editor
5. Click **Run** ✅

## ✅ Step 2: Enable Realtime (Optional - for live updates)

1. In Supabase Dashboard, go to **Realtime**
2. Find the `user_progress` table
3. Click **Enable Realtime**
4. Select `INSERT`, `UPDATE`, `DELETE` events

## ✅ Step 3: Test Locally

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12)

3. **Sign up with Google** and create an account

4. **Add a playlist** and mark some videos as complete

5. **Check console logs** for:
   ```
   📊 Fetching progress for user: [id] playlist: [id]
   💾 Saving progress: { userId: ..., videoId: ..., completed: true }
   ✅ Progress saved successfully
   ```

6. **Verify in Supabase:**
   - Go to **Table Editor** → **user_progress**
   - You should see rows with your progress data

## 🔄 Step 4: Test Cross-Device Sync

### Test on Same Device (Different Browser/Incognito):

1. Open **Chrome** and sign in with Google
2. Add a playlist and mark videos as complete
3. Open **Firefox** (or Edge) and sign in with **same Google account**
4. Navigate to the same playlist
5. You should see the same videos marked as complete! ✅

### Test on Different Device:

1. On **Device 1** (Laptop): Sign in and mark 5 videos as complete
2. On **Device 2** (Phone): Sign in with same account
3. Open the same playlist on Device 2
4. You should see the 5 videos already marked as complete
5. Mark 3 more videos as complete on Device 2
6. Go back to Device 1 and refresh
7. You should see all 8 videos marked! ✅

## 🐛 Debugging

### Check if data is saving:

1. **Browser Console:** Look for these logs:
   ```
   📊 Fetching progress for user:...
   💾 Saving progress:...
   ✅ Progress saved successfully
   ```

2. **Supabase Dashboard:**
   - Go to **Table Editor** → **user_progress**
   - You should see rows appearing as you mark videos

### Common Issues:

#### Issue: "Users can only access own rows" error

**Fix:** RLS policies might not be set correctly. Run this SQL in your Supabase SQL editor:

```sql
-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;

-- Recreate all policies
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON user_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON user_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

#### Issue: Data saves but doesn't appear on other device

**Cause:** Browser might be caching old data.

**Fix:**
- Hard refresh: Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Or clear browser cache and reload

#### Issue: Progress not showing up

**Check:**
1. Are you signed in with the same account on both devices? ✅
2. Is the user_id the same in Supabase on both devices?
3. Are you viewing the same playlist ID?
4. Check browser console for errors

## 📊 Verify Data in Supabase

1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Click **user_progress**
4. You should see data like this:

| id | user_id | video_id | playlist_id | completed | updated_at |
|----|---------|----------|-------------|-----------|------------|
| uuid | your-uuid | abc123 | PLxxxxx | true | 2024-01-28 |
| uuid | your-uuid | def456 | PLxxxxx | true | 2024-01-28 |

If the table is empty, progress isn't being saved to Supabase.

## ✅ All Set!

Your progress is now synced across all devices! 🎉

- ✅ Mark video as complete on Phone
- ✅ See it marked on Laptop
- ✅ Add new playlist on Tablet
- ✅ See it everywhere

**Need help?** Check the browser console (F12) for detailed logs!
