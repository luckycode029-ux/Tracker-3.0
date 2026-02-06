
import { Video, Playlist } from '../types';
import { getCachedPlaylist, cachePlaylist } from './cacheService';

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
 * First checks cache, then fetches from API if not cached
 * API key is stored securely on Netlify, not exposed on frontend
 * 
 * @param playlistId - YouTube playlist ID
 * @param forceRefresh - Skip cache and fetch fresh from API
 */
export const fetchPlaylistDetails = async (
  playlistId: string,
  forceRefresh: boolean = false
): Promise<{ playlist: Playlist; videos: Video[] }> => {
  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = await getCachedPlaylist(playlistId);
      if (cached) {
        console.log('📦 Using cached playlist data');
        return cached;
      }
    }

    console.log('🎬 Fetching playlist from YouTube API...');
    
    // Try Vercel API route first, fallback to Netlify function
    // In production (Vercel), use /api/youtube
    // For local dev with Netlify, use /.netlify/functions/youtube
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? '/.netlify/functions/youtube'  // Local development with Netlify
      : '/api/youtube';  // Production on Vercel or local with Vercel dev
    
    const response = await fetch(apiUrl, {
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

    // Cache the fetched data
    console.log('💾 Caching playlist for future use...');
    await cachePlaylist(data.playlist, data.videos);

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch playlist. Check your connection and API configuration.');
  }
};
