import { NextResponse } from 'next/server';
import { getSessionUser } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Sign in or ensure dev user is allowed (NODE_ENV=development).' }, { status: 401 });
  }

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
}