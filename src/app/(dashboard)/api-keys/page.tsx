'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Notification from '../../components/Notification';
import ApiKeysTable from '../../components/ApiKeysTable';
import CreateApiKeyModal from '../../components/CreateApiKeyModal';
import EditApiKeyModal from '../../components/EditApiKeyModal';

interface ApiKey {
  id: string;
  name: string;
  value: string;
  usage: number;
  limit: number;
  remaining?: number;
}

interface RemainingCreditsBadgeProps {
  totalRemaining: number;
}

function RemainingCreditsBadge({ totalRemaining }: RemainingCreditsBadgeProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
      <span className="mr-1 h-2 w-2 rounded-full bg-emerald-500" />
      Remaining credits
      <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold">
        {totalRemaining}
      </span>
    </div>
  );
}

export default function ApiKeysDashboardPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification('Failed to fetch API keys', 'error');
    }
  };

  const totalRemaining = useMemo(
    () =>
      apiKeys.reduce((acc, key) => {
        const remaining = typeof key.remaining === 'number' ? key.remaining : Math.max(0, (key.limit ?? 0) - (key.usage ?? 0));
        return acc + remaining;
      }, 0),
    [apiKeys],
  );

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleCreateApiKey = async (name: string, limit?: number) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, limit }),
      });

      const text = await response.text();
      let data: ApiKey | { error?: string } = {} as ApiKey;
      try {
        data = text ? JSON.parse(text) : ({} as ApiKey);
      } catch {
        data = { error: text || `Server error (${response.status})` };
      }

      if (!response.ok) {
        showNotification((data as { error?: string })?.error || `Failed to create API key (${response.status})`, 'error');
        return;
      }

      setApiKeys((prev) => [...prev, data as ApiKey]);
      setIsCreateModalOpen(false);
      showNotification('API key created successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create API key';
      showNotification(msg, 'error');
    }
  };

  const handleUpdateApiKey = async (updatedKey: ApiKey) => {
    try {
      const response = await fetch(`/api/api-keys/${updatedKey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedKey.name }),
      });
      if (!response.ok) throw new Error('Failed to update API key');
      const updated = (await response.json()) as ApiKey;
      setApiKeys((prev) => prev.map((key) => (key.id === updated.id ? updated : key)));
      setEditingKey(null);
      showNotification('API key updated successfully');
    } catch {
      showNotification('Failed to update API key', 'error');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete API key');
      setApiKeys((prev) => prev.filter((key) => key.id !== id));
      showNotification('API key deleted successfully');
    } catch {
      showNotification('Failed to delete API key', 'error');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied API key to clipboard');
    } catch {
      showNotification('Failed to copy API key. Please try again.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-grow p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}

          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">API Keys</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your API keys and track how many credits you have left.
              </p>
            </div>
            <RemainingCreditsBadge totalRemaining={totalRemaining} />
          </div>

          <div>
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold">Your keys</h2>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 sm:w-auto"
              >
                + Create New Key
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg bg-white shadow">
              <ApiKeysTable
                apiKeys={apiKeys}
                onEdit={setEditingKey}
                onDelete={handleDeleteApiKey}
                onCopy={copyToClipboard}
                showNotification={showNotification}
              />
            </div>
          </div>

          <CreateApiKeyModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateApiKey}
          />

          <EditApiKeyModal
            apiKey={editingKey}
            isOpen={!!editingKey}
            onClose={() => setEditingKey(null)}
            onUpdate={handleUpdateApiKey}
          />
        </div>
      </div>
    </div>
  );
}

