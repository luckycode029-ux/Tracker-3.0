import { VideoNotes } from '../types';
import { supabase } from './supabaseClient';

/**
 * Generate student-centric study notes for a YouTube video using Gemini API.
 * Proxies through Netlify serverless function for secure API key handling.
 */
export async function generateVideoNotes(
  videoId: string,
  videoTitle: string,
  channelTitle: string
): Promise<Omit<VideoNotes, 'videoId' | 'playlistId' | 'createdAt'>> {
  console.log('🎬 Generating notes for:', videoTitle);

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId,
        videoTitle,
        channelTitle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate notes');
    }

    console.log('✅ Successfully generated and parsed notes');

    return data;
  } catch (err: any) {
    console.error('❌ Notes Generation Error:', err);
    throw new Error(
      err.message || 'Failed to generate notes. Check console for details.'
    );
  }
}

/**
 * Save video notes to Supabase for cross-device sync
 */
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
export async function testAPIKeys(): Promise<{ gemini: boolean }> {
  try {
    const response = await fetch('/.netlify/functions/gemini', {
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

    return { gemini: response.ok };
  } catch (e) {
    console.error('API Connectivity Test Failed:', e);
    return { gemini: false };
  }
}
