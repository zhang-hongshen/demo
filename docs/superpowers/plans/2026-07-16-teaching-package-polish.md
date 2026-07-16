# Teaching Package Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn generated classroom results into an editable teaching package with section-level rewriting, tiered tasks, and exports that always use the current edited state.

**Architecture:** Keep `public/app.js` as the page coordinator and make result mutation a small pure browser module. Add a validated rewrite contract shared by the Node and Cloudflare API boundaries, then reuse the existing DeepSeek client pattern for section-level calls. Extend the existing normalized result object with optional `tieredTasks`; page rendering and all export paths read the same `currentResult` object.

**Tech Stack:** Node.js ESM, zero runtime dependencies, browser-native JavaScript modules, Node test runner, existing HTML/CSS/Word-PDF/PPT export modules, DeepSeek-compatible chat completions API.

## Global Constraints

- Keep the project zero-dependency and runnable with `npm test` and `npm start`.
- Keep the model and API key server-side; public files must not expose provider or model names.
- Keep result edits in browser memory only; do not add login, persistence, history, or collaboration.
- Accept only the five rewrite actions: `更简洁`, `更适合课堂互动`, `降低难度`, `提高难度`, `重新生成`.
- Accept only enumerated result targets and `text`/`lines` values; never patch an arbitrary JSON path from the request.
- Preserve existing `slides`, `grading`, and `analysis` feature entry points and sample fallback behavior.
- Reuse the existing `currentResult` export flow so Word, PDF, and PPT use edited values.
- Return safe browser-facing errors without API keys, authorization headers, provider names, model names, or raw upstream details.
- Run focused tests after each task and `npm test` before claiming completion.

## File Map

- Create `src/rewriteContract.js` for server-side rewrite instructions, target allowlist, request normalization, and value validation.
- Modify `src/promptBuilder.js` to request `tieredTasks` during slide generation and to build value-only rewrite prompts.
- Modify `src/deepseekClient.js` to normalize `tieredTasks` and expose rewrite request, response parsing, and timeout behavior.
- Modify `src/sampleResult.js` to provide realistic tiered tasks for the demo fallback.
- Modify `src/server.js` and create `functions/api/rewrite-section.js` for the local and Cloudflare rewrite endpoints.
- Create `public/resultEditor.js` for immutable target reads/writes and browser-side value validation.
- Modify `public/app.js` to render edit controls, manage revision-safe rewrites, preserve one-step undo, and keep exports on edited state.
- Modify `public/exportDocument.js` and `public/pptxExport.js` to include tiered tasks.
- Modify `public/styles.css` for compact editor and rewrite controls; modify `public/index.html` only if a stable result-toolbar or status hook is needed.
- Add or modify tests in `test/rewriteContract.test.js`, `test/promptBuilder.test.js`, `test/deepseekClient.test.js`, `test/server.test.js`, `test/cloudflareFunctions.test.js`, `test/resultEditor.test.js`, `test/frontend.test.js`, `test/exportDocument.test.js`, and `test/pptxExport.test.js`.

---

### Task 1: Define the rewrite contract and model interfaces

**Files:**
- Create: `src/rewriteContract.js`
- Modify: `src/promptBuilder.js`
- Modify: `src/deepseekClient.js`
- Test: `test/rewriteContract.test.js`
- Test: `test/promptBuilder.test.js`
- Test: `test/deepseekClient.test.js`

**Interfaces:**
- Produces `REWRITE_INSTRUCTIONS`, `REWRITE_TARGETS`, `validateRewriteRequest(input)`, `buildRewriteMessages(input)`, `buildRewriteRequest({ input, config })`, `parseRewritePayload(payload, valueType)`, and `rewriteTeachingSection({ input, config, fetchImpl, timeoutMs })`.
- `validateRewriteRequest` returns `{ ok: true, value }` with normalized input or `{ ok: false, error }`.
- `parseRewritePayload` returns a string for `text` and a string array for `lines`.
- `rewriteTeachingSection` resolves to only the rewritten value, not a full teaching result.

- [ ] **Step 1: Write failing contract tests.**

Add tests that establish the allowed target keys and reject unknown actions, unknown targets, wrong value types, missing indices, and oversized values. Cover these supported targets:

```js
const validTargets = [
  { feature: 'slides', target: { section: 'slideOutline', field: 'speakerNotes', index: 0, valueType: 'text' }, currentValue: '讲稿' },
  { feature: 'slides', target: { section: 'tieredTasks', field: 'basic', valueType: 'lines' }, currentValue: ['任务'] },
  { feature: 'grading', target: { section: 'assignmentReview', field: 'feedback', valueType: 'text' }, currentValue: '评语' },
  { feature: 'analysis', target: { section: 'learningAnalysis', field: 'interventions', valueType: 'lines' }, currentValue: ['建议'] }
];
```

Assert that `validateRewriteRequest({ ...validTargets[0], instruction: '更简洁', inputContext: { course: '数据结构' } }).ok` is `true`, while `instruction: '改写全部内容'` and `field: 'unknown'` return `ok: false`.

Add prompt assertions:

```js
const messages = buildRewriteMessages({
  feature: 'slides',
  target: { section: 'slideOutline', field: 'speakerNotes', index: 0, valueType: 'text' },
  currentValue: '讲解三种遍历方式。',
  instruction: '更适合课堂互动',
  inputContext: { course: '数据结构', topic: '二叉树遍历', classProfile: '本科二年级' }
});
const promptText = messages.map((message) => message.content).join('\n');
assert.match(promptText, /更适合课堂互动/);
assert.match(promptText, /讲解三种遍历方式/);
assert.match(promptText, /只输出.*value/);
```

Add DeepSeek parsing assertions for both `{"value":"新文本"}` and `{"value":["任务一","任务二"]}`, plus rejection of a wrong response type.

- [ ] **Step 2: Run focused tests and verify they fail.**

Run:

```bash
node --test test/rewriteContract.test.js test/promptBuilder.test.js test/deepseekClient.test.js
```

Expected: FAIL because the rewrite contract, rewrite prompt, and rewrite client exports do not exist, and the existing generation prompt does not mention `tieredTasks`.

- [ ] **Step 3: Implement the validated contract.**

Create `src/rewriteContract.js` with an explicit allowlist. The allowlist must include these keys and no others:

```js
export const REWRITE_INSTRUCTIONS = Object.freeze([
  '更简洁',
  '更适合课堂互动',
  '降低难度',
  '提高难度',
  '重新生成'
]);

export const REWRITE_TARGETS = Object.freeze({
  'slides:teachingPlan.objectives': { valueType: 'lines', index: false },
  'slides:teachingPlan.keyPoints': { valueType: 'lines', index: false },
  'slides:teachingPlan.classFlow.activity': { valueType: 'text', index: true },
  'slides:teachingPlan.teacherActions': { valueType: 'lines', index: false },
  'slides:teachingPlan.studentActions': { valueType: 'lines', index: false },
  'slides:teachingPlan.assessment': { valueType: 'text', index: false },
  'slides:slideOutline.title': { valueType: 'text', index: true },
  'slides:slideOutline.speakerNotes': { valueType: 'text', index: true },
  'slides:quiz.question': { valueType: 'text', index: true },
  'slides:quiz.answer': { valueType: 'text', index: true },
  'slides:quiz.explanation': { valueType: 'text', index: true },
  'slides:tieredTasks.basic': { valueType: 'lines', index: false },
  'slides:tieredTasks.advanced': { valueType: 'lines', index: false },
  'slides:tieredTasks.challenge': { valueType: 'lines', index: false },
  'slides:pitchScript': { valueType: 'text', index: false },
  'grading:assignmentReview.score': { valueType: 'text', index: false },
  'grading:assignmentReview.level': { valueType: 'text', index: false },
  'grading:assignmentReview.strengths': { valueType: 'lines', index: false },
  'grading:assignmentReview.issues': { valueType: 'lines', index: false },
  'grading:assignmentReview.rubric.criterion': { valueType: 'text', index: true },
  'grading:assignmentReview.rubric.score': { valueType: 'text', index: true },
  'grading:assignmentReview.rubric.comment': { valueType: 'text', index: true },
  'grading:assignmentReview.feedback': { valueType: 'text', index: false },
  'grading:assignmentReview.improvementTasks': { valueType: 'lines', index: false },
  'analysis:learningAnalysis.misconceptions': { valueType: 'lines', index: false },
  'analysis:learningAnalysis.riskGroups': { valueType: 'lines', index: false },
  'analysis:learningAnalysis.interventions': { valueType: 'lines', index: false },
  'analysis:learningAnalysis.dataIndicators': { valueType: 'lines', index: false }
});
```

`validateRewriteRequest` must require a known feature, known target key, matching `valueType`, a non-negative integer `index` when the target requires one, a non-empty instruction from `REWRITE_INSTRUCTIONS`, a non-empty current value, and `inputContext` limited to the existing course/topic/class profile fields. Cap text at 4,200 characters, lists at 20 items, and each list item at 500 characters.

- [ ] **Step 4: Extend the generation prompt and result normalization.**

In `src/promptBuilder.js`, add `tieredTasks` to the slides guidance and the required JSON example:

```text
tieredTasks: { basic, advanced, challenge }
```

Add `buildRewriteMessages(input)` that first calls `validateRewriteRequest`, includes the feature label, target label, current value, course/topic/class profile context, and instruction, then ends with:

```text
只输出JSON对象，格式必须是 {"value":"..."} 或 {"value":["..."]}，不要输出Markdown、解释或其他字段。
```

In `src/deepseekClient.js`, add `normalizeTieredTasks` using the existing array normalization style and include it in `normalizeTeachingResult`. Add rewrite request construction with the existing base URL, authorization, JSON response format, disabled thinking, non-streaming request, and a 1,200 token cap. The rewrite parser must strip an optional JSON code fence, parse `value`, validate its type, and throw a useful internal error when the value is absent or malformed.

- [ ] **Step 5: Run focused tests and verify they pass.**

Run:

```bash
node --test test/rewriteContract.test.js test/promptBuilder.test.js test/deepseekClient.test.js
```

Expected: PASS, including existing generation tests and new contract, prompt, normalization, parser, timeout, and request-shape tests.

- [ ] **Step 6: Commit the contract and client changes.**

```bash
git add src/rewriteContract.js src/promptBuilder.js src/deepseekClient.js test/rewriteContract.test.js test/promptBuilder.test.js test/deepseekClient.test.js
git commit -m "Add teaching result rewrite contract"
```

### Task 2: Add safe Node and Cloudflare rewrite endpoints

**Files:**
- Modify: `src/server.js`
- Create: `functions/api/rewrite-section.js`
- Test: `test/server.test.js`
- Test: `test/cloudflareFunctions.test.js`

**Interfaces:**
- Node `createServer({ rewrite })` accepts an injected `rewrite(input)` function for tests; the default calls `rewriteTeachingSection({ input, config })`.
- `POST /api/rewrite-section` returns `{ ok: true, value }` on success, `400` with `{ ok: false, error: '重写参数无效。' }` for validation errors, and `502` with `{ ok: false, error: '内容重写暂时不可用，请稍后重试。' }` for model failures.
- Cloudflare `handleRewriteRequest({ request, env, rewrite, logger })` follows the same response contract and `onRequestPost(context)` calls the real client.

- [ ] **Step 1: Write failing endpoint tests.**

Add a Node integration test that injects:

```js
rewrite: async (input) => {
  assert.equal(input.instruction, '更简洁');
  return '精简后的讲稿。';
}
```

POST a valid `slideOutline.speakerNotes` target and assert status `200`, `json.ok === true`, and `json.value === '精简后的讲稿。'`. Add tests for an unknown target returning `400` without invoking the injected rewrite and an injected error returning the exact safe `502` message without the secret.

Add equivalent Cloudflare tests through `handleRewriteRequest`, including `env.api_key` being passed to the injected rewrite config and the safe error response.

- [ ] **Step 2: Run endpoint tests and verify they fail.**

Run:

```bash
node --test test/server.test.js test/cloudflareFunctions.test.js
```

Expected: FAIL because the route, handler, and function file do not exist.

- [ ] **Step 3: Implement the Node route.**

In `src/server.js`, import `rewriteTeachingSection` and `validateRewriteRequest`, create a `rewrite` option next to the existing `generate` option, and add this branch before the static GET handling:

```js
if (request.method === 'POST' && url.pathname === '/api/rewrite-section') {
  try {
    const input = await readJson(request);
    const validation = validateRewriteRequest(input);
    if (!validation.ok) {
      sendJson(response, 400, { ok: false, error: '重写参数无效。' });
      return;
    }
    const value = await rewrite(validation.value);
    sendJson(response, 200, { ok: true, value });
  } catch (error) {
    sendJson(response, 502, { ok: false, error: '内容重写暂时不可用，请稍后重试。' });
  }
  return;
}
```

