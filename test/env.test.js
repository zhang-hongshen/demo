import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../src/env.js';

test('loadEnv defaults to official DeepSeek API using api_key from .env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-env-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, 'api_key=secret-key\n');

  const config = loadEnv(envPath);

  assert.equal(config.baseUrl, 'https://api.deepseek.com');
  assert.equal(config.apiKey, 'secret-key');
  assert.equal(config.model, 'deepseek-v4-flash');
});

test('loadEnv ignores legacy base_url and accepts DeepSeek-specific override', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-env-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, [
    'base_url=http://183.230.58.2:3000/v1',
    'deepseek_base_url=https://api.deepseek.com/beta',
    'api_key=secret-key'
  ].join('\n'));

  const config = loadEnv(envPath);

  assert.equal(config.baseUrl, 'https://api.deepseek.com/beta');
});
