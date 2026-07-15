# Campus AI Teaching Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable localhost demo named 智教方案生成台 that uses DeepSeek official API credentials from `.env` to generate a university teaching package.

**Architecture:** Use a zero-dependency Node.js HTTP server so the demo runs in the restricted workspace without npm downloads. Browser code renders the working demo, and server-side modules keep `.env`, prompt construction, DeepSeek calls, sample fallback, and HTTP routing separated.

**Tech Stack:** Node.js 26 built-in `node:test`, built-in `http`, built-in `fetch`, browser HTML/CSS/JavaScript.

## Global Constraints

- The app opens directly to the working demo, not a marketing landing page.
- `.env` remains server-only and is never exposed to browser code.
- Backend reads `deepseek_base_url` and `api_key`; the model is fixed to `deepseek-v4-flash`.
- Output tabs are 教案, 课件大纲, 随堂测验, 学情分析, and 演示话术.
- Error responses must not leak API keys.
- Include sample fallback output so the presenter can keep the demo moving.
- The current workspace is not a git repository, so commit steps are skipped unless git is initialized later.

---

## File Structure

- Create `package.json`: npm scripts for `start` and `test`.
- Create `src/env.js`: minimal `.env` parser and config loader.
- Create `src/promptBuilder.js`: converts form input into DeepSeek messages.
- Create `src/sampleResult.js`: local polished demo result.
- Create `src/deepseekClient.js`: DeepSeek request builder, JSON parsing, and API call.
- Create `src/server.js`: zero-dependency static file server and API routes.
- Create `public/index.html`: accessible, first-screen working demo.
- Create `public/styles.css`: campus dashboard visual design.
- Create `public/app.js`: browser state, API calls, tabs, and sample fallback.
- Create `docs/demo-script.md`:现场演示话术 and operating notes.
- Create `test/promptBuilder.test.js`: prompt behavior tests.
- Create `test/deepseekClient.test.js`: DeepSeek request and response parsing tests.
- Create `test/server.test.js`: HTTP API sample and safety tests.

---

### Task 1: Prompt Builder And Sample Result

**Files:**
- Create: `package.json`
- Create: `src/promptBuilder.js`
- Create: `src/sampleResult.js`
- Test: `test/promptBuilder.test.js`

**Interfaces:**
- Produces: `buildTeachingMessages(input: object): Array<{ role: string, content: string }>`
- Produces: `sampleResult: object`

- [ ] **Step 1: Write the failing prompt builder test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeachingMessages } from '../src/promptBuilder.js';

