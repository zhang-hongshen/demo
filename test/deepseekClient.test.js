import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepSeekRequest, parseDeepSeekPayload, generateTeachingPackage } from '../src/deepseekClient.js';

test('buildDeepSeekRequest uses official DeepSeek Flash chat completions settings', () => {
  const request = buildDeepSeekRequest({
    input: { course: '数据结构', topic: '二叉树遍历' },
    config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' }
  });

  assert.equal(request.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(request.headers.Authorization, 'Bearer secret-key');
  assert.equal(request.body.model, 'deepseek-v4-flash');
  assert.deepEqual(request.body.response_format, { type: 'json_object' });
  assert.deepEqual(request.body.thinking, { type: 'disabled' });
  assert.equal(request.body.stream, false);
  assert.equal(request.body.max_tokens, 2500);
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

test('parseDeepSeekPayload normalizes common shape variations for the UI', () => {
  const parsed = parseDeepSeekPayload({
    choices: [
      {
        message: {
          content: JSON.stringify({
            teachingPlan: {
              objectives: '学生能够理解二叉树遍历。',
              keyPoints: '前序；中序；后序',
              classFlow: ['开场（3分钟）：引出二叉树遍历需求。'],
              teacherActions: '播放动画演示递归调用栈。',
              studentActions: '完成课堂小测。',
              assessment: '正确率目标80%。'
            },
            slideOutline: ['二叉树遍历：讲解三种顺序。'],
            quiz: [{ type: '单选', question: '前序顺序？', correctAnswer: '根左右', reason: '先根。' }],
            learningAnalysis: {
              misconceptions: '混淆遍历顺序。',
              riskGroups: '递归基础薄弱学生。',
              interventions: '提供递归展开图。',
              dataIndicators: '课堂小测正确率。'
            },
            pitchScript: '演示话术'
          })
        }
      }
    ]
  });

  assert.deepEqual(parsed.teachingPlan.objectives, ['学生能够理解二叉树遍历。']);
  assert.deepEqual(parsed.teachingPlan.keyPoints, ['前序', '中序', '后序']);
  assert.deepEqual(parsed.teachingPlan.classFlow[0], {
    stage: '开场',
    minutes: 3,
    activity: '引出二叉树遍历需求。'
  });
  assert.deepEqual(parsed.slideOutline[0], {
    title: '二叉树遍历',
    speakerNotes: '讲解三种顺序。'
  });
  assert.equal(parsed.quiz[0].answer, '根左右');
  assert.equal(parsed.quiz[0].explanation, '先根。');
  assert.deepEqual(parsed.learningAnalysis.misconceptions, ['混淆遍历顺序。']);
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

test('generateTeachingPackage includes upstream status and body in internal errors', async () => {
  await assert.rejects(
    () =>
      generateTeachingPackage({
        input: { course: '数据结构' },
        config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' },
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: { message: 'Insufficient Balance' } }), {
            status: 402,
            headers: { 'Content-Type': 'application/json' }
          })
      }),
    /status 402: \{"error":\{"message":"Insufficient Balance"\}\}/
  );
});

test('generateTeachingPackage times out slow DeepSeek requests', async () => {
  await assert.rejects(
    () => generateTeachingPackage({
      input: { course: '数据结构', topic: '二叉树遍历' },
      config: { baseUrl: 'https://api.deepseek.com', apiKey: 'secret-key', model: 'deepseek-v4-flash' },
      timeoutMs: 5,
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    }),
    /timed out/
  );
});
