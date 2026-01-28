import { supabase } from './supabaseClient';
import { Playlist } from '../types';

/**
 * Save a playlist to Supabase for cross-device sync
 */
export async function savePlaylistToSupabase(
  userId: string,
  playlist: Playlist
): Promise<boolean> {
  try {
    console.log('💾 Saving playlist to Supabase:', playlist.id, playlist.title);

    const { error } = await supabase
      .from('user_playlists')
      .upsert(
        {
          user_id: userId,
          playlist_id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          thumbnail: playlist.thumbnail,
          video_count: playlist.videoCount,
          last_accessed: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,playlist_id'
        }
      );

    if (error) {
      console.error('❌ Error saving playlist:', error);
      return false;
    }

    console.log('✅ Playlist saved successfully');
    return true;
  } catch (error) {
    console.error('Exception saving playlist:', error);
    return false;
  }
}

/**
 * Get all user's playlists from Supabase
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  try {
    console.log('📊 Fetching playlists from Supabase for user:', userId);

    const { data, error } = await supabase
      .from('user_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed', { ascending: false });

    if (error) {
      console.error('❌ Error fetching playlists:', error);
      return [];
    }

    if (!data) return [];

    console.log('✅ Loaded', data.length, 'playlists from Supabase');

    // Map database columns to Playlist interface
    return data.map(row => ({
      id: row.playlist_id,
      title: row.title,
      description: row.description || '',
      thumbnail: row.thumbnail || '',
      videoCount: row.video_count || 0,
      lastAccessed: new Date(row.last_accessed).getTime()
    }));
  } catch (error) {
    console.error('Exception fetching playlists:', error);
    return [];
  }
}

/**
 * Delete a playlist from Supabase
 */
export async function deletePlaylistFromSupabase(
  userId: string,
  playlistId: string
): Promise<boolean> {
  try {
    console.log('🗑️ Deleting playlist from Supabase:', playlistId);

    const { error } = await supabase
      .from('user_playlists')
      .delete()
      .eq('user_id', userId)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('❌ Error deleting playlist:', error);
      return false;
    }

    console.log('✅ Playlist deleted successfully');
    return true;
  } catch (error) {
    console.error('Exception deleting playlist:', error);
    return false;
  }
}

/**
 * Update playlist's last accessed time
 */
export async function updatePlaylistAccessTime(
  userId: string,
  playlistId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_playlists')
      .update({ last_accessed: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('❌ Error updating playlist access time:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating playlist access time:', error);
    return false;
  }
}
