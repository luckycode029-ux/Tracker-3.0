import { supabase } from './supabaseClient';

/**
 * Get user's progress for a specific playlist
 * Returns a map of videoId → completed status
 */
export async function getUserProgress(
  userId: string,
  playlistId: string
): Promise<Record<string, boolean>> {
  try {
    console.log('📊 Fetching progress for user:', userId, 'playlist:', playlistId);

    const { data, error } = await supabase
      .from('user_progress')
      .select('video_id, completed')
      .eq('user_id', userId)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('Error fetching user progress:', error);
      return {};
    }

    // Convert array to object: { videoId: true/false }
    const progressMap: Record<string, boolean> = {};
    data?.forEach(item => {
      progressMap[item.video_id] = item.completed;
    });

    console.log('✅ Loaded progress:', Object.keys(progressMap).length, 'videos');
    return progressMap;

  } catch (error) {
    console.error('Exception fetching user progress:', error);
    return {};
  }
}

/**
 * Toggle video completion status (mark as watched/unwatched)
 */
export async function toggleVideoProgress(
  userId: string,
  videoId: string,
  playlistId: string,
  completed: boolean
): Promise<boolean> {
  try {
    console.log('💾 Saving progress:', { userId, videoId, completed });

    const { error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          video_id: videoId,
          playlist_id: playlistId,
          completed: completed,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,video_id,playlist_id'
        }
      );

    if (error) {
      console.error('Error saving progress:', error);
      return false;
    }

    console.log('✅ Progress saved successfully');
    return true;

  } catch (error) {
    console.error('Exception saving progress:', error);
    return false;
  }
}

/**
 * Get user's overall statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalVideos: number;
  completedVideos: number;
  playlists: number;
}> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('playlist_id, completed')
      .eq('user_id', userId);

    if (error || !data) {
      return { totalVideos: 0, completedVideos: 0, playlists: 0 };
    }

    const uniquePlaylists = new Set(data.map(item => item.playlist_id));
    const completedCount = data.filter(item => item.completed).length;

    return {
      totalVideos: data.length,
      completedVideos: completedCount,
      playlists: uniquePlaylists.size
    };

  } catch (error) {
    console.error('Error getting user stats:', error);
    return { totalVideos: 0, completedVideos: 0, playlists: 0 };
  }
}

/**
 * Sync local progress to Supabase (migration helper)
 */
export async function syncLocalProgressToSupabase(
  userId: string,
  localProgress: Array<{ videoId: string; playlistId: string; completed: boolean }>
): Promise<void> {
  try {
    console.log('🔄 Syncing local progress to Supabase...');

    const progressToSync = localProgress.map(item => ({
      user_id: userId,
      video_id: item.videoId,
      playlist_id: item.playlistId,
      completed: item.completed,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('user_progress')
      .upsert(progressToSync, {
        onConflict: 'user_id,video_id,playlist_id'
      });

    if (error) {
      console.error('Error syncing progress:', error);
      return;
    }

    console.log('✅ Synced', progressToSync.length, 'progress items');

  } catch (error) {
    console.error('Exception syncing progress:', error);
  }
}
