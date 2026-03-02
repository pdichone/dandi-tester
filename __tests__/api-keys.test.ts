import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/api-keys/route';
import { requireAuth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

// Mock dependencies
vi.mock('@/app/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const requireAuthMock = requireAuth as unknown as ReturnType<typeof vi.fn>;
const supabaseFromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

interface MockResponse {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
}

function createSupabaseSuccessResponse(data: unknown, count?: number | null): MockResponse {
  return { data, error: null, count };
}

function createSupabaseErrorResponse(message: string): MockResponse {
  return { data: null, error: { message }, count: null };
}

describe('API Keys GET endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated API keys for authenticated user', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const sampleKeys = [
      { id: '1', name: 'Key A', usage: 10, limit: 100, user_id: 'user-1', created_at: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Key B', usage: 20, limit: 200, user_id: 'user-1', created_at: '2024-01-02T00:00:00Z' },
    ];

    const rangeMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse(sampleKeys, 2));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const request = new Request('http://localhost/api/api-keys?page=1&limit=50');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.pagination.hasMore).toBe(false);
    expect(body.data[0]).toHaveProperty('remaining');
  });

  it('returns paginated results with default pagination', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const sampleKeys = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `Key ${i}`,
      usage: 0,
      limit: 100,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
    }));

    const rangeMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse(sampleKeys, 100));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const request = new Request('http://localhost/api/api-keys');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50); // Default limit
  });

  it('handles pagination parameters correctly', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const rangeMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse([], 100));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const request = new Request('http://localhost/api/api-keys?page=2&limit=25');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(25);
    expect(rangeMock).toHaveBeenCalledWith(25, 49); // offset = (2-1)*25 = 25, limit = 25
  });

  it('enforces maximum limit of 100', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const rangeMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse([], 0));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const request = new Request('http://localhost/api/api-keys?page=1&limit=200');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.limit).toBe(100); // Capped at 100
  });

  it('returns 401 when unauthenticated', async () => {
    requireAuthMock.mockRejectedValue(new Error('Unauthorized: Authentication required'));

    const request = new Request('http://localhost/api/api-keys');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized: Authentication required');
  });

  it('returns 500 when Supabase returns an error', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const rangeMock = vi.fn().mockResolvedValue(createSupabaseErrorResponse('Database error'));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const request = new Request('http://localhost/api/api-keys');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
  });
});

describe('API Keys POST endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates API key successfully', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const newKey = {
      id: 'new-key-1',
      name: 'My API Key',
      value: 'dandi-1234567890abc',
      usage: 0,
      limit: 1000,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
    };

    // Mock count query (daily limit check)
    const countEqMock = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValue(createSupabaseSuccessResponse(null, 0)),
    });
    const countSelectMock = vi.fn().mockReturnValue({ eq: countEqMock });
    const countFromMock = vi.fn().mockReturnValue({ select: countSelectMock });

    // Mock insert query
    const insertSelectMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse([newKey]));
    const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock });
    const insertFromMock = vi.fn().mockReturnValue({ insert: insertMock });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'api_keys') {
        // First call is for count, second is for insert
        const calls = supabaseFromMock.mock.calls.filter(c => c[0] === 'api_keys');
        if (calls.length === 1) {
          return countFromMock();
        }
        return insertFromMock();
      }
      return {};
    });

    const request = new Request('http://localhost/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My API Key', limit: 1000 }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('new-key-1');
    expect(body.name).toBe('My API Key');
  });

  it('enforces daily API key limit', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    // Mock count query returning 3 (at limit)
    const countEqMock = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValue(createSupabaseSuccessResponse(null, 3)),
    });
    const countSelectMock = vi.fn().mockReturnValue({ eq: countEqMock });
    supabaseFromMock.mockReturnValue({ select: countSelectMock });

    const request = new Request('http://localhost/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My API Key' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain('Daily API key limit reached');
    expect(body.code).toBe('API_KEY_DAILY_LIMIT');
  });

  it('returns 401 when unauthenticated', async () => {
    requireAuthMock.mockRejectedValue(new Error('Unauthorized: Authentication required'));

    const request = new Request('http://localhost/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My API Key' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized: Authentication required');
  });
});
