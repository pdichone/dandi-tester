import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET() {
  try {
    const user = await requireAuth();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const keysWithRemaining = (data ?? []).map((key) => ({
      ...key,
      remaining: Math.max(0, (key.limit ?? 0) - (key.usage ?? 0)),
    }));

    return NextResponse.json(keysWithRemaining);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    let body: { name?: string; limit?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const name = body?.name ?? 'My API Key';
    const limit = typeof body?.limit === 'number' && body.limit > 0 ? body.limit : 1000;
    const newKeyValue = `dandi-${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString());

      if (countError) {
        console.error('Error counting API keys for daily limit:', countError);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }

      const dailyKeyLimit = 3;
      if (typeof count === 'number' && count >= dailyKeyLimit) {
        return NextResponse.json(
          { error: `Daily API key limit reached (${dailyKeyLimit} per day).`, code: 'API_KEY_DAILY_LIMIT' },
          { status: 429 },
        );
      }

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          { name, value: newKeyValue, usage: 0, limit, user_id: user.id }
        ])
        .select();

      if (error) {
        console.error('Error creating API key:', error);
        const message = error.message || 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
      }

      return NextResponse.json(data[0]);
    } catch (err) {
      const e = err as Error & { cause?: Error };
      console.error('Error creating API key:', e);
      const msg = e?.message || '';
      const isFetchFailed = msg.toLowerCase().includes('fetch failed') || e?.cause?.message?.toLowerCase().includes('fetch');
      const errorMessage = isFetchFailed
        ? 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local (use https://) and that the project is not paused.'
        : msg || 'Internal Server Error';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}