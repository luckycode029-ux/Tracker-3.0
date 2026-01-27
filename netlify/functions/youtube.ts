import { Handler } from '@netlify/functions';

export interface YoutubeRequest {
  playlistId: string;
}

/**
 * Netlify serverless function to proxy YouTube API requests
 * Handles playlist metadata and video items fetching securely
 */
const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const { playlistId } = JSON.parse(event.body || '{}');

    if (!playlistId || typeof playlistId !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid or missing playlistId' }),
      };
    }

    const API_KEY = process.env.YOUTUBE_API_KEY;

    if (!API_KEY) {
      console.error('YOUTUBE_API_KEY not configured in Netlify environment');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'YouTube API Key is not configured on the server.' }),
      };
    }

    const baseUrl = 'https://www.googleapis.com/youtube/v3';

    // 1. Fetch Playlist Metadata
    const playlistInfoRes = await fetch(
      `${baseUrl}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${API_KEY}`
    );

    const playlistData = await playlistInfoRes.json();

    if (!playlistInfoRes.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `YouTube API Error: ${playlistData?.error?.message || 'Unknown Error'}`,
        }),
      };
    }

    if (!playlistData.items || playlistData.items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Playlist not found or is private.' }),
      };
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
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `Failed to load videos: ${itemsData?.error?.message}`,
          }),
        };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ playlist, videos: allVideos }),
    };
  } catch (error) {
    console.error('YouTube Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error. Check server logs for details.',
      }),
    };
  }
};

export { handler };
