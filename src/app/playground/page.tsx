'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Notification from '../components/Notification';
import Sidebar from '../components/Sidebar';

const Playground = () => {
  const [apiKey, setApiKey] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse(null);
    setNotification(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const response = await fetch('/api/github-summarizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ githubUrl: githubUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      let data: { message?: string; error?: string } = {};
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: 'Server returned invalid JSON.' };
        }
      } else {
        data = {
          message: text.startsWith('<')
            ? 'Server returned an error page instead of JSON. Check the terminal where the dev server is running for the real error.'
            : text.slice(0, 500),
        };
      }

      if (response.ok) {
        setResponse(data);
        setNotification({ message: 'Successfully fetched response', type: 'success' });
      } else {
        setResponse(data);
        const errorMsg = data?.message || data?.error || 'An error occurred';
        setNotification({ message: errorMsg, type: 'error' });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      setNotification({
        message: isAbort ? 'Request timed out (90s). Try a repo with a smaller README.' : 'An error occurred',
        type: 'error',
      });
      if (!isAbort) setResponse({ message: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-grow p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">API Playground</h1>
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                API Key <span className="text-gray-400 font-normal">(optional – uses OPENAI_API_KEY from .env.local if empty)</span>
              </label>
              <input
                type="text"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave empty to use .env.local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700">
                GitHub URL
              </label>
              <input
                type="url"
                id="githubUrl"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Submit'}
            </button>
          </form>
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
          {response && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Response</h2>
              <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playground;