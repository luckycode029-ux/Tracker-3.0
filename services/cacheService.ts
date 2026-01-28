import { supabase } from './supabaseClient';
import { Playlist, Video } from '../types';

/**
 * Check if playlist is cached, return cached data if available
 */
export async function getCachedPlaylist(
  playlistId: string
): Promise<{ playlist: Playlist; videos: Video[] } | null> {
  try {
    console.log('🔍 Checking cache for playlist:', playlistId);

    const { data, error } = await supabase
      .from('cached_playlists')
      .select('*')
      .eq('playlist_id', playlistId)
      .single();

    if (error || !data) {
      console.log('❌ Playlist not in cache');
      return null;
    }

    console.log('✅ Found playlist in cache!');

    const playlist: Playlist = {
      id: data.playlist_id,
      title: data.title,
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      videoCount: data.video_count,
      lastAccessed: new Date(data.updated_at).getTime()
    };

    const videos: Video[] = data.videos || [];

    return { playlist, videos };
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

/**
 * Save playlist to cache
 */
export async function cachePlaylist(
  playlist: Playlist,
  videos: Video[]
): Promise<boolean> {
  try {
    console.log('💾 Saving playlist to cache:', playlist.id);

    const { error } = await supabase
      .from('cached_playlists')
      .upsert(
        {
          playlist_id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          thumbnail: playlist.thumbnail,
          video_count: playlist.videoCount,
          videos: videos,
          cached_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'playlist_id'
        }
      );

    if (error) {
      console.error('❌ Error caching playlist:', error);
      return false;
    }

    console.log('✅ Playlist cached successfully');
    return true;
  } catch (error) {
    console.error('Exception caching playlist:', error);
    return false;
  }
}

/**
 * Check if video notes are cached
 */
export async function getCachedVideoNotes(
  videoId: string,
  playlistId: string
): Promise<any | null> {
  try {
    console.log('🔍 Checking cache for notes:', videoId);

    const { data, error } = await supabase
      .from('cached_video_notes')
      .select('*')
      .eq('video_id', videoId)
      .eq('playlist_id', playlistId)
      .single();

    if (error || !data) {
      console.log('❌ Notes not in cache');
      return null;
    }

    console.log('✅ Found notes in cache!');

    return {
      topic: data.topic,
      source: data.source,
      keyTakeaways: data.key_takeaways || [],
      concepts: data.concepts || [],
      mustRemember: data.must_remember || [],
      formulaOrLogic: data.formula_or_logic,
      summary: data.summary
    };
  } catch (error) {
    console.error('Error checking notes cache:', error);
    return null;
  }
}

/**
 * Save notes to cache (replaces previous version if regenerated)
 */
export async function cacheVideoNotes(
  videoId: string,
  playlistId: string,
  notes: any
): Promise<boolean> {
  try {
    console.log('💾 Saving notes to cache:', videoId);

    const { error } = await supabase
      .from('cached_video_notes')
      .upsert(
        {
          video_id: videoId,
          playlist_id: playlistId,
          topic: notes.topic,
          source: notes.source,
          key_takeaways: notes.keyTakeaways,
          concepts: notes.concepts,
          must_remember: notes.mustRemember,
          formula_or_logic: notes.formulaOrLogic,
          summary: notes.summary,
          cached_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'video_id,playlist_id'
        }
      );

    if (error) {
      console.error('❌ Error caching notes:', error);
      return false;
    }

    console.log('✅ Notes cached successfully');
    return true;
  } catch (error) {
    console.error('Exception caching notes:', error);
    return false;
  }
}

/**
 * Get cache creation date (returns null if not cached)
 */
export async function getCacheInfo(playlistId: string): Promise<Date | null> {
  try {
    const { data } = await supabase
      .from('cached_playlists')
      .select('cached_at')
      .eq('playlist_id', playlistId)
      .single();

    if (data) {
      return new Date(data.cached_at);
    }
    return null;
  } catch (error) {
    return null;
  }
}
