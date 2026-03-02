import { supabase } from './supabaseClient';

interface ApiKeyData {
  id: string;
  usage: number;
  limit: number;
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
  try {
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, usage, limit')
      .eq('value', apiKey)
      .maybeSingle();

    if (apiKeyError) {
      throw apiKeyError;
    }

    return apiKeyData;
  } catch (error) {
    console.error('Error validating API key:', error);
    throw error;
  }
}

export async function incrementApiKeyUsage(
  apiKeyData: ApiKeyData,
  isRetry = false
): Promise<{ success: boolean; message: string }> {
  try {
    if (apiKeyData.usage >= apiKeyData.limit) {
      return { success: false, message: 'Rate limit exceeded' };
    }

    // Optimistic locking: only update if usage hasn't changed (prevents race condition)
    const { data: updated, error: updateError } = await supabase
      .from('api_keys')
      .update({ usage: apiKeyData.usage + 1 })
      .eq('id', apiKeyData.id)
      .eq('usage', apiKeyData.usage)
      .select('id');

    if (updateError) {
      throw updateError;
    }

    if (!updated || updated.length === 0) {
      if (isRetry) {
        return { success: false, message: 'Rate limit exceeded' };
      }
      // Optimistic lock failed: another request updated first. Re-check limit and retry once.
      const { data: fresh } = await supabase
        .from('api_keys')
        .select('usage, limit')
        .eq('id', apiKeyData.id)
        .single();
      if (fresh && fresh.usage >= fresh.limit) {
        return { success: false, message: 'Rate limit exceeded' };
      }
      return incrementApiKeyUsage(
        { id: apiKeyData.id, usage: fresh?.usage ?? apiKeyData.usage, limit: fresh?.limit ?? apiKeyData.limit },
        true
      );
    }

    return { success: true, message: 'Usage incremented successfully' };
  } catch (error) {
    console.error('Error incrementing API key usage:', error);
    throw error;
  }
}