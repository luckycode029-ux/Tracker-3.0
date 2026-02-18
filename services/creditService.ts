
import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const creditService = {
    /**
     * Get the current user's credit balance.
     * This also triggers the daily reset check on the server side if implemented in get_user_credits.
     */
    async getCredits(): Promise<number | null> {
        try {
            const { data, error } = await supabase.rpc('get_user_credits');

            if (error) {
                console.error('Error fetching credits:', error);
                return null;
            }

            return data?.credits ?? 0;
        } catch (err) {
            console.error('Unexpected error fetching credits:', err);
            return null;
        }
    },

    /**
     * Deduct credits for a specific action.
     * @param cost The number of credits to deduct.
     * @param actionType Description of the action (optional).
     * @returns object with success status, new credit balance, and message.
     */
    async deductCredits(cost: number, actionType: string = 'usage'): Promise<{ success: boolean; newCredits?: number; message?: string }> {
        try {
            const { data, error } = await supabase.rpc('deduct_credits', {
                cost,
                action_type: actionType
            });

            if (error) {
                console.error('Error deducting credits:', error);
                return { success: false, message: error.message };
            }

            return {
                success: data.success,
                newCredits: data.new_credits,
                message: data.message
            };
        } catch (err) {
            console.error('Unexpected error deducting credits:', err);
            return { success: false, message: 'Unexpected error occurred' };
        }
    }
};