test('buildTeachingMessages includes campus teaching context and all teacher inputs', () => {
  const messages = buildTeachingMessages({
    course: '数据结构',
    topic: '二叉树遍历',
    classProfile: '软件工程大二，48人',
    painPoints: '递归理解弱，课堂互动少',
    objectives: '掌握前序、中序、后序遍历',
    duration: '45分钟',
    outputStyle: '竞标答辩演示'
  });

  const text = messages.map((message) => message.content).join('\n');

  assert.equal(messages[0].role, 'system');
  assert.match(text, /高校/);
  assert.match(text, /数据结构/);
  assert.match(text, /二叉树遍历/);
  assert.match(text, /软件工程大二，48人/);
  assert.match(text, /递归理解弱，课堂互动少/);
  assert.match(text, /掌握前序、中序、后序遍历/);
  assert.match(text, /45分钟/);
  assert.match(text, /teachingPlan/);
  assert.match(text, /slideOutline/);
  assert.match(text, /quiz/);
  assert.match(text, /learningAnalysis/);
  assert.match(text, /pitchScript/);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- test/promptBuilder.test.js`

Expected: FAIL with a module not found error for `src/promptBuilder.js`.

- [ ] **Step 3: Implement package, prompt builder, and sample result**

Create `package.json` with:

```json
{
  "name": "campus-ai-deepseek-v4-flash",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test"
  }
}
```

Create `src/promptBuilder.js` with:

```js
export function buildTeachingMessages(input) {
  const normalized = {
    course: input.course || '人工智能导论',
    topic: input.topic || '生成式AI在校园中的应用',
    classProfile: input.classProfile || '本科二年级，45人',
    painPoints: input.painPoints || '基础差异大，课堂互动不足',
    objectives: input.objectives || '理解核心概念并完成课堂练习',
    duration: input.duration || '45分钟',
    outputStyle: input.outputStyle || '校方领导现场演示'
  };

  return [
    {
      role: 'system',
      content: [
        '你是中国移动面向高校客户的AI教学方案专家。',
        '请围绕高校真实教学、信息化建设和校企合作场景生成可直接演示的中文内容。',
        '只输出JSON，不要使用Markdown代码块。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '请根据以下需求生成“智教方案生成台”的演示结果。',
        `课程名称：${normalized.course}`,
        `本节主题：${normalized.topic}`,
        `班级画像：${normalized.classProfile}`,
        `学生痛点：${normalized.painPoints}`,
        `教学目标：${normalized.objectives}`,
        `课堂时长：${normalized.duration}`,
        `输出风格：${normalized.outputStyle}`,
        '返回JSON字段必须包含：',
        'teachingPlan: { objectives, keyPoints, classFlow, teacherActions, studentActions, assessment }',
        'slideOutline: [{ title, speakerNotes }]',
        'quiz: [{ type, question, answer, explanation }]',
        'learningAnalysis: { misconceptions, riskGroups, interventions, dataIndicators }',
        'pitchScript: string'
      ].join('\n')
    }
  ];
}
```

Create `src/sampleResult.js` with:

```js
export const sampleResult = {
  teachingPlan: {
    objectives: [
      '理解二叉树前序、中序、后序遍历的执行顺序',
      '能够根据遍历序列还原核心思路',
      '完成一次小组协作的课堂练习'
    ],
    keyPoints: ['递归边界', '访问根节点时机', '遍历序列与树结构关系'],
    classFlow: [
      { stage: '导入', minutes: 5, activity: '用校园组织架构图引出树结构' },
      { stage: '讲解', minutes: 15, activity: '对比三种遍历顺序并动态演示' },
      { stage: '练习', minutes: 15, activity: '学生分组完成遍历序列推导' },
      { stage: '反馈', minutes: 10, activity: 'AI汇总高频错误并给出补救练习' }
    ],
    teacherActions: ['展示样例树', '追问递归出口', '点评小组答案'],
    studentActions: ['标注访问顺序', '提交随堂答案', '互评推导过程'],
    assessment: '以5题随堂测验和小组讲解准确率判断掌握情况。'
  },
  slideOutline: [
    { title: '课堂目标与真实问题', speakerNotes: '把抽象结构转为学生熟悉的校园层级。' },
    { title: '二叉树遍历规则', speakerNotes: '突出根节点访问时机差异。' },
    { title: '递归执行过程', speakerNotes: '用颜色标记调用栈变化。' },
    { title: '课堂练习任务', speakerNotes: '分组完成一棵树的三类遍历。' },
    { title: 'AI学情分析', speakerNotes: '展示错误分布和补救建议。' },
    { title: '课后巩固路径', speakerNotes: '输出分层练习和答疑安排。' }
  ],
  quiz: [
    { type: '单选', question: '前序遍历最先访问哪个节点？', answer: '根节点', explanation: '前序遍历顺序为根、左、右。' },
    { type: '判断', question: '中序遍历一定先访问根节点。', answer: '错误', explanation: '中序遍历先访问左子树。' },
    { type: '简答', question: '后序遍历适合表达哪类处理？', answer: '先处理子节点再汇总父节点', explanation: '后序顺序为左、右、根。' },
    { type: '单选', question: '递归遍历必须明确什么？', answer: '递归边界', explanation: '没有边界会导致无限递归。' },
    { type: '应用', question: '请写出给定三节点树的中序遍历。', answer: '左、根、右', explanation: '按中序规则依次访问。' }
  ],
  learningAnalysis: {
    misconceptions: ['把前序和层序混淆', '忽略空子树递归边界', '只背顺序不理解调用过程'],
    riskGroups: ['程序基础薄弱学生', '缺课学生', '课堂练习提交过慢学生'],
    interventions: ['推送递归动画微课', '安排助教小组答疑', '为风险学生生成3道补救题'],
    dataIndicators: ['随堂测验正确率', '练习提交耗时', '错误类型分布', '课后复习完成率']
  },
  pitchScript: '老师输入课程主题和班级画像后，平台通过DeepSeek Flash生成教案、课件大纲、测验和学情分析，帮助高校把AI能力落到备课、授课、评测、补救的完整闭环。'
};
```

- [ ] **Step 4: Verify Task 1 passes**

Run: `npm test -- test/promptBuilder.test.js`

Expected: PASS.

---

### Task 2: DeepSeek Client And Environment Loading

**Files:**
- Create: `src/env.js`
- Create: `src/deepseekClient.js`
- Test: `test/deepseekClient.test.js`

**Interfaces:**
- Consumes: `buildTeachingMessages(input: object)`
- Produces: `loadEnv(filePath?: string): object`
- Produces: `buildDeepSeekRequest({ input, config }): { url: string, headers: object, body: object }`
- Produces: `parseDeepSeekPayload(payload: object): object`
- Produces: `generateTeachingPackage({ input, config, fetchImpl }): Promise<object>`

- [ ] **Step 1: Write failing DeepSeek client tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepSeekRequest, parseDeepSeekPayload, generateTeachingPackage } from '../src/deepseekClient.js';

test('buildDeepSeekRequest builds an OpenAI-compatible request without leaking raw key into body', () => {
  const request = buildDeepSeekRequest({
    input: { course: '数据结构', topic: '二叉树遍历' },
    config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' }
  });

  assert.equal(request.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(request.headers.Authorization, 'Bearer secret-key');
  assert.equal(request.body.model, 'deepseek-v4-flash');
  assert.doesNotMatch(JSON.stringify(request.body), /secret-key/);
});

test('parseDeepSeekPayload parses JSON content from chat completions response', () => {
  const parsed = parseDeepSeekPayload({
    choices: [
      {
        message: {
          content: JSON.stringify({ teachingPlan: { objectives: ['目标'] }, pitchScript: '话术' })
        }
      }
    ]
  });

  assert.deepEqual(parsed.teachingPlan.objectives, ['目标']);
  assert.equal(parsed.pitchScript, '话术');
});

test('generateTeachingPackage uses injected fetch implementation', async () => {
  const result = await generateTeachingPackage({
    input: { course: '数据结构', topic: '二叉树遍历' },
    config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.deepseek.com/chat/completions');
      assert.equal(options.method, 'POST');
      return {
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"pitchScript":"演示话术","teachingPlan":{"objectives":["目标"]}}' } }
          ]
        })
      };
    }
  });

  assert.equal(result.pitchScript, '演示话术');
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- test/deepseekClient.test.js`

Expected: FAIL with a module not found error for `src/deepseekClient.js`.

- [ ] **Step 3: Implement environment and DeepSeek client**

Create `src/env.js` with:

```js
import fs from 'node:fs';
import path from 'node:path';

export function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        if (index === -1) return [line, ''];
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      })
  );
}

export function loadEnv(filePath = path.resolve(process.cwd(), '.env')) {
  const fileValues = fs.existsSync(filePath) ? parseEnv(fs.readFileSync(filePath, 'utf8')) : {};
  return {
    baseUrl: process.env.deepseek_base_url || process.env.DEEPSEEK_BASE_URL || fileValues.deepseek_base_url || fileValues.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.deepseek_api_key || process.env.DEEPSEEK_API_KEY || process.env.api_key || process.env.API_KEY || fileValues.deepseek_api_key || fileValues.DEEPSEEK_API_KEY || fileValues.api_key || fileValues.API_KEY,
    model: 'deepseek-v4-flash'
  };
}
```

Create `src/deepseekClient.js` with:

```js
import { buildTeachingMessages } from './promptBuilder.js';

function joinUrl(baseUrl, suffix) {
  return `${baseUrl.replace(/\/+$/, '')}${suffix}`;
}

export function buildDeepSeekRequest({ input, config }) {
  if (!config?.baseUrl) throw new Error('Missing base_url in .env');
  if (!config?.apiKey) throw new Error('Missing api_key in .env');

  return {
    url: joinUrl(config.baseUrl, '/chat/completions'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: {
      model: config.model || 'deepseek-v4-flash',
      temperature: 0.4,
      messages: buildTeachingMessages(input)
    }
  };
}

export function parseDeepSeekPayload(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response did not include message content');
  }

  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { rawText: content };
  }
}

export async function generateTeachingPackage({ input, config, fetchImpl = fetch }) {
  const request = buildDeepSeekRequest({ input, config });
  const response = await fetchImpl(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status || 'unknown'}`);
  }

  return parseDeepSeekPayload(await response.json());
}
```

- [ ] **Step 4: Verify Task 2 passes**

Run: `npm test -- test/deepseekClient.test.js`

Expected: PASS.

---

### Task 3: HTTP Server API

**Files:**
- Create: `src/server.js`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `loadEnv()`
- Consumes: `generateTeachingPackage({ input, config, fetchImpl })`
- Consumes: `sampleResult`
- Produces: HTTP `GET /api/sample`
- Produces: HTTP `POST /api/generate`
- Produces: static file serving from `public/`

- [ ] **Step 1: Write failing server tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('GET /api/sample returns demo result', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/sample`);
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.ok(json.result.pitchScript.includes('DeepSeek Flash'));
  } finally {
    server.close();
  }
});

