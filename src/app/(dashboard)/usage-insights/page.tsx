'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { UsageInsightsCard } from '../../components/usage-insights-card';

interface UsageInsightsData {
  totalUsage: number;
  totalLimit: number;
  totalRemaining: number;
  utilizationPercent: number;
  keysCount: number;
  topKeysByUsage: {
    id: string;
    name: string;
    usage: number;
    limit: number;
    remaining: number;
  }[];
}

export default function UsageInsightsPage() {
  const [insights, setInsights] = useState<UsageInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/usage-insights');

      if (!response.ok) {
        const text = await response.text();
        setError(text || 'Failed to load usage insights');
        return;
      }

      const data = (await response.json()) as UsageInsightsData;
      setInsights(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage insights';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasInsights = !!insights;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-grow p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold md:text-3xl">Usage Insights</h1>
            <p className="text-sm text-gray-600">
              See how your API keys are consuming credits across your account.
            </p>
          </header>

          {error && (
            <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">Unable to load usage insights.</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => {
                  void fetchInsights();
                }}
                className="mt-2 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50"
              >
                Try again
              </button>
            </div>
          )}

          {isLoading && (
            <div className="animate-pulse">
              <div className="h-40 rounded-xl bg-gray-100" />
            </div>
          )}

          {!isLoading && hasInsights && (
            <UsageInsightsCard
              className="mt-2"
              totalUsage={insights.totalUsage}
              totalLimit={insights.totalLimit}
              totalRemaining={insights.totalRemaining}
              utilizationPercent={insights.utilizationPercent}
              keysCount={insights.keysCount}
              topKeysByUsage={insights.topKeysByUsage}
            />
          )}

          {!isLoading && !error && !hasInsights && (
            <p className="text-sm text-gray-500">
              No usage data is available yet. Create an API key and start making requests to see insights here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

