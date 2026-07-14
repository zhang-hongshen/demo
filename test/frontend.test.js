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

test('selected text material is included in generation payload', async () => {
  const listeners = {};
  let materialChange;
  let requestBody = '';
  const resultBox = { innerHTML: '' };
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
  const materialSummary = { textContent: '' };
  const materialsInput = {
    files: [
      {
        name: '课堂反馈.txt',
        type: 'text/plain',
        text: async () => '学生普遍卡在递归边界。'
      }
    ],
    addEventListener(type, handler) {
      if (type === 'change') materialChange = handler;
    }
  };

  globalThis.document = {
    querySelector(selector) {
      return {
        '#request-form': form,
        '#generate-button': generateButton,
        '#sample-button': sampleButton,
        '#status': statusBox,
        '#result': resultBox,
        '#materials': materialsInput,
        '#material-summary': materialSummary
      }[selector];
    },
    querySelectorAll(selector) {
      return selector === '.tab' ? [tab] : [];
    }
  };
  globalThis.FormData = class {
    entries() {
      return [
        ['course', '数据结构'],
        ['materials', {}]
      ];
    }
  };
  globalThis.fetch = async (url, options) => {
    requestBody = options.body;
    return {
      json: async () => ({
        ok: true,
        result: { teachingPlan: { objectives: ['目标'] } }
      })
    };
  };

  await import(`../public/app.js?frontend-upload-test=${Date.now()}`);
  materialChange();
  listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const payload = JSON.parse(requestBody);
  assert.equal(payload.course, '数据结构');
  assert.equal(payload.materials, undefined);
  assert.match(payload.referenceMaterials, /课堂反馈/);
  assert.match(payload.referenceMaterials, /递归边界/);
  assert.match(materialSummary.textContent, /已加入 1 份材料/);
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

test('page copy is concise and formal', () => {
  const html = fs.readFileSync(path.join('public', 'index.html'), 'utf8');
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  assert.match(visibleText, /课堂方案/);
  assert.match(visibleText, /输入信息/);
  assert.match(visibleText, /生成结果/);
  assert.doesNotMatch(visibleText, /让备课成果更完整/);
  assert.doesNotMatch(visibleText, /面向备课、授课、测评、补救/);
  assert.doesNotMatch(visibleText, /课程背景 课堂目标 成果预览/);
  assert.doesNotMatch(visibleText, /流程清晰|可直接演示|闭环完整/);
  assert.doesNotMatch(visibleText, /文字材料会读取内容/);
});

test('stylesheet uses restrained Apple-style surfaces', () => {
  const css = fs.readFileSync(path.join('public', 'styles.css'), 'utf8');

  assert.match(css, /--page:\s*#f5f5f7/);
  assert.match(css, /--brand:\s*#0071e3/);
  assert.doesNotMatch(css, /linear-gradient\(120deg/);
  assert.doesNotMatch(css, /linear-gradient\(315deg/);
  assert.doesNotMatch(css, /--surface-warm|--surface-green|--gold/);
});

test('page provides a user-facing reference material picker', () => {
  const html = fs.readFileSync(path.join('public', 'index.html'), 'utf8');

  assert.match(html, /name="materials"/);
  assert.match(html, /补充材料/);
  assert.match(html, /id="material-summary"/);
});

test('page provides disabled export actions before content is generated', () => {
  const html = fs.readFileSync(path.join('public', 'index.html'), 'utf8');

  assert.match(html, /id="export-button"/);
  assert.match(html, /id="export-menu"/);
  assert.match(html, /data-export-format="word"/);
  assert.match(html, /data-export-format="pdf"/);
  assert.match(html, /data-export-format="ppt"/);
  assert.match(html, /id="theme-dialog"/);
  assert.match(html, /data-theme-id="formal-blue"/);
  assert.match(html, /data-theme-id="mobile-blue"/);
  assert.match(html, /正式蓝/);
  assert.match(html, /移动蓝/);
  assert.match(html, /id="export-button"[^>]*disabled/);
  assert.doesNotMatch(html, /id="ppt-theme"/);
  assert.doesNotMatch(html, /导出 Word/);
  assert.doesNotMatch(html, /导出 PDF/);
  assert.doesNotMatch(html, /导出 PPT/);
});
