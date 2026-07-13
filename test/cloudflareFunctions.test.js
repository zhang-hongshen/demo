import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as sample } from '../functions/api/sample.js';
import { handleGenerateRequest } from '../functions/api/generate.js';

const providerPattern = /DeepSeek|deepseek|deepseek-v4-flash|api\.deepseek\.com|模型/;

test('Cloudflare sample function returns public demo data without provider details', async () => {
  const response = await sample();
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.ok(json.result.pitchScript.includes('完整闭环'));
  assert.doesNotMatch(JSON.stringify(json), providerPattern);
});

test('Cloudflare generate function reads api key from context env', async () => {
  const request = new Request('https://example.test/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course: '数据结构', students: '大一学生' })
  });
  const response = await handleGenerateRequest({
    request,
    env: { api_key: 'secret-key' },
    generate: async (input, config) => {
      assert.equal(input.course, '数据结构');
      assert.equal(config.baseUrl, 'https://api.deepseek.com');
      assert.equal(config.apiKey, 'secret-key');
      assert.equal(config.model, 'deepseek-v4-flash');
      return { pitchScript: '课堂方案已生成' };
    }
  });
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.result.pitchScript, '课堂方案已生成');
});

test('Cloudflare generate function hides provider, model, and secret in errors', async () => {
  const request = new Request('https://example.test/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course: '数据结构' })
  });
  const response = await handleGenerateRequest({
    request,
    env: { api_key: 'secret-key' },
    logger: { error: () => {} },
    generate: async () => {
      throw new Error('DeepSeek request failed for deepseek-v4-flash at https://api.deepseek.com with secret-key');
    }
  });
  const json = await response.json();

  assert.equal(response.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, '方案服务暂时不可用，请稍后重试或查看样例。');
  assert.doesNotMatch(JSON.stringify(json), /secret-key/);
  assert.doesNotMatch(JSON.stringify(json), providerPattern);
});

test('Cloudflare generate function logs sanitized diagnostics for operators', async () => {
  const request = new Request('https://example.test/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course: '数据结构' })
  });
  const logs = [];
  await handleGenerateRequest({
    request,
    env: { api_key: 'secret-key' },
    logger: { error: (...args) => logs.push(args.join(' ')) },
    generate: async () => {
      throw new Error('DeepSeek request failed with status 402: secret-key');
    }
  });

  assert.equal(logs.length, 1);
  assert.match(logs[0], /generate_failed/);
  assert.match(logs[0], /status 402/);
  assert.doesNotMatch(logs[0], /secret-key/);
});
