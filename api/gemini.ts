import type { VercelRequest, VercelResponse } from '@vercel/node';
import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const method = request.method;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { videoId, videoTitle, channelTitle } = request.body;

        if (!videoId || !videoTitle) {
            return response.status(400).json({
                error: 'Missing required fields: videoId, videoTitle',
            });
        }

        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return response.status(500).json({
                error: 'Gemini API Key is not configured on the server.',
            });
        }

        // Fetch transcript with fallback to description
        let transcriptText = '';
        let isUsingDescription = false;

        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(item => item.text).join(' ');

            // Limit transcript length to avoid context window issues
            if (transcriptText.length > 30000) {
                transcriptText = transcriptText.substring(0, 30000) + '...';
            }
        } catch (error) {
            console.warn('Could not fetch transcript, attempting fallback to description:', error);

            // Fallback: Fetch video description from YouTube API
            const YT_API_KEY = process.env.YOUTUBE_API_KEY;
            if (YT_API_KEY) {
                try {
                    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`);
                    const ytData = await ytRes.json();
                    const description = ytData.items?.[0]?.snippet?.description;
                    if (description && description.length > 100) {
                        transcriptText = `[NOTE: Transcript unavailable. Using video description as source]\n\nDESCRIPTION:\n${description}`;
                        isUsingDescription = true;
                    }
                } catch (ytErr) {
                    console.error('YouTube API fallback failed:', ytErr);
                }
            }
        }

        const promptSource = transcriptText
            ? (isUsingDescription ? 'video description' : 'YouTube lecture transcript')
            : 'video title and channel (no transcript available)';

        const prompt = `You are an expert academic evaluator.
Using the following ${promptSource} for a video titled "${videoTitle}" ${channelTitle ? `by "${channelTitle}"` : ''}, generate exactly 10 multiple choice questions (MCQs) that test conceptual understanding.

Rules:
- Difficulty: Medium
- Avoid trivial fact recall (like dates, names unless conceptually important)
- Questions must test whether the student understood key ideas, logic, relationships, and reasoning
- Each question must have exactly 4 options
- Only 1 correct answer per question
- No ambiguous wording
- Do not repeat similar question types
- Mix conceptual and application-based questions

Return output strictly in this JSON format:
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

${transcriptText ? `Source Content:\n${transcriptText}` : `No transcript or description available. Please generate relevant academic questions based ONLY on the title: "${videoTitle}" ${channelTitle ? `and channel: "${channelTitle}"` : ''}. If the topic is clear, create foundational questions about it.`}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                }
            }),
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const data = await geminiResponse.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('Empty response from Gemini');
        }

        const parsed = JSON.parse(content);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error('Invalid response format from Gemini');
        }

        // Validate each question
        const validatedQuestions = parsed.questions.map((q: any) => ({
            question: typeof q.question === 'string' ? q.question : 'Unknown Question',
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
            correctAnswer: typeof q.correct_index === 'number' ? q.correct_index : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0),
            explanation: typeof q.explanation === 'string' ? q.explanation : ''
        })).slice(0, 10);

        return response.status(200).json({ questions: validatedQuestions });
    } catch (error: any) {
        console.error('❌ Gemini Function Error:', error);
        return response.status(500).json({
            error: error.message || 'Failed to generate test questions.',
        });
    }
}
