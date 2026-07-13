import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const providerPattern = /DeepSeek|deepseek|deepseek-v4-flash|api\.deepseek\.com|官方 API|模型/;
const userFacingTechPattern = /\bAI\b|\bAPI\b|模型|接口|base url|DeepSeek|deepseek/i;

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
    json: async () => ({ ok: false, error: '方案服务暂时不可用，请稍后重试或查看样例。' })
  });

  await import(`../public/app.js?frontend-test=${Date.now()}`);
  listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.doesNotMatch(resultBox.innerHTML, /old generated result/);
  assert.match(resultBox.innerHTML, /暂时无法生成/);
  assert.match(resultBox.innerHTML, /方案服务暂时不可用/);
});

test('public UI files do not expose provider or model names', () => {
  const publicFiles = ['index.html', 'app.js'].map((file) => fs.readFileSync(path.join('public', file), 'utf8'));
  const combined = publicFiles.join('\n');

  assert.doesNotMatch(combined, providerPattern);
});

test('user-facing page copy avoids technical terms', () => {
  const html = fs.readFileSync(path.join('public', 'index.html'), 'utf8');
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  assert.doesNotMatch(visibleText, userFacingTechPattern);
});
