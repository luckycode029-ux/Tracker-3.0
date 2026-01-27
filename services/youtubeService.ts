
import { Video, Playlist } from '../types';

/**
 * YouTube API Service
 * Proxies requests through Netlify serverless functions for security
 */

/**
 * Extracts a Playlist ID from various YouTube URL formats.
 */
export const extractPlaylistId = (input: string): string | null => {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/[&?]list=([^&]+)/i);
  if (urlMatch) return urlMatch[1];
  const pathMatch = trimmed.match(/\/playlist\/([^/?#&]+)/i);
  if (pathMatch) return pathMatch[1];
  if (trimmed.length >= 12 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

/**
 * Fetches all videos in a playlist via serverless function
 * API key is stored securely on Netlify, not exposed on frontend
 */
export const fetchPlaylistDetails = async (playlistId: string): Promise<{ playlist: Playlist; videos: Video[] }> => {
  try {
    const response = await fetch('/.netlify/functions/youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playlistId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch playlist details');
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch playlist. Check your connection and API configuration.');
  }
};