The default option must be `input => rewriteTeachingSection({ input, config })`. Keep the existing generate route and `safeGenerateError` unchanged.

- [ ] **Step 4: Implement the Cloudflare handler.**

Create `functions/api/rewrite-section.js` with a JSON response helper, the same `REWRITE_ERROR` constant, validation before model invocation, and sanitized operator logging. The exported functions must have these shapes:

```js
export async function handleRewriteRequest({ request, env = {}, rewrite, logger = console }) {}

export async function onRequestPost(context) {
  return handleRewriteRequest({
    request: context.request,
    env: context.env,
    rewrite: (input, config) => rewriteTeachingSection({ input, config })
  });
}
```

Do not return the caught error message to the browser. Log only a sanitized diagnostic with an event name such as `rewrite_failed`.

- [ ] **Step 5: Run endpoint tests and verify they pass.**

Run:

```bash
node --test test/server.test.js test/cloudflareFunctions.test.js
```

Expected: PASS, including the existing generate and sample endpoint tests.

- [ ] **Step 6: Commit the endpoint changes.**

```bash
git add src/server.js functions/api/rewrite-section.js test/server.test.js test/cloudflareFunctions.test.js
git commit -m "Add teaching section rewrite endpoints"
```

### Task 3: Add tiered tasks to sample output and exports

**Files:**
- Modify: `src/sampleResult.js`
- Modify: `public/exportDocument.js`
- Modify: `public/pptxExport.js`
- Test: `test/exportDocument.test.js`
- Test: `test/pptxExport.test.js`
- Test: `test/server.test.js`
- Test: `test/cloudflareFunctions.test.js`

**Interfaces:**
- `sampleResult.tieredTasks` is always an object with `basic`, `advanced`, and `challenge` arrays.
- `buildExportHtml({ result, input, feature: 'slides' })` contains a `课后分层任务` section with all three labels.
- `slideModel({ result, input })` adds a slide titled `课后分层任务` with basic, advanced, and challenge bullets before `演示话术`.

- [ ] **Step 1: Write failing export tests.**

Add a fixture with:

```js
tieredTasks: {
  basic: ['补做核心概念题'],
  advanced: ['完成一道变式题'],
  challenge: ['迁移到校园场景']
}
```

Assert that document HTML includes `课后分层任务`, all three task labels, and `迁移到校园场景`. Assert that `buildPptx` output contains the UTF-8 text `课后分层任务` and the three task strings. Assert that `/api/sample` and the Cloudflare sample response expose all three arrays.

- [ ] **Step 2: Run export tests and verify they fail.**

Run:

```bash
node --test test/exportDocument.test.js test/pptxExport.test.js test/server.test.js test/cloudflareFunctions.test.js
```

Expected: FAIL because the sample and export model do not yet include tiered tasks.

- [ ] **Step 3: Add normalized sample data.**

Add this top-level field to `src/sampleResult.js`:

```js
tieredTasks: {
  basic: ['完成一道核心概念辨析题', '根据示例树写出中序遍历'],
  advanced: ['解释一次递归调用栈变化', '完成一道遍历顺序变式题'],
  challenge: ['把遍历规则迁移到校园组织架构数据', '设计一道能区分三类遍历的题目']
},
```

- [ ] **Step 4: Extend document and PPT models.**

In `public/exportDocument.js`, add a `renderTieredTasks(tasks = {})` helper that renders three headings and uses the existing `arrayItems` helper. Insert it after `renderQuiz` in the slides feature and in the all-features export.

In `public/pptxExport.js`, add a `tieredTasks` slide model item before the pitch slide:

```js
{
  title: '课后分层任务',
  bullets: [
    `基础巩固：${bulletItems(result.tieredTasks?.basic, 3).join('；') || '暂无内容'}`,
    `能力提升：${bulletItems(result.tieredTasks?.advanced, 3).join('；') || '暂无内容'}`,
    `挑战拓展：${bulletItems(result.tieredTasks?.challenge, 3).join('；') || '暂无内容'}`
  ]
}
```

Keep the existing raw-text branch unchanged and keep empty arrays renderable as `暂无内容`.

- [ ] **Step 5: Run export tests and verify they pass.**

Run:

```bash
node --test test/exportDocument.test.js test/pptxExport.test.js test/server.test.js test/cloudflareFunctions.test.js
```

Expected: PASS, with existing export and sample behavior unchanged.

