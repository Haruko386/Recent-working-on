import test from 'node:test';
import assert from 'node:assert/strict';
import { publishSvg } from '../src/publish.js';

function jsonResponse(status, payload) {
  return { status, ok: status >= 200 && status < 300, json: async () => payload };
}

test('creates an orphan output branch containing only the card files', async () => {
  const calls = [];
  const responses = [
    jsonResponse(404, { message: 'Not Found' }),
    jsonResponse(404, { message: 'Not Found' }),
    jsonResponse(201, { sha: 'tree-sha' }),
    jsonResponse(201, { sha: 'commit-sha' }),
    jsonResponse(201, { ref: 'refs/heads/output-repository-card' })
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return responses.shift();
  };

  const result = await publishSvg({
    destinationRepository: 'owner/profile', branch: 'output-repository-card', filename: 'repository-card.svg',
    content: '<svg/>', token: 'token', fetchImpl
  });

  assert.equal(result.changed, true);
  assert.equal(calls.length, 5);
  assert.match(calls[4].url, /\/git\/refs$/);
  assert.deepEqual(JSON.parse(calls[4].options.body), { ref: 'refs/heads/output-repository-card', sha: 'commit-sha' });
});

test('does not create a commit when the published card is unchanged', async () => {
  const encoded = Buffer.from('<svg/>').toString('base64');
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse(200, { content: encoded });
  };
  const result = await publishSvg({
    destinationRepository: 'owner/profile', branch: 'output-repository-card', filename: 'repository-card.svg',
    content: '<svg/>', token: 'token', fetchImpl
  });
  assert.equal(result.changed, false);
  assert.equal(calls, 1);
});

test('updates an existing output branch without force pushing', async () => {
  const calls = [];
  const responses = [
    jsonResponse(404, { message: 'Not Found' }),
    jsonResponse(200, { object: { sha: 'old-sha' } }),
    jsonResponse(201, { sha: 'tree-sha' }),
    jsonResponse(201, { sha: 'new-sha' }),
    jsonResponse(200, { object: { sha: 'new-sha' } })
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return responses.shift();
  };
  await publishSvg({ destinationRepository: 'o/r', branch: 'cards', filename: 'card.svg', content: 'new', token: 'x', fetchImpl });
  assert.equal(calls[4].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[4].options.body), { sha: 'new-sha', force: false });
});
