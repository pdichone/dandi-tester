import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from './supabaseClient';

const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL || 'dev@local.dev';

export type UserRole = 'user' | 'admin';

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
}

/**
 * Gets or creates a dev user for local development
 * @returns User ID or null if creation fails
 */
async function getOrCreateDevUser(): Promise<{ id: string; role: UserRole } | null> {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', DEV_USER_EMAIL)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, role: (existing.role as UserRole) || 'user' };
    }

    const { data: inserted, error } = await supabase
      .from('users')
      .insert({ email: DEV_USER_EMAIL, name: 'Local Dev User', role: 'user' })
      .select('id, role')
      .single();

    if (error) {
      console.error('Error creating dev user:', error);
      return null;
    }
    return { id: inserted.id, role: (inserted.role as UserRole) || 'user' };
  } catch (e) {
    console.error('getOrCreateDevUser:', e);
    return null;
  }
}

/**
 * Gets the current session user with role information
 * @returns SessionUser with role, or null if not authenticated
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.email) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, image, role')
      .eq('email', session.user.email)
      .single();

    if (!error && user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        image: user.image || undefined,
        role: (user.role as UserRole) || 'user',
      };
    }
  }

  // Allow API key creation without sign-in (set ALLOW_ANON_API_KEYS=true in .env.local)
  // Only in development or when explicitly enabled
  const allowAnon = 
    (process.env.ALLOW_ANON_API_KEYS === 'true' || process.env.NODE_ENV === 'development') &&
    process.env.NODE_ENV !== 'production'; // Never allow in production

  if (allowAnon) {
    const devUser = await getOrCreateDevUser();
    if (devUser) {
      return {
        id: devUser.id,
        email: DEV_USER_EMAIL,
        name: 'Local Dev User',
        role: devUser.role,
      };
    }
    // Fallback: use DEV_USER_ID if Supabase RLS blocks getOrCreateDevUser
    const devUserId = (process.env.DEV_USER_ID || '').trim();
    if (devUserId) {
      // Fetch role for dev user
      const { data: devUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', devUserId)
        .single();
      
      return {
        id: devUserId,
        email: DEV_USER_EMAIL,
        name: 'Local Dev User',
        role: (devUserData?.role as UserRole) || 'user',
      };
    }
    console.error(
      '[auth] Dev user not found. Create user in Supabase (SQL Editor), copy its id, add DEV_USER_ID=<id> to .env.local'
    );
  }

  return null;
}

/**
 * Requires authentication - throws if user is not authenticated
 * @returns SessionUser (never null)
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
  return user;
}

/**
 * Checks if a user has a specific role
 * @param user - The session user
 * @param role - The role to check for
 * @returns true if user has the role
 */
export function hasRole(user: SessionUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Checks if a user is an admin
 * @param user - The session user
 * @returns true if user is an admin
 */
export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Requires a specific role - throws if user doesn't have the role
 * @param role - The required role
 * @returns SessionUser with the required role
 * @throws Error if not authenticated or doesn't have required role
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasRole(user, role)) {
    throw new Error(`Forbidden: ${role} role required`);
  }
  return user;
}

/**
 * Requires admin role - throws if user is not an admin
 * @returns SessionUser with admin role
 * @throws Error if not authenticated or not an admin
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('admin');
}
