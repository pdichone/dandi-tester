import { getServerSession } from "next-auth/next";
import {  } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from './supabaseClient';

const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL || 'dev@local.dev';

async function getOrCreateDevUser(): Promise<{ id: string } | null> {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEV_USER_EMAIL)
      .maybeSingle();

    if (existing) return existing;

    const { data: inserted, error } = await supabase
      .from('users')
      .insert({ email: DEV_USER_EMAIL, name: 'Local Dev User' })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating dev user:', error);
      return null;
    }
    return inserted;
  } catch (e) {
    console.error('getOrCreateDevUser:', e);
    return null;
  }
}

export async function getSessionUser() {
  const session = await getServerSession();
  if (session?.user?.email) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!error && user) return user;
  }

  // Allow API key creation without sign-in (set ALLOW_ANON_API_KEYS=true in .env.local)
  const allowAnon = process.env.ALLOW_ANON_API_KEYS === 'true' || process.env.NODE_ENV === 'development';
  if (allowAnon) {
    const devUser = await getOrCreateDevUser();
    if (devUser) return devUser;
    // Fallback: use DEV_USER_ID if Supabase RLS blocks getOrCreateDevUser (e.g. anon can't insert users)
    const devUserId = (process.env.DEV_USER_ID || '').trim();
    if (devUserId) {
      return { id: devUserId };
    }
    console.error(
      '[auth] Dev user not found. Create user in Supabase (SQL Editor), copy its id, add DEV_USER_ID=<id> to .env.local'
    );
  }

  return null;
}