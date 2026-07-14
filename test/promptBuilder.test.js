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

test('buildTeachingMessages includes assignment grading inputs and output contract', () => {
  const messages = buildTeachingMessages({
    course: '数据结构',
    topic: '二叉树遍历',
    assignmentTitle: '二叉树遍历练习',
    assignmentRequirement: '写出给定二叉树的前序、中序、后序遍历序列。',
    gradingRubric: '遍历序列60分，递归过程解释30分，书写规范10分。',
    studentSubmission: '前序：A B C；中序：B A C；后序：B C A。'
  });

  const text = messages.map((message) => message.content).join('\n');

  assert.match(text, /作业批改/);
  assert.match(text, /二叉树遍历练习/);
  assert.match(text, /遍历序列60分/);
  assert.match(text, /前序：A B C/);
  assert.match(text, /assignmentReview/);
  assert.match(text, /score/);
  assert.match(text, /improvementTasks/);
});

test('buildTeachingMessages includes uploaded reference materials when provided', () => {
  const messages = buildTeachingMessages({
    course: '数据结构',
    topic: '二叉树遍历',
    referenceMaterials: '资料一《课堂练习反馈》：学生普遍卡在递归边界。'
  });

  const text = messages.map((message) => message.content).join('\n');

  assert.match(text, /补充材料/);
  assert.match(text, /课堂练习反馈/);
  assert.match(text, /递归边界/);
});
