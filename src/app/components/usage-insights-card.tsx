'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UsageInsightsKeySummary {
  id: string;
  name: string;
  usage: number;
  limit: number;
  remaining: number;
}

export interface UsageInsightsProps {
  totalUsage: number;
  totalLimit: number;
  totalRemaining: number;
  utilizationPercent: number;
  keysCount?: number;
  topKeysByUsage?: UsageInsightsKeySummary[];
  className?: string;
}

export function UsageInsightsCard({
  totalUsage,
  totalLimit,
  totalRemaining,
  utilizationPercent,
  keysCount = 0,
  topKeysByUsage = [],
  className,
}: UsageInsightsProps) {
  const clampedUtilization = Number.isFinite(utilizationPercent)
    ? Math.min(100, Math.max(0, utilizationPercent))
    : 0;

  const hasAnyUsage = totalUsage > 0 || totalLimit > 0 || totalRemaining > 0;
  const hasKeys = keysCount > 0 && topKeysByUsage.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Usage Insights</CardTitle>
        <CardDescription>
          High-level overview of your API key usage, limits, and remaining credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Total usage</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalUsage}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total limit</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalLimit}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Remaining credits</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{totalRemaining}</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Overall utilization</p>
            <p className="text-sm font-semibold text-gray-900">
              {clampedUtilization.toFixed(0)}
              %
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-[width]"
              style={{ width: `${clampedUtilization}%` }}
            />
          </div>
          {!hasAnyUsage && (
            <p className="mt-2 text-xs text-gray-500">
              You have not used any credits yet. Start making requests with your API keys to see usage here.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Top keys by usage
            {keysCount > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {keysCount} key{keysCount === 1 ? '' : 's'}
              </span>
            )}
          </p>

          {hasKeys ? (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-100 bg-gray-50/60">
              {topKeysByUsage.map((key) => {
                const keyUtilization =
                  key.limit > 0 ? Math.min(100, Math.max(0, (key.usage / key.limit) * 100)) : 0;

                return (
                  <li key={key.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{key.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {key.usage} used / {key.limit} limit · {key.remaining} remaining
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {keyUtilization.toFixed(0)}
                        %
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${keyUtilization}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">
              Once your keys start receiving traffic, you&apos;ll see the most active ones highlighted here.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

