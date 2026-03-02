import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching API key:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // If the 'data' object is null or undefined, this means that no API key
    // with the specified ID was found for the current user. 
    // In that case, respond with a 404 Not Found error.
    if (!data)
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update({ name })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select();

  if (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

    if (data.length === 0) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ message: 'API Key deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}