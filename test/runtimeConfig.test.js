import test from 'node:test';
import assert from 'node:assert/strict';
import { configFromEnv } from '../src/runtimeConfig.js';

test('configFromEnv builds runtime config from Cloudflare bindings', () => {
  const config = configFromEnv({ api_key: 'secret-key' });

  assert.equal(config.baseUrl, 'https://api.deepseek.com');
  assert.equal(config.apiKey, 'secret-key');
  assert.equal(config.model, 'deepseek-v4-flash');
});

test('configFromEnv accepts explicit endpoint and key overrides but fixes model', () => {
  const config = configFromEnv({
    deepseek_base_url: 'https://example.test/v1',
    deepseek_api_key: 'named-secret',
    deepseek_model: 'deepseek-v4-pro',
    MODEL: 'custom-model'
  });

  assert.equal(config.baseUrl, 'https://example.test/v1');
  assert.equal(config.apiKey, 'named-secret');
  assert.equal(config.model, 'deepseek-v4-flash');
});
