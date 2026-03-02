import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSessionUser,
  requireAuth,
  hasRole,
  isAdmin,
  requireRole,
  requireAdmin,
  type SessionUser,
  type UserRole,
} from '@/app/lib/auth';
import { getServerSession } from 'next-auth/next';
import { supabase } from '@/app/lib/supabaseClient';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/app/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

const getServerSessionMock = getServerSession as unknown as ReturnType<typeof vi.fn>;
const supabaseFromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.ALLOW_ANON_API_KEYS = 'false';
    process.env.DEV_USER_ID = '';
    // Note: NODE_ENV is read-only, so we can't modify it in tests
  });

  describe('getSessionUser', () => {
    it('returns user with role when session exists', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'test@example.com', name: 'Test User' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await getSessionUser();

      expect(user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
    });

    it('returns user with admin role', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'admin-1',
              email: 'admin@example.com',
              role: 'admin',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await getSessionUser();

      expect(user?.role).toBe('admin');
    });

    it('returns null when no session exists and dev mode is disabled', async () => {
      getServerSessionMock.mockResolvedValue(null);

      const user = await getSessionUser();

      expect(user).toBeNull();
    });

    it('defaults to user role when role is missing', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              email: 'test@example.com',
              role: null, // Missing role
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await getSessionUser();

      expect(user?.role).toBe('user');
    });
  });

  describe('requireAuth', () => {
    it('returns user when authenticated', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              email: 'test@example.com',
              role: 'user',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await requireAuth();

      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
    });

    it('throws error when not authenticated', async () => {
      getServerSessionMock.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow('Unauthorized: Authentication required');
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', () => {
      const user: SessionUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin',
      };

      expect(hasRole(user, 'admin')).toBe(true);
      expect(hasRole(user, 'user')).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin users', () => {
      const adminUser: SessionUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      expect(isAdmin(adminUser)).toBe(true);
    });

    it('returns false for regular users', () => {
      const regularUser: SessionUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      };

      expect(isAdmin(regularUser)).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('returns user when user has required role', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'admin-1',
              email: 'admin@example.com',
              role: 'admin',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await requireRole('admin');

      expect(user.role).toBe('admin');
    });

    it('throws error when user does not have required role', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'user@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              email: 'user@example.com',
              role: 'user',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      await expect(requireRole('admin')).rejects.toThrow('Forbidden: admin role required');
    });
  });

  describe('requireAdmin', () => {
    it('returns admin user', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'admin-1',
              email: 'admin@example.com',
              role: 'admin',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      const user = await requireAdmin();

      expect(user.role).toBe('admin');
    });

    it('throws error when user is not admin', async () => {
      getServerSessionMock.mockResolvedValue({
        user: { email: 'user@example.com' },
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              email: 'user@example.com',
              role: 'user',
            },
            error: null,
          }),
        }),
      });

      supabaseFromMock.mockReturnValue({ select: selectMock });

      await expect(requireAdmin()).rejects.toThrow('Forbidden: admin role required');
    });
  });
});
