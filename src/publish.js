function splitRepository(repository) {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(repository);
  if (!match) throw new Error(`Invalid destination repository "${repository}".`);
  return { owner: match[1], name: match[2] };
}

function validateTarget(branch, filename) {
  if (!branch || branch.startsWith('/') || branch.endsWith('/') || branch.includes('..')) {
    throw new Error(`Invalid output branch "${branch}".`);
  }
  if (!filename || filename.startsWith('/') || filename.split('/').includes('..')) {
    throw new Error(`Invalid output filename "${filename}".`);
  }
}

async function request(path, { token, method = 'GET', body, fetchImpl }) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'repository-activity-card',
      'x-github-api-version': '2022-11-28'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 404 && method === 'GET') return null;
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const detail = payload?.message ? `: ${payload.message}` : '';
    throw new Error(`GitHub publish request failed (${method} ${path}, ${response.status})${detail}`);
  }
  return payload;
}

export async function publishSvg({ destinationRepository, branch, filename, content, token, fetchImpl = fetch }) {
  const { owner, name } = splitRepository(destinationRepository);
  validateTarget(branch, filename);
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const encodedBranch = encodeURIComponent(branch);
  const encodedFilename = filename.split('/').map(encodeURIComponent).join('/');

  const existingFile = await request(`${repoPath}/contents/${encodedFilename}?ref=${encodedBranch}`, { token, fetchImpl });
  if (existingFile?.content) {
    const current = Buffer.from(existingFile.content.replaceAll('\n', ''), 'base64').toString('utf8');
    if (current === content) return { changed: false, branch, filename };
  }

  const currentRef = await request(`${repoPath}/git/ref/heads/${encodedBranch}`, { token, fetchImpl });
  const tree = await request(`${repoPath}/git/trees`, {
    token,
    method: 'POST',
    fetchImpl,
    body: {
      tree: [
        { path: filename, mode: '100644', type: 'blob', content },
        { path: '.nojekyll', mode: '100644', type: 'blob', content: '' }
      ]
    }
  });
  const commit = await request(`${repoPath}/git/commits`, {
    token,
    method: 'POST',
    fetchImpl,
    body: {
      message: 'chore: update repository activity card',
      tree: tree.sha,
      parents: currentRef ? [currentRef.object.sha] : []
    }
  });

  if (currentRef) {
    await request(`${repoPath}/git/refs/heads/${encodedBranch}`, {
      token,
      method: 'PATCH',
      fetchImpl,
      body: { sha: commit.sha, force: false }
    });
  } else {
    await request(`${repoPath}/git/refs`, {
      token,
      method: 'POST',
      fetchImpl,
      body: { ref: `refs/heads/${branch}`, sha: commit.sha }
    });
  }

  return { changed: true, branch, filename };
}
