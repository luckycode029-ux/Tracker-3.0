import { VideoNotes } from '../types';

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
