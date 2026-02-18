-- Enable UUID extension (usually enabled by Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. Create Profiles Table (Does not touch your existing tables)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  credits integer DEFAULT 50 CHECK (credits >= 0),
  last_daily_bonus timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow system/users to update their own profile (via functions)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

--------------------------------------------------------------------------------
-- 2. Handle New Users (Give 50 credits on signup)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  VALUES (new.id, 50);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run this function every time a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- 3. Backfill Existing Users (Assign 50 credits to current users)
--------------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  SELECT id, 50 
  FROM auth.users 
  WHERE id NOT IN (SELECT id FROM public.profiles);
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if running multiple times
  NULL; 
END $$;

--------------------------------------------------------------------------------
-- 4. Credit Logic (Deduct credits, Daily reset to 30)
--------------------------------------------------------------------------------

-- Function to check and deduct credits safely
CREATE OR REPLACE FUNCTION public.deduct_credits(
  cost integer,
  action_type text DEFAULT 'usage'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits integer;
  last_bonus timestamptz;
  new_credits integer;
  user_id uuid;
  is_new_day boolean;
BEGIN
  user_id := auth.uid();
  
  -- Get current user profile
  SELECT credits, last_daily_bonus INTO current_credits, last_bonus
  FROM public.profiles
  WHERE id = user_id
  FOR UPDATE; -- Lock row to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check if it's a new day (UTC) compared to last bonus/usage
  is_new_day := date(now() AT TIME ZONE 'UTC') > date(last_bonus AT TIME ZONE 'UTC');

  IF is_new_day THEN
    -- DAILY RESET LOGIC: 
    -- Reset to 30 credits if it's a new day. 
    -- (Does not add previous credits; resets to flat 30)
    current_credits := 30;
    
    UPDATE public.profiles
    SET credits = current_credits,
        last_daily_bonus = now()
    WHERE id = user_id;
  END IF;

  -- Check transaction feasibility
  IF current_credits >= cost THEN
    new_credits := current_credits - cost;
    
    UPDATE public.profiles
    SET credits = new_credits,
        updated_at = now()
    WHERE id = user_id;
    
    RETURN json_build_object(
      'success', true,
      'new_credits', new_credits,
      'message', 'Credits deducted successfully'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'new_credits', current_credits,
      'message', 'Insufficient credits'
    );
  END IF;
END;
$$;

-- Function to get current credits (and force daily reset check if needed)
CREATE OR REPLACE FUNCTION public.get_user_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits integer;
  last_bonus timestamptz;
  user_id uuid;
  is_new_day boolean;
BEGIN
  user_id := auth.uid();
  
  SELECT credits, last_daily_bonus INTO current_credits, last_bonus
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    -- If no profile exists, try to create one on the fly (fallback)
    INSERT INTO public.profiles (id, credits) VALUES (user_id, 50)
    ON CONFLICT DO NOTHING;
    RETURN json_build_object('credits', 50);
  END IF;

  -- Check for daily reset
  is_new_day := date(now() AT TIME ZONE 'UTC') > date(last_bonus AT TIME ZONE 'UTC');
  
  IF is_new_day THEN
     -- Perform the reset so user sees 30 immediately
     UPDATE public.profiles
     SET credits = 30,
         last_daily_bonus = now()
     WHERE id = user_id;
     return json_build_object('credits', 30);
  END IF;

  RETURN json_build_object('credits', current_credits);
END;
$$;
