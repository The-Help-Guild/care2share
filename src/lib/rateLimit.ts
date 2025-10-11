import { supabase } from '@/integrations/supabase/client';

const RATE_LIMITS = {
  message: { max: 30, windowSeconds: 60 },
  conversation: { max: 10, windowSeconds: 3600 },
  profile_update: { max: 5, windowSeconds: 3600 },
  file_upload: { max: 10, windowSeconds: 3600 },
  auth_attempt: { max: 5, windowSeconds: 300 },
  search: { max: 100, windowSeconds: 60 },
  block_report: { max: 20, windowSeconds: 3600 },
};

export type RateLimitAction = keyof typeof RATE_LIMITS;

export const checkRateLimit = async (
  userId: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; remainingTime?: number }> => {
  const limit = RATE_LIMITS[action];
  const since = new Date(Date.now() - limit.windowSeconds * 1000);
  
  const { count, error } = await supabase
    .from('rate_limit_audit')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', since.toISOString());
  
  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the action but log the error
    return { allowed: true };
  }
  
  if ((count ?? 0) >= limit.max) {
    return { allowed: false, remainingTime: limit.windowSeconds };
  }
  
  // Log this action
  const { error: insertError } = await supabase.from('rate_limit_audit').insert({
    user_id: userId,
    action: action
  });

  if (insertError) {
    console.error('Rate limit audit insert error:', insertError);
  }
  
  return { allowed: true };
};
