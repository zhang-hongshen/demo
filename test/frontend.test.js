import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const providerPattern = /DeepSeek|deepseek|deepseek-v4-flash|api\.deepseek\.com|官方 API|模型/;

test('failed generation clears stale rendered output', async () => {
  const listeners = {};
  const resultBox = { innerHTML: '<p>old generated result</p>' };
  const statusBox = { textContent: '', className: 'status' };
  const generateButton = { disabled: false };
  const sampleButton = { addEventListener() {} };
  const form = {
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
  const tab = {
    dataset: { tab: 'teachingPlan' },
    addEventListener() {},
    classList: { toggle() {} }
  };

  globalThis.document = {
    querySelector(selector) {
      return {
        '#request-form': form,
        '#generate-button': generateButton,
        '#sample-button': sampleButton,
        '#status': statusBox,
        '#result': resultBox
      }[selector];
    },
    querySelectorAll(selector) {
      return selector === '.tab' ? [tab] : [];
    }
  };
  globalThis.FormData = class {
    entries() {
      return [];
    }
  };
  globalThis.fetch = async () => ({
    json: async () => ({ ok: false, error: '智能生成服务暂时不可用，请稍后重试或载入样例。' })
  });

  await import(`../public/app.js?frontend-test=${Date.now()}`);
  listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.doesNotMatch(resultBox.innerHTML, /old generated result/);
  assert.match(resultBox.innerHTML, /生成失败/);
  assert.match(resultBox.innerHTML, /智能生成服务暂时不可用/);
});

test('public UI files do not expose provider or model names', () => {
  const publicFiles = ['index.html', 'app.js'].map((file) => fs.readFileSync(path.join('public', file), 'utf8'));
  const combined = publicFiles.join('\n');

  assert.doesNotMatch(combined, providerPattern);
});