- [ ] **Step 6: Commit sample and export changes.**

```bash
git add src/sampleResult.js public/exportDocument.js public/pptxExport.js test/exportDocument.test.js test/pptxExport.test.js test/server.test.js test/cloudflareFunctions.test.js
git commit -m "Add tiered teaching tasks to exports"
```

### Task 4: Create pure browser result editing helpers

**Files:**
- Create: `public/resultEditor.js`
- Test: `test/resultEditor.test.js`

**Interfaces:**
- `cloneResult(result)` returns a detached result object.
- `targetPath(target)` converts `{ section, field, index }` to an array path without accepting arbitrary caller-provided path arrays.
- `readResultTarget(result, target)` returns the current target value.
- `updateResultTarget(result, target, value)` returns a new result object and never mutates its input.
- `isRewriteValue(value, valueType)` returns a boolean for `text` and `lines` response shapes.
- `normalizeEditorLines(value)` converts textarea content into trimmed non-empty lines.

- [ ] **Step 1: Write failing helper tests.**

Use this fixture:

```js
const result = {
  slideOutline: [{ title: '规则', speakerNotes: '原讲稿' }],
  tieredTasks: { basic: ['原任务'], advanced: [], challenge: [] }
};
```

Assert that `readResultTarget(result, { section: 'slideOutline', field: 'speakerNotes', index: 0 })` returns `原讲稿`, `updateResultTarget` returns a new object with `新讲稿`, and `result` remains unchanged. Assert that a lines target returns an array, `normalizeEditorLines(' 一\n\n二 ')` returns `['一', '二']`, and wrong types return `false` from `isRewriteValue`.

- [ ] **Step 2: Run the helper test and verify it fails.**

Run:

```bash
node --test test/resultEditor.test.js
```

Expected: FAIL because `public/resultEditor.js` does not exist.

- [ ] **Step 3: Implement immutable target operations.**

Implement `targetPath` with this deterministic rule:

```js
export function targetPath(target) {
  const fieldParts = String(target.field || '').split('.').filter(Boolean);
  if (!Number.isInteger(target.index)) return [target.section, ...fieldParts];
  if (fieldParts.length === 1) return [target.section, target.index, ...fieldParts];
  return [target.section, fieldParts[0], target.index, ...fieldParts.slice(1)];
}
```

This makes `slideOutline.speakerNotes` resolve to `['slideOutline', 0, 'speakerNotes']`, `teachingPlan.classFlow.activity` resolve to `['teachingPlan', 'classFlow', 0, 'activity']`, and `assignmentReview.rubric.comment` resolve to `['assignmentReview', 'rubric', 0, 'comment']`. Add tests for all three forms.

`readResultTarget` must traverse only that generated path. `updateResultTarget` must clone the result, walk to the parent, assign the value, and return the clone. `isRewriteValue` must accept only a string for `text` and an array of strings for `lines`; reject empty strings, nested arrays, objects, and numbers. Do not add browser DOM dependencies to this module.

- [ ] **Step 4: Run the helper test and verify it passes.**

Run:

```bash
node --test test/resultEditor.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the pure editor module.**

```bash
git add public/resultEditor.js test/resultEditor.test.js
git commit -m "Add immutable teaching result editor helpers"
```

### Task 5: Render editable result controls and tiered tasks

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/frontend.test.js`

**Interfaces:**
- `public/app.js` imports `readResultTarget`, `updateResultTarget`, `isRewriteValue`, and `normalizeEditorLines` from `./resultEditor.js`.
- Each edit or rewrite control carries a JSON target in `data-result-target` and a value type in `data-value-type`.
- `renderResult()` remains the single rerender entry point and always renders from `currentResult`.
- The result surface handles edit, save, cancel, rewrite, and undo actions through event delegation.

- [ ] **Step 1: Write failing frontend tests for the new surface.**

Add static assertions that `public/app.js` contains the rewrite route, all five Chinese actions, `data-result-target`, and `tieredTasks`. Add a runtime test with a result box and a fake `fetch` that returns `{ ok: true, value: '重写内容' }`; click handling should update only the target field. Add a failure test where the rewrite fetch returns `{ ok: false, error: '内容重写暂时不可用，请稍后重试。' }` and assert the original value remains in `resultBox.innerHTML`.

Add a stale-response test: start a rewrite, mutate the target through the edit-save handler before resolving the rewrite promise, then resolve with an old value and assert the newer saved text remains.

