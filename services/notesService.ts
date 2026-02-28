import { VideoNotes } from '../types';
import { supabase } from './supabaseClient';
import { getCachedVideoNotes, cacheVideoNotes } from './cacheService';

/**
 * Generate student-centric study notes for a YouTube video using Groq API.
 * First checks cache, then generates from API if not cached.
 * Proxies through Netlify serverless function for secure API key handling.
 * 
 * @param videoId - YouTube video ID
 * @param videoTitle - Video title
 * @param channelTitle - Channel title
 * @param playlistId - Playlist ID (for cache lookup)
 * @param forceRegenerate - Skip cache and regenerate notes
 */
export async function generateVideoNotes(
  videoId: string,
  videoTitle: string,
  channelTitle: string,
  playlistId?: string,
  forceRegenerate: boolean = false
): Promise<Omit<VideoNotes, 'videoId' | 'playlistId' | 'createdAt'>> {
  console.log('🎬 Generating notes for:', videoTitle);

  // Check cache first unless force regenerate
  if (!forceRegenerate && playlistId) {
    const cached = await getCachedVideoNotes(videoId, playlistId);
    if (cached) {
      console.log('📦 Using cached notes data');
      return cached;
    }
  }

  console.log('🤖 Calling Groq API to generate notes...');

  try {
    // Try Vercel API route first, fallback to Netlify function
    // In production (Vercel), use /api/groq
    // For local dev with Netlify, use /.netlify/functions/groq
    // Use /api/groq for Vercel (both local and production)
    const apiUrl = '/api/groq';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId,
        videoTitle,
        channelTitle,
        mode: 'notes'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate notes');
    }

    console.log('✅ Successfully generated and parsed notes');

    // Cache the generated notes
    if (playlistId) {
      console.log('💾 Caching notes for future use...');
      await cacheVideoNotes(videoId, playlistId, data);
    }

    return data;
  } catch (err: any) {
    console.error('❌ Notes Generation Error:', err);
    throw new Error(
      err.message || 'Failed to generate notes. Check console for details.'
    );
  }
}


export async function saveNotesToSupabase(
  userId: string,
  notes: VideoNotes
): Promise<boolean> {
  try {
    console.log('💾 Saving notes to Supabase for video:', notes.videoId);

    const { error } = await supabase
      .from('video_notes')
      .upsert(
        {
          user_id: userId,
          video_id: notes.videoId,
          playlist_id: notes.playlistId,
          topic: notes.topic,
          source: notes.source,
          key_takeaways: notes.keyTakeaways,
          concepts: notes.concepts,
          must_remember: notes.mustRemember,
          formula_or_logic: notes.formulaOrLogic,
          summary: notes.summary,
          created_at: new Date(notes.createdAt).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,video_id,playlist_id'
        }
      );

    if (error) {
      console.error('❌ Error saving notes:', error);
      return false;
    }

    console.log('✅ Notes saved to Supabase successfully');
    return true;
  } catch (error) {
    console.error('Exception saving notes:', error);
    return false;
  }
}

/**
 * Get user's notes for a specific playlist from Supabase
 */
export async function getNotesForPlaylist(
  userId: string,
  playlistId: string
): Promise<Record<string, VideoNotes>> {
  try {
    console.log('📊 Fetching notes from Supabase for playlist:', playlistId);

    const { data, error } = await supabase
      .from('video_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('❌ Error fetching notes:', error);
      return {};
    }

    if (!data) return {};

    console.log('✅ Loaded', data.length, 'notes from Supabase');

    // Map database records to VideoNotes interface
    const notesMap: Record<string, VideoNotes> = {};
    data.forEach(row => {
      notesMap[row.video_id] = {
        videoId: row.video_id,
        playlistId: row.playlist_id,
        topic: row.topic,
        source: row.source,
        keyTakeaways: row.key_takeaways || [],
        concepts: row.concepts || [],
        mustRemember: row.must_remember || [],
        formulaOrLogic: row.formula_or_logic,
        summary: row.summary,
        createdAt: new Date(row.created_at).getTime()
      };
    });

    return notesMap;
  } catch (error) {
    console.error('Exception fetching notes:', error);
    return {};
  }
}

/**
 * Delete notes from Supabase
 */
export async function deleteNotesFromSupabase(
  userId: string,
  videoId: string,
  playlistId: string
): Promise<boolean> {
  try {
    console.log('🗑️ Deleting notes from Supabase for video:', videoId);

    const { error } = await supabase
      .from('video_notes')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('❌ Error deleting notes:', error);
      return false;
    }

    console.log('✅ Notes deleted successfully');
    return true;
  } catch (error) {
    console.error('Exception deleting notes:', error);
    return false;
  }
}

/**
 * Connectivity test for system diagnostics
 */
export async function testAPIKeys(): Promise<{ groq: boolean }> {
  try {
    const response = await fetch('/.netlify/functions/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: 'test',
        videoTitle: 'Connectivity Test',
        channelTitle: 'Test',
      }),
    });

    return { groq: response.ok };
  } catch (e) {
    console.error('API Connectivity Test Failed:', e);
    return { groq: false };
  }
}