test('POST /api/generate returns safe error without API key', async () => {
  const server = createServer({
    config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' },
    generate: async () => {
      throw new Error('upstream failed with secret-key');
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
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
  } finally {
    server.close();
  }
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- test/server.test.js`

Expected: FAIL with a module not found error for `src/server.js`.

- [ ] **Step 3: Implement the HTTP server**

Create `src/server.js` with:

```js
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.js';
import { generateTeachingPackage } from './deepseekClient.js';
import { sampleResult } from './sampleResult.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function safeError(message) {
  if (!message) return '服务暂时不可用，请稍后重试。';
  return message.replace(/Bearer\s+\S+/gi, 'Bearer <redacted>').replace(/[A-Za-z0-9_-]{12,}/g, '<redacted>');
}

async function serveStatic(request, response) {
  const requestPath = new URL(request.url, 'http://localhost').pathname;
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { ok: false, error: 'Forbidden' });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    sendJson(response, 404, { ok: false, error: 'Not found' });
  }
}

export function createServer(options = {}) {
  const config = options.config || loadEnv();
  const generate = options.generate || ((input) => generateTeachingPackage({ input, config }));

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/api/sample') {
      sendJson(response, 200, { ok: true, result: sampleResult });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const input = await readJson(request);
        const result = await generate(input);
        sendJson(response, 200, { ok: true, result });
      } catch (error) {
        sendJson(response, 502, { ok: false, error: safeError(error.message) });
      }
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { ok: false, error: 'Method not allowed' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 5173);
  createServer().listen(port, () => {
    console.log(`智教方案生成台 running at http://localhost:${port}`);
  });
}
```

- [ ] **Step 4: Verify Task 3 passes**

Run: `npm test -- test/server.test.js`

Expected: PASS.

---

### Task 4: Frontend Demo And Documentation

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`
- Create: `docs/demo-script.md`

**Interfaces:**
- Consumes: `GET /api/sample`
- Consumes: `POST /api/generate`

- [ ] **Step 1: Create frontend files and demo script**

Create an HTML app with editable form fields for course, topic, class profile, pain points, objectives, duration, and output style. Add a primary 生成智教方案 button, a sample fallback button, and result tabs for 教案, 课件大纲, 随堂测验, 学情分析, and 演示话术.

Implement `public/app.js` so submit calls `/api/generate`, sample fallback calls `/api/sample`, loading disables the primary button, errors are shown in a status region, and successful results render into the active tab.

Create `docs/demo-script.md` with a concise现场演示话术, startup command, and fallback instruction.

- [ ] **Step 2: Run full automated tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Start the server**

Run: `npm start`

Expected: console prints `智教方案生成台 running at http://localhost:5173`.

- [ ] **Step 4: Manual API verification**

Run in another shell: request `http://localhost:5173/api/sample`.

Expected: JSON contains `ok: true` and `pitchScript`.

- [ ] **Step 5: Browser verification**

Open `http://localhost:5173`.

Expected: page shows the working demo, form fields are populated, tabs switch, sample fallback renders, and the UI does not expose `.env` values.
