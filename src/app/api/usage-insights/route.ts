import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabaseClient';

interface UsageInsightsKeySummary {
  id: string;
  name: string;
  usage: number;
  limit: number;
  remaining: number;
}

interface UsageInsightsResponse {
  totalUsage: number;
  totalLimit: number;
  totalRemaining: number;
  utilizationPercent: number;
  keysCount: number;
  topKeysByUsage: UsageInsightsKeySummary[];
}

export async function GET() {
  try {
    const user = await requireAuth();

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, usage, limit, user_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching usage insights:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  const keys = (data ?? []).map((key) => {
    const usage = typeof key.usage === 'number' ? key.usage : 0;
    const limit = typeof key.limit === 'number' ? key.limit : 0;
    const remaining = Math.max(0, limit - usage);

    return {
      id: String(key.id),
      name: String(key.name ?? 'Untitled key'),
      usage,
      limit,
      remaining,
    };
  });

  const totals = keys.reduce(
    (acc, key) => {
      acc.totalUsage += key.usage;
      acc.totalLimit += key.limit;
      acc.totalRemaining += key.remaining;
      return acc;
    },
    { totalUsage: 0, totalLimit: 0, totalRemaining: 0 },
  );

  const utilizationPercent =
    totals.totalLimit > 0 ? Math.min(100, Math.max(0, (totals.totalUsage / totals.totalLimit) * 100)) : 0;

  const topKeysByUsage = [...keys]
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 3);

  const response: UsageInsightsResponse = {
    totalUsage: totals.totalUsage,
    totalLimit: totals.totalLimit,
    totalRemaining: totals.totalRemaining,
    utilizationPercent,
    keysCount: keys.length,
    topKeysByUsage,
  };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

