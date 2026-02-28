import { NextResponse } from 'next/server';
import { summarizeReadme } from './chain';
import { validateApiKey, incrementApiKeyUsage } from '../../lib/apiKeyUtils';
import { getRepoInfo } from '../../lib/githubUtils';

function jsonResponse(message, status = 500) {
  // Never send HTML or long error-page content to the client
  if (typeof message === 'string' && (message.includes('<') || message.includes('</'))) {
    message = 'An error occurred on the server. Check the terminal where the dev server is running for details.';
  }
  return NextResponse.json({ message }, { status });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse('Invalid JSON body', 400);
  }

  const { githubUrl } = body;
  if (!githubUrl || typeof githubUrl !== 'string') {
    return NextResponse.json({ message: 'githubUrl is required' }, { status: 400 });
  }

  const apiKey = req.headers.get('x-api-key')?.trim();

  try {
    // If API key provided, validate and enforce rate limit; otherwise use OpenAI key from .env
    if (apiKey) {
      const apiKeyData = await validateApiKey(apiKey);

      if (!apiKeyData) {
        return NextResponse.json({ message: 'Invalid API key' }, { status: 401 });
      }

      const { success, message } = await incrementApiKeyUsage(apiKeyData);

      if (!success) {
        return NextResponse.json({ message }, { status: 429 });
      }
    } else {
      const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
      if (!openaiKey) {
        return NextResponse.json(
          {
            message:
              'No API key provided and OPENAI_API_KEY is not set in .env.local. Add it and restart the dev server (npm run dev).',
          },
          { status: 400 }
        );
      }
    }

    // Fetch repo info first
    const repoInfo = await getRepoInfo(githubUrl);

    // Truncate README to avoid token limits and timeouts (~12k chars ≈ 3k tokens headroom)
    const maxReadmeLength = 12000;
    const readmeContent =
      repoInfo.readmeContent.length > maxReadmeLength
        ? repoInfo.readmeContent.slice(0, maxReadmeLength) + '\n\n[... truncated for length]'
        : repoInfo.readmeContent;

    const [summary] = await Promise.all([
      summarizeReadme(readmeContent),
    ]);

    return NextResponse.json({
      ...summary,
      stars: repoInfo.stars,
      latestVersion: repoInfo.latestVersion,
      websiteUrl: repoInfo.websiteUrl,
      licenseType: repoInfo.licenseType,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GitHub summarizer:', error);

    // Extract message from various error shapes (OpenAI SDK, LangChain, Zod, etc.)
    let message = 'Error processing request';
    if (error && typeof error === 'object') {
      message =
        error.message ||
        error.error?.message ||
        error.response?.data?.error?.message ||
        error.cause?.message ||
        (typeof error.toString === 'function' ? error.toString() : String(error));
    } else if (error != null) {
      message = String(error);
    }

    return jsonResponse(message, 500);
  }
}

export const dynamic = 'force-dynamic';


