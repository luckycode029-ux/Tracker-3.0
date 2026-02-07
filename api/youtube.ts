import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface YoutubeRequest {
  playlistId: string;
}

/**
 * Vercel serverless function to proxy YouTube API requests
 * Handles playlist metadata and video items fetching securely
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const method = request.method;
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow POST requests
  if (method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { playlistId } = request.body;

    if (!playlistId || typeof playlistId !== 'string') {
      return response.status(400).json({ error: 'Invalid or missing playlistId' });
    }

    const API_KEY = process.env.YOUTUBE_API_KEY;

    if (!API_KEY) {
      console.error('YOUTUBE_API_KEY not configured in Vercel environment');
      return response.status(500).json({
        error: 'YouTube API Key is not configured on the server.',
      });
    }

    const baseUrl = 'https://www.googleapis.com/youtube/v3';

    // 1. Fetch Playlist Metadata
    const playlistInfoRes = await fetch(
      `${baseUrl}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${API_KEY}`
    );

    const playlistData = await playlistInfoRes.json();

    if (!playlistInfoRes.ok) {
      return response.status(400).json({
        error: `YouTube API Error: ${playlistData?.error?.message || 'Unknown Error'}`,
      });
    }

    if (!playlistData.items || playlistData.items.length === 0) {
      return response.status(404).json({ error: 'Playlist not found or is private.' });
    }

    const playlistSnippet = playlistData.items[0].snippet;
    const playlistContent = playlistData.items[0].contentDetails;

    const playlist = {
      id: playlistId,
      title: playlistSnippet.title,
      description: playlistSnippet.description,
      thumbnail:
        playlistSnippet.thumbnails?.high?.url ||
        playlistSnippet.thumbnails?.medium?.url ||
        '',
      videoCount: playlistContent.itemCount,
      lastAccessed: Date.now(),
    };

    // 2. Fetch ALL Videos with pagination
    let allVideos: any[] = [];
    let nextPageToken = '';
    let pageCount = 0;
    const MAX_PAGES = 10; // Approx 500 videos max

    do {
      const itemsRes = await fetch(
        `${baseUrl}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${
          nextPageToken ? `&pageToken=${nextPageToken}` : ''
        }`
      );

      const itemsData = await itemsRes.json();

      if (!itemsRes.ok) {
        return response.status(400).json({
          error: `Failed to load videos: ${itemsData?.error?.message}`,
        });
      }

      const pageVideos = (itemsData.items || [])
        .filter(
          (item) =>
            item.snippet.title !== 'Private video' &&
            item.snippet.title !== 'Deleted video'
        )
        .map((item) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            '',
          channelTitle: item.snippet.channelTitle,
          position: item.snippet.position,
        }));

      allVideos = [...allVideos, ...pageVideos];
      nextPageToken = itemsData.nextPageToken || '';
      pageCount++;
    } while (nextPageToken && pageCount < MAX_PAGES);

    return response.status(200).json({ playlist, videos: allVideos });
  } catch (error) {
    console.error('YouTube Function Error:', error);
    return response.status(500).json({
      error: 'Internal server error. Check server logs for details.',
    });
  }
}
