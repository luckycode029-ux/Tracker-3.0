import { supabase } from './supabaseClient';
import { Question, TestResult } from '../types';

export const testService = {
    /**
     * Fetch a test and result for a video.
     */
    async getTest(userId: string, videoId: string, playlistId: string): Promise<{ questions: Question[] | null, result: TestResult | null }> {
        try {
            const { data, error } = await supabase
                .from('video_tests')
                .select('*')
                .eq('user_id', userId)
                .eq('video_id', videoId)
                .eq('playlist_id', playlistId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching test:', error);
                return { questions: null, result: null };
            }

            if (data) {
                const result: TestResult | null = data.score !== null ? {
                    videoId: data.video_id,
                    playlistId: data.playlist_id,
                    score: data.score,
                    totalQuestions: data.questions.length,
                    userAnswers: data.user_answers,
                    createdAt: new Date(data.created_at).getTime(),
                    performanceLevel: data.performance_level
                } : null;

                return {
                    questions: data.questions as Question[],
                    result
                };
            }

            return { questions: null, result: null };
        } catch (err) {
            console.error('Error in getTest:', err);
            return { questions: null, result: null };
        }
    },

    /**
     * Generate a test using Gemini API
     */
    async generateTest(userId: string, videoId: string, videoTitle: string, channelTitle: string, playlistId: string): Promise<Question[]> {
        console.log('🤖 Calling Gemini API to generate test...');

        const response = await fetch('/api/gemini', {
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
            throw new Error(data.error || 'Failed to generate test');
        }

        // Initialize the test record in Supabase
        await this.saveInitialTest(userId, videoId, playlistId, data.questions);

        return data.questions;
    },

    /**
     * Save initial generated test (no score yet)
     */
    async saveInitialTest(userId: string, videoId: string, playlistId: string, questions: Question[]): Promise<void> {
        try {
            await supabase
                .from('video_tests')
                .upsert({
                    user_id: userId,
                    video_id: videoId,
                    playlist_id: playlistId,
                    questions: questions,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,video_id,playlist_id'
                });
        } catch (err) {
            console.error('Error saving initial test:', err);
        }
    },

    /**
     * Save user test result
     */
    async saveTestResult(
        userId: string,
        videoId: string,
        playlistId: string,
        score: number,
        answers: number[],
        performanceLevel: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('video_tests')
                .update({
                    score,
                    user_answers: answers,
                    performance_level: performanceLevel,
                })
                .eq('user_id', userId)
                .eq('video_id', videoId)
                .eq('playlist_id', playlistId);

            if (error) {
                console.error('Error saving test result:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('Error in saveTestResult:', err);
            return false;
        }
    },

    /**
     * Get user's test results for a playlist
     */
    async getResultsForPlaylist(userId: string, playlistId: string): Promise<Record<string, TestResult>> {
        try {
            const { data, error } = await supabase
                .from('video_tests')
                .select('*')
                .eq('user_id', userId)
                .eq('playlist_id', playlistId)
                .not('score', 'is', null);

            if (error) {
                console.error('Error fetching results:', error);
                return {};
            }

            const resultsMap: Record<string, TestResult> = {};
            data?.forEach(row => {
                resultsMap[row.video_id] = {
                    videoId: row.video_id,
                    playlistId: row.playlist_id,
                    score: row.score,
                    totalQuestions: row.questions.length,
                    userAnswers: row.user_answers,
                    createdAt: new Date(row.created_at).getTime(),
                    performanceLevel: row.performance_level
                };
            });

            return resultsMap;
        } catch (err) {
            console.error('Error in getResultsForPlaylist:', err);
            return {};
        }
    }
};
