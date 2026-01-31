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
      // Truncate if too long (approx 20000 chars ~ 5000 tokens, model supports 128K)
      if (transcriptText.length > 20000) {
        transcriptText = transcriptText.substring(0, 20000) + '...';
      }
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
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that generates structured study notes from YouTube video transcripts. Always respond with valid JSON matching this exact schema: {"topic": "string", "source": "string", "keyTakeaways": ["string"], "concepts": [{"term": "string", "meaning": "string"}], "mustRemember": ["string"], "formulaOrLogic": {"formula": "string", "structure": "string", "condition": "string", "whenToUse": "string"}, "summary": "string"}',
          },
          {
            role: 'user',
            content: `Convert this YouTube video transcript into detailed study notes.

VIDEO TITLE: ${videoTitle}
INSTRUCTOR/CHANNEL: ${channelTitle}

${transcriptText ? `TRANSCRIPT:\n${transcriptText}` : 'No transcript available. Generate notes based on the title and channel.'}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
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
