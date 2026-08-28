import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchRepositoryActivity } from '../src/github.js';

function response(repository) {
  return { ok: true, json: async () => ({ data: { repository } }) };
}

test('normalizes repository metadata, languages and commits', async () => {
  const fetchImpl = async () => response({
    nameWithOwner: 'Haruko386/FunPDF', name: 'FunPDF', description: 'PDF reader', url: 'https://github.com/Haruko386/FunPDF',
    owner: { login: 'Haruko386', avatarUrl: 'https://example.test/avatar.png' },
    issues: { totalCount: 2 }, pullRequests: { totalCount: 1 },
    languages: { totalSize: 100, edges: [{ size: 70, node: { name: 'Vue', color: '#41b883' } }, { size: 30, node: { name: 'Go', color: '#00ADD8' } }] },
    defaultBranchRef: { name: 'main', target: { history: { totalCount: 1, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ oid: 'abc', committedDate: '2026-08-27T10:00:00Z', messageHeadline: 'feat', additions: 12, deletions: 3 }] } } }
  });

  const result = await fetchRepositoryActivity({ repository: 'Haruko386/FunPDF', token: 'token', since: 'a', until: 'b', fetchImpl });
  assert.equal(result.commits.length, 1);
  assert.equal(result.languages[0].percentage, 0.7);
  assert.equal(result.openPullRequests, 1);
});

test('paginates histories beyond one hundred commits', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({
      nameWithOwner: 'o/r', name: 'r', description: null, url: 'https://example.test', owner: { login: 'o', avatarUrl: '' },
      issues: { totalCount: 0 }, pullRequests: { totalCount: 0 }, languages: { totalSize: 0, edges: [] },
      defaultBranchRef: { name: 'main', target: { history: { totalCount: 101, pageInfo: { hasNextPage: calls === 1, endCursor: calls === 1 ? 'next' : null }, nodes: [{ oid: String(calls), committedDate: '2026-01-01T00:00:00Z', messageHeadline: '', additions: 1, deletions: 0 }] } } }
    });
  };
  const result = await fetchRepositoryActivity({ repository: 'o/r', token: 'token', since: 'a', until: 'b', fetchImpl });
  assert.equal(calls, 2);
  assert.equal(result.commits.length, 2);
});

test('rejects repository names without an owner', async () => {
  await assert.rejects(() => fetchRepositoryActivity({ repository: 'FunPDF', token: 'x', since: 'a', until: 'b' }), /OWNER\/REPO/);
});
