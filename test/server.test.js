import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

const providerPattern = /DeepSeek|deepseek|deepseek-v4-flash|api\.deepseek\.com|模型/;

test('GET /api/sample returns demo result', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/sample`);
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.ok(json.result.pitchScript.includes('智能生成'));
    assert.doesNotMatch(JSON.stringify(json), providerPattern);
  } finally {
    server.close();
  }
});

test('POST /api/generate returns safe error without API key', async () => {
  const server = createServer({
    config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' },
    generate: async () => {
      throw new Error('DeepSeek request failed for deepseek-v4-flash at https://api.deepseek.com with secret-key');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course: '数据结构' })
    });
    const json = await response.json();
    assert.equal(response.status, 502);
    assert.equal(json.ok, false);
    assert.doesNotMatch(JSON.stringify(json), /secret-key/);
    assert.doesNotMatch(JSON.stringify(json), providerPattern);
    assert.equal(json.error, '智能生成服务暂时不可用，请稍后重试或载入样例。');
  } finally {
    server.close();
  }
});
