import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/app/lib/auth', () => ({
  getSessionUser: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/components/Sidebar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'sidebar' }, 'Sidebar'),
}));

vi.mock('@/app/lib/supabaseClient', () => {
  const from = vi.fn();
  return {
    supabase: { from },
    __esModule: true,
  };
});

import { GET } from '@/app/api/usage-insights/route';
import { UsageInsightsCard } from '@/app/components/usage-insights-card';
import UsageInsightsPage from '@/app/(dashboard)/usage-insights/page';
import { requireAuth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

const requireAuthMock = requireAuth as unknown as ReturnType<typeof vi.fn>;
const supabaseFromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

interface MockResponse {
  data: unknown;
  error: { message: string } | null;
}

function createSupabaseSuccessResponse(data: unknown): MockResponse {
  return { data, error: null };
}

function createSupabaseErrorResponse(message: string): MockResponse {
  return { data: null, error: { message } };
}

describe('usage-insights API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated metrics for an authenticated user', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const sampleKeys = [
      { id: '1', name: 'Key A', usage: 10, limit: 100 },
      { id: '2', name: 'Key B', usage: 20, limit: 200 },
    ];

    const eqMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse(sampleKeys));
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const response = await GET();
    const body = (await response.json()) as {
      totalUsage: number;
      totalLimit: number;
      totalRemaining: number;
      utilizationPercent: number;
      keysCount: number;
      topKeysByUsage: { id: string; name: string; usage: number; limit: number; remaining: number }[];
    };

    expect(response.status).toBe(200);
    expect(body.totalUsage).toBe(30);
    expect(body.totalLimit).toBe(300);
    expect(body.totalRemaining).toBe(270);
    expect(Math.round(body.utilizationPercent)).toBe(10);
    expect(body.keysCount).toBe(2);
    expect(body.topKeysByUsage).toHaveLength(2);
    expect(body.topKeysByUsage[0].name).toBe('Key B');
  });

  it('returns zeros when user has no keys', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const eqMock = vi.fn().mockResolvedValue(createSupabaseSuccessResponse([]));
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const response = await GET();
    const body = (await response.json()) as { totalUsage: number; totalLimit: number; totalRemaining: number; keysCount: number };

    expect(response.status).toBe(200);
    expect(body.totalUsage).toBe(0);
    expect(body.totalLimit).toBe(0);
    expect(body.totalRemaining).toBe(0);
    expect(body.keysCount).toBe(0);
  });

  it('returns 401 when unauthenticated', async () => {
    requireAuthMock.mockRejectedValue(new Error('Unauthorized: Authentication required'));

    const response = await GET();
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized: Authentication required');
  });

  it('returns 500 when Supabase returns an error', async () => {
    requireAuthMock.mockResolvedValue({ id: 'user-1' });

    const eqMock = vi.fn().mockResolvedValue(createSupabaseErrorResponse('Something went wrong'));
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    supabaseFromMock.mockReturnValue({ select: selectMock });

    const response = await GET();
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
  });
});

describe('UsageInsightsCard component', () => {
  it('renders key metrics and top keys without throwing', () => {
    const html = renderToStaticMarkup(
      <UsageInsightsCard
        totalUsage={30}
        totalLimit={100}
        totalRemaining={70}
        utilizationPercent={30}
        keysCount={2}
        topKeysByUsage={[
          { id: '1', name: 'Key A', usage: 10, limit: 50, remaining: 40 },
          { id: '2', name: 'Key B', usage: 20, limit: 50, remaining: 30 },
        ]}
      />,
    );

    expect(html).toContain('Usage Insights');
    expect(html).toContain('Total usage');
    expect(html).toContain('Top keys by usage');
  });
});

describe('UsageInsightsPage component', () => {
  it('renders the Usage Insights heading on initial render', () => {
    const html = renderToStaticMarkup(<UsageInsightsPage />);
    expect(html).toContain('Usage Insights');
  });
});
