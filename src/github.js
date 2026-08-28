const QUERY = `
  query RepositoryActivity(
    $owner: String!
    $name: String!
    $since: GitTimestamp!
    $until: GitTimestamp!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      name
      description
      url
      owner { login avatarUrl(size: 128) }
      issues(states: OPEN) { totalCount }
      pullRequests(states: OPEN) { totalCount }
      languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
        totalSize
        edges { size node { name color } }
      }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 100, since: $since, until: $until, after: $after) {
              totalCount
              pageInfo { hasNextPage endCursor }
              nodes {
                oid
                committedDate
                messageHeadline
                additions
                deletions
              }
            }
          }
        }
      }
    }
  }
`;

function splitRepository(repository) {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(repository);
  if (!match) throw new Error('repository must use OWNER/REPO format, for example Haruko386/FunPDF.');
  return { owner: match[1], name: match[2] };
}

async function graphQl(token, variables, fetchImpl) {
  const response = await fetchImpl('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'repository-activity-card'
    },
    body: JSON.stringify({ query: QUERY, variables })
  });

  if (!response.ok) throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  }
  return payload.data?.repository;
}

export async function fetchRepositoryActivity({ repository, token, since, until, fetchImpl = fetch }) {
  const { owner, name } = splitRepository(repository);
  const commits = [];
  let after = null;
  let details;

  do {
    const repo = await graphQl(token, { owner, name, since, until, after }, fetchImpl);
    if (!repo) throw new Error(`Repository "${repository}" was not found or the token cannot access it.`);
    details ??= repo;
    const history = repo.defaultBranchRef?.target?.history;
    if (!history) break;
    commits.push(...history.nodes);
    after = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null;
  } while (after);

  const languageTotal = details.languages.totalSize || 0;
  return {
    nameWithOwner: details.nameWithOwner,
    name: details.name,
    owner: details.owner.login,
    description: details.description || 'No description provided.',
    url: details.url,
    avatarUrl: details.owner.avatarUrl,
    defaultBranch: details.defaultBranchRef?.name ?? null,
    openIssues: details.issues.totalCount,
    openPullRequests: details.pullRequests.totalCount,
    languages: details.languages.edges.map(({ size, node }) => ({
      name: node.name,
      color: node.color || '#8b949e',
      size,
      percentage: languageTotal ? size / languageTotal : 0
    })),
    commits
  };
}

export async function fetchImageDataUrl(url, fetchImpl = fetch) {
  if (!url) return null;
  try {
    const response = await fetchImpl(url, { headers: { 'user-agent': 'repository-activity-card' } });
    if (!response.ok) return null;
    const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
    const data = Buffer.from(await response.arrayBuffer()).toString('base64');
    return `data:${mimeType};base64,${data}`;
  } catch {
    return null;
  }
}
