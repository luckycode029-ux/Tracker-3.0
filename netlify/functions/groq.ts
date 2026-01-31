import { Handler } from '@netlify/functions';
import { YoutubeTranscript } from 'youtube-transcript';

export interface GroqRequest {
  videoId: string;
  videoTitle: string;
  channelTitle: string;
}

/**
 * Netlify serverless function to proxy Groq API requests
 * Generates study notes based on video metadata securely
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
    const { videoId, videoTitle, channelTitle } = JSON.parse(event.body || '{}');

    if (!videoTitle || !channelTitle) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: videoTitle, channelTitle',
        }),
      };
    }

    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      console.error('GROQ_API_KEY not configured in Netlify environment');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Groq API Key is not configured on the server.',
        }),
      };
    }

    console.log('🎬 Generating notes for:', videoTitle);

    // Fetch transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map(item => item.text).join(' ');
      console.log('📝 Transcript fetched, length:', transcriptText.length);
    } catch (error) {
      console.warn('⚠️ Could not fetch transcript, proceeding without it:', error);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `Convert this YouTube video transcript into detailed study notes.

VIDEO TITLE: ${videoTitle}
INSTRUCTOR/CHANNEL: ${channelTitle}

${transcriptText ? `TRANSCRIPT:\n${transcriptText}` : 'No transcript available. Generate notes based on the title and channel.'}

Include in JSON format:
{
  "topic": "string",
  "source": "string",
  "keyTakeaways": ["string1", "string2", ...],
  "concepts": [{"term": "string", "meaning": "string"}, ...],
  "mustRemember": ["string1", "string2", ...],
  "formulaOrLogic": {"formula": "string", "structure": "string", "condition": "string", "whenToUse": "string"},
  "summary": "string"
}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    console.log('✅ Successfully generated and parsed notes');

    return {
      statusCode: 200,
      body: JSON.stringify({
        topic: parsed.topic || videoTitle,
        source: parsed.source || channelTitle,
        keyTakeaways: Array.isArray(parsed.keyTakeaways)
          ? parsed.keyTakeaways.slice(0, 10)
          : [],
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        mustRemember: Array.isArray(parsed.mustRemember)
          ? parsed.mustRemember
          : [],
        formulaOrLogic: parsed.formulaOrLogic,
        summary: parsed.summary || '',
      }),
    };
  } catch (error: any) {
    console.error('❌ Groq Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to generate notes. Check server logs.',
      }),
    };
  }
};

export { handler };
