import { supabase } from './supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: fullName || email.split('@')[0],
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email || '',
    user_metadata: data.user.user_metadata,
  };
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (
  callback: (user: AuthUser | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        user_metadata: session.user.user_metadata,
      });
    } else {
      callback(null);
    }
  });

  return data.subscription;
};
