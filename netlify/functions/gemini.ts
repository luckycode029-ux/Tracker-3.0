import { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';

export interface GeminiRequest {
  videoId: string;
  videoTitle: string;
  channelTitle: string;
}

/**
 * Netlify serverless function to proxy Gemini API requests
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

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      console.error('GEMINI_API_KEY not configured in Netlify environment');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Gemini API Key is not configured on the server.',
        }),
      };
    }

    console.log('🎬 Generating notes for:', videoTitle);

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate student revision notes for this YouTube video.

VIDEO TITLE: ${videoTitle}
INSTRUCTOR/CHANNEL: ${channelTitle}

You are a serious student who just watched this video and are making revision notes.
Write in student-friendly language (not AI/textbook style).
Avoid phrases like "delve into", "leverage", or "it's worth noting".
Keep points concise and focus on logic and memory triggers.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            source: { type: Type.STRING },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '5-10 bullets of main concepts explained',
            },
            concepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
                required: ['term', 'meaning'],
              },
            },
            mustRemember: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Critical rules, exceptions, or shortcuts',
            },
            formulaOrLogic: {
              type: Type.OBJECT,
              properties: {
                formula: { type: Type.STRING },
                structure: { type: Type.STRING },
                condition: { type: Type.STRING },
                whenToUse: { type: Type.STRING },
              },
            },
            summary: {
              type: Type.STRING,
              description: '3-4 line concise summary',
            },
          },
          required: [
            'topic',
            'source',
            'keyTakeaways',
            'concepts',
            'mustRemember',
            'summary',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

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
    console.error('❌ Gemini Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to generate notes. Check server logs.',
      }),
    };
  }
};

export { handler };