- [ ] **Step 2: Run frontend tests and verify they fail.**

Run:

```bash
node --test test/frontend.test.js
```

Expected: FAIL because the app does not expose result target controls, rewrite requests, or tiered task rendering.

- [ ] **Step 3: Add rendering metadata and edit controls.**

In `public/app.js`, add helpers with these signatures:

```js
function targetData(target) {}
function renderEditableText({ label, value, target, valueType = 'text', multiline = false }) {}
function renderEditableLines({ label, value, target }) {}
function renderRewriteActions(target, valueType) {}
```

Use `targetData` to serialize only `{ section, field, index, valueType }` into `data-result-target`. Render a compact view state with an `编辑` button and the five rewrite actions. When editing, render an input or textarea plus `保存` and `取消`; for lines, join the array with `\n`.

Update each feature renderer to attach targets to its text-bearing fields. At minimum, cover the exact allowlist from `src/rewriteContract.js`: teaching plan, slide outline, quiz, tiered tasks, pitch script, assignment review, rubric fields, and analysis lists. Keep the existing metric summaries and empty-state text.

Add a `renderTieredTasks(tasks = {})` renderer after `renderQuiz` with three editable list groups:

```js
function renderTieredTasks(tasks = {}) {
  return `
    <section class="content-section tiered-tasks">
      <h3>课后分层任务</h3>
      ${renderEditableLines({ label: '基础巩固', value: tasks.basic, target: { section: 'tieredTasks', field: 'basic' } })}
      ${renderEditableLines({ label: '能力提升', value: tasks.advanced, target: { section: 'tieredTasks', field: 'advanced' } })}
      ${renderEditableLines({ label: '挑战拓展', value: tasks.challenge, target: { section: 'tieredTasks', field: 'challenge' } })}
    </section>
  `;
}
```

Insert it into `renderSlidesFeature` after the quiz and before the pitch.

- [ ] **Step 4: Add delegated edit and rewrite state handling.**

Track these browser-only values next to `currentResult`:

```js
let resultRevision = 0;
const pendingRewriteKeys = new Set();
let lastRewrite = null;
```

On generation or sample load, increment `resultRevision`, clear `lastRewrite`, and render. On save, parse the input according to `data-value-type`, call `updateResultTarget`, increment `resultRevision`, and render. Keep the previous target value in `lastRewrite` with its revision for one-step undo.

Add `requestRewrite(target, instruction)` that sends:

```js
{
  feature: activeFeature,
  target,
  currentValue: readResultTarget(currentResult, target),
  instruction,
  inputContext: {
    course: formPayload().course,
    topic: formPayload().topic,
    classProfile: formPayload().classProfile
  }
}
```

Before applying a response, require that the target key is still pending, the captured `resultRevision` matches the current revision, and `isRewriteValue(value, target.valueType)` is true. If any condition fails, remove the pending key and show `内容已变化，本次重写未应用。` without changing the result. On fetch failure, keep the old value and show the server error. Always remove the key in `finally` and rerender the affected controls.

Attach one click listener and one submit listener to `resultBox`; do not bind listeners inside every rendered item. Handle `data-result-action="rewrite"`, `data-result-action="undo"`, edit form submission, save, and cancel. Keep export functions unchanged except for their existing `currentResult` reference.

- [ ] **Step 5: Add focused CSS for controls and statuses.**

Add styles in `public/styles.css` for `.result-editable`, `.result-editor`, `.result-actions`, `.rewrite-menu`, `.rewrite-status`, and `.undo-rewrite`. Keep buttons compact, preserve stable result layout, use existing border and blue accent variables, and ensure controls wrap on narrow screens. Do not introduce a new gradient, oversized hero treatment, or a card inside a card.

- [ ] **Step 6: Run frontend tests and verify they pass.**

Run:

```bash
node --test test/frontend.test.js test/resultEditor.test.js
```

Expected: PASS, including existing security/copy/layout tests and new edit, rewrite failure, and stale response tests.

- [ ] **Step 7: Commit the result editing UI.**

```bash
git add public/app.js public/styles.css test/frontend.test.js
git commit -m "Add editable teaching result workflow"
```

### Task 6: Connect edited state to all export paths

