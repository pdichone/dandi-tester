interface RepoInfo {
  readmeContent: string;
  stars: number;
  latestVersion: string;
  websiteUrl: string | null;
  licenseType: string | null;
}

export async function getRepoInfo(githubUrl: string): Promise<RepoInfo> {
  const trimmed = githubUrl.trim().replace(/\/$/, '');
  const parts = trimmed.split('/').filter(Boolean);
  const repoIndex = parts.indexOf('github.com');
  const owner = repoIndex >= 0 ? parts[repoIndex + 1] : parts[parts.length - 2];
  const repo = repoIndex >= 0 ? parts[repoIndex + 2] : parts[parts.length - 1];
  if (!owner || !repo) {
    throw new Error(
      'Invalid GitHub URL. Use format: https://github.com/owner/repo'
    );
  }
  const apiBaseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for GitHub

  let readmeResponse: Response;
  let repoInfoResponse: Response;
  let releasesResponse: Response;

  try {
    [readmeResponse, repoInfoResponse, releasesResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/readme`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        signal: controller.signal,
      }),
      fetch(apiBaseUrl, { signal: controller.signal }),
      fetch(`${apiBaseUrl}/releases/latest`, { signal: controller.signal }),
    ]);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('GitHub request timed out. Try again.');
    }
    throw err;
  }

  clearTimeout(timeoutId);

  if (!repoInfoResponse.ok) {
    const msg = repoInfoResponse.status === 404
      ? 'Repository not found. Check the GitHub URL.'
      : `GitHub API error: ${repoInfoResponse.status} ${repoInfoResponse.statusText}`;
    throw new Error(msg);
  }

  const [readmeJson, repoInfo, latestRelease] = await Promise.all([
    readmeResponse.ok ? readmeResponse.json() : null,
    repoInfoResponse.json(),
    releasesResponse.ok ? releasesResponse.json() : null,
  ]);

  let readmeContent = '';
  if (readmeJson?.content && readmeJson.encoding === 'base64') {
    readmeContent = Buffer.from(readmeJson.content, 'base64').toString('utf-8');
  }

  if (!readmeContent || readmeContent.length < 10) {
    throw new Error('This repository has no README or it could not be fetched.');
  }

  // If we somehow got HTML, reject it
  const trimmedStart = readmeContent.trimStart();
  if (trimmedStart.startsWith('<') && trimmedStart.toLowerCase().includes('</')) {
    throw new Error('README content appears to be HTML instead of text. The repo may use a custom readme path.');
  }

  return {
    readmeContent,
    stars: repoInfo.stargazers_count,
    latestVersion: latestRelease ? latestRelease.tag_name : 'No releases found',
    websiteUrl: repoInfo.homepage || null,
    licenseType: repoInfo.license ? repoInfo.license.spdx_id : null,
  };
}