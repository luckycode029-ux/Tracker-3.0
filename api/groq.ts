import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';

export interface GroqRequest {
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  mode?: 'notes' | 'test'; // Add mode parameter
}

/**
 * Vercel serverless function to proxy Groq API requests
 * Generates study notes or test questions based on video metadata securely
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
    const { videoId, videoTitle, channelTitle, mode = 'notes' } = request.body;

    if (!videoId || !videoTitle || !channelTitle) {
      return response.status(400).json({
        error: 'Missing required fields: videoId, videoTitle, channelTitle',
      });
    }

    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      console.error('GROQ_API_KEY not configured in Vercel environment');
      return response.status(500).json({
        error: 'Groq API Key is not configured on the server.',
      });
    }

    console.log(`🤖 Generating ${mode} for:`, videoTitle);

    // Fetch transcript with fallback to description (More robust fetching logic)
    let transcriptText = '';
    let isUsingDescription = false;

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map(item => item.text).join(' ');

      // Truncate if too long (approx 25000 chars)
      if (transcriptText.length > 25000) {
        transcriptText = transcriptText.substring(0, 25000) + '...';
      }
      console.log('📝 Transcript fetched, length:', transcriptText.length);
    } catch (error) {
      console.warn('⚠️ Transcript fetch failed, trying description fallback:', error);
      const YT_API_KEY = process.env.YOUTUBE_API_KEY;
      if (YT_API_KEY) {
        try {
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`);
          const ytData = await ytRes.json();
          const description = ytData.items?.[0]?.snippet?.description;
          if (description && description.length > 100) {
            transcriptText = description;
            isUsingDescription = true;
            console.log('📝 Using video description as source');
          }
        } catch (ytErr) {
          console.error('YouTube API fallback failed:', ytErr);
        }
      }
    }

    const promptSource = transcriptText
      ? (isUsingDescription ? 'video description' : 'YouTube lecture transcript')
      : 'video title and channel (no transcript available)';

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'notes') {
      systemPrompt = 'You are an AI assistant that generates structured study notes from YouTube video transcripts. Always respond with valid JSON matching this exact schema: {"topic": "string", "source": "string", "keyTakeaways": ["string"], "concepts": [{"term": "string", "meaning": "string"}], "mustRemember": ["string"], "formulaOrLogic": {"formula": "string", "structure": "string", "condition": "string", "whenToUse": "string"}, "summary": "string"}';
      userPrompt = `Convert this YouTube video transcript into detailed study notes.\n\nVIDEO TITLE: ${videoTitle}\nINSTRUCTOR/CHANNEL: ${channelTitle}\n\n${transcriptText ? `TRANSCRIPT:\n${transcriptText}` : 'No transcript available. Generate notes based on the title and channel.'}`;
    } else {
      // Test generation mode
      systemPrompt = 'You are an expert academic evaluator. You generate multiple-choice questions (MCQs) that test conceptual understanding based on video content. Respond ONLY with valid JSON.';
      userPrompt = `Using the following ${promptSource} for a video titled "${videoTitle}" by "${channelTitle}", generate exactly 10 multiple choice questions (MCQs) that test conceptual understanding.

Rules:
- Difficulty: Medium
- Avoid trivial fact recall (like dates, names unless conceptually important)
- Questions must test whether the student understood key ideas, logic, relationships, and reasoning
- Each question must have exactly 4 options
- Only 1 correct answer per question (index 0-3)
- No ambiguous wording
- Return output strictly in this JSON format:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "string"
    }
  ]
}

${transcriptText ? `Source Content:\n${transcriptText}` : `No transcript available. Please generate relevant academic questions based ONLY on the title: "${videoTitle}" and channel: "${channelTitle}".`}`;
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent JSON
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText}`);
    }

    const data = await groqResponse.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    if (mode === 'notes') {
      return response.status(200).json({
        topic: parsed.topic || videoTitle,
        source: parsed.source || channelTitle,
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.slice(0, 10) : [],
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        mustRemember: Array.isArray(parsed.mustRemember) ? parsed.mustRemember : [],
        formulaOrLogic: parsed.formulaOrLogic,
        summary: parsed.summary || '',
      });
    } else {
      // Validate and reformat questions for the frontend
      const validatedQuestions = (parsed.questions || []).map((q: any) => ({
        question: typeof q.question === 'string' ? q.question : 'Unknown Question',
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
        correctAnswer: typeof q.correct_index === 'number' ? q.correct_index : 0,
        explanation: typeof q.explanation === 'string' ? q.explanation : ''
      })).slice(0, 10);

      return response.status(200).json({ questions: validatedQuestions });
    }
  } catch (error: any) {
    console.error(`❌ Groq Function Error (${request.body?.mode || 'notes'}):`, error);
    return response.status(500).json({
      error: error.message || 'Failed to process request. Check server logs.',
    });
  }
}