**Files:**
- Modify: `public/exportDocument.js`
- Modify: `public/pptxExport.js`
- Modify: `public/app.js`
- Test: `test/exportDocument.test.js`
- Test: `test/pptxExport.test.js`
- Test: `test/frontend.test.js`

**Interfaces:**
- `exportHtml()` continues to call `buildExportHtml({ result: currentResult, input: exportInput(), feature: activeFeature })`.
- `exportPpt()` continues to call `buildPptx({ result: currentResult, input, themeId })`.
- No export function may read the original API payload, a stale render string, or form fields for generated content.

- [ ] **Step 1: Write failing current-state export tests.**

Add export fixtures where the original value is `原始讲稿` and the edited value is `编辑后的讲稿`, then assert only the edited result is passed into document/PPT builders. Add a frontend test that changes `currentResult` through the edit-save flow and invokes the existing export path with a spy builder; assert the spy receives the edited `speakerNotes` and `tieredTasks.basic`.

- [ ] **Step 2: Run export tests and verify the new assertions fail.**

Run:

```bash
node --test test/exportDocument.test.js test/pptxExport.test.js test/frontend.test.js
```

Expected: FAIL only for the new edited-state assertions if an export path still holds a stale snapshot or omits tiered tasks.

- [ ] **Step 3: Remove stale export reads.**

Keep export calls based on the live `currentResult` variable and ensure any renderer or closure used by export receives the object at call time. The required call sites are:

```js
function exportHtml() {
  return buildExportHtml({ result: currentResult, input: exportInput(), feature: activeFeature });
}

function exportPpt(themeId = selectedPptTheme) {
  if (!currentResult || activeFeature !== 'slides') return;
  updateThemeSelection(themeId);
  const input = exportInput();
  const bytes = buildPptx({ result: currentResult, input, themeId: selectedPptTheme });
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), pptFileName(input));
}
```

Do not duplicate edit state in the export module.

- [ ] **Step 4: Run export tests and verify they pass.**

Run:

```bash
node --test test/exportDocument.test.js test/pptxExport.test.js test/frontend.test.js
```

Expected: PASS, including edited values, tiered task output, and existing export format behavior.

- [ ] **Step 5: Commit export wiring.**

```bash
git add public/exportDocument.js public/pptxExport.js public/app.js test/exportDocument.test.js test/pptxExport.test.js test/frontend.test.js
git commit -m "Export the edited teaching package state"
```

### Task 7: Run full verification and perform manual acceptance

**Files:**
- Modify: `docs/demo-script.md` only if the existing demo script has a generated-result sequence that becomes inaccurate.
- Test: all existing tests under `test/`.

**Interfaces:**
- The completed feature is verified through the existing `npm test` command and the local server at `http://localhost:5173` or another available port.

- [ ] **Step 1: Run the complete automated suite.**

Run:

```bash
npm test
```

Expected: all tests pass with zero failures, including prompt, client, endpoint, frontend, document, and PPT tests.

- [ ] **Step 2: Check JavaScript syntax and repository diff.**

Run:

```bash
node --check src/rewriteContract.js
node --check src/deepseekClient.js
node --check src/server.js
node --check public/resultEditor.js
node --check public/app.js
git diff --check
```

Expected: all syntax checks exit `0`, and `git diff --check` prints no whitespace errors.

- [ ] **Step 3: Start the local demo server.**

Run:

```bash
npm start
```

Expected: the server logs `智教方案生成台 running at http://localhost:5173` or reports the configured alternate port if `5173` is occupied.

- [ ] **Step 4: Manually verify the teacher workflow.**

In the browser:

1. Load the sample result and edit a slide title, a quiz answer, and one basic task; switch to another feature and back; confirm all edits remain.
2. Run a rewrite on one slide note with `更适合课堂互动`; confirm only that note changes and the undo control restores the previous text.
3. Trigger a rewrite failure by using a server without a configured key; confirm the original text remains and the error is safe.
4. Export Word, PDF, and PPT from the edited slides result; confirm the edited text and all three tiered task groups appear.
5. Check a grading and an analysis result to confirm their existing views still render and their text fields expose only the supported target controls.

- [ ] **Step 5: Review the final diff and commit any documentation correction.**

Run:

```bash
git status --short
git diff --stat
```

If the demo script needed an update, run:

```bash
git add docs/demo-script.md
git commit -m "Update teaching workflow demo script"
```

Expected: no unintended files are changed and the final working tree contains only intentional implementation or documentation changes.
