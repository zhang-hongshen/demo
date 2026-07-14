import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportHtml, exportFileName } from '../public/exportDocument.js';

test('buildExportHtml renders all generated sections for document export', () => {
  const html = buildExportHtml({
    result: {
      teachingPlan: {
        objectives: ['理解递归边界'],
        keyPoints: ['遍历顺序'],
        classFlow: [{ stage: '导入', minutes: 5, activity: '展示样例树' }],
        teacherActions: ['追问递归出口'],
        studentActions: ['写出遍历序列'],
        assessment: '提交课堂练习'
      },
      slideOutline: [{ title: '二叉树遍历', speakerNotes: '讲解三种遍历方式' }],
      quiz: [{ type: '单选', question: '前序遍历先访问什么？', answer: '根节点', explanation: '前序为根左右' }],
      learningAnalysis: {
        misconceptions: ['混淆中序和后序'],
        riskGroups: ['递归基础薄弱学生'],
        interventions: ['用调用栈图示辅助'],
        dataIndicators: ['练习正确率']
      },
      assignmentReview: {
        score: '86',
        level: '良好',
        strengths: ['遍历序列完整'],
        issues: ['递归边界解释不够充分'],
        rubric: [{ criterion: '遍历序列', score: '55/60', comment: '序列基本正确' }],
        feedback: '整体掌握较好。',
        improvementTasks: ['补写递归终止条件']
      },
      pitchScript: '本方案覆盖课前、课中、课后。'
    },
    input: {
      course: '数据结构',
      topic: '二叉树遍历<script>alert(1)</script>',
      duration: '45分钟'
    }
  });

  assert.match(html, /课堂方案/);
  assert.match(html, /数据结构/);
  assert.match(html, /二叉树遍历/);
  assert.match(html, /教案/);
  assert.match(html, /课件大纲/);
  assert.match(html, /随堂测验/);
  assert.match(html, /学情分析/);
  assert.match(html, /作业批改/);
  assert.match(html, /86/);
  assert.match(html, /遍历序列完整/);
  assert.match(html, /补写递归终止条件/);
  assert.match(html, /演示稿/);
  assert.match(html, /理解递归边界/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('exportFileName creates a safe Chinese file name', () => {
  assert.equal(exportFileName({ course: '数据结构/算法', topic: '二叉树:遍历' }, 'doc'), '课堂方案-数据结构-算法-二叉树-遍历.doc');
});

test('buildExportHtml can render only the selected feature', () => {
  const html = buildExportHtml({
    feature: 'grading',
    result: {
      slideOutline: [{ title: '课件页', speakerNotes: '课件内容' }],
      learningAnalysis: { misconceptions: ['学情内容'] },
      assignmentReview: {
        score: '92',
        level: '优秀',
        strengths: ['论证清楚'],
        issues: ['格式可优化'],
        rubric: [{ criterion: '准确性', score: '60/60', comment: '答案正确' }],
        feedback: '整体完成质量高。',
        improvementTasks: ['统一符号格式']
      }
    },
    input: { course: '数据结构', topic: '二叉树遍历' }
  });

  assert.match(html, /作业批改/);
  assert.match(html, /92/);
  assert.match(html, /统一符号格式/);
  assert.doesNotMatch(html, /课件页/);
  assert.doesNotMatch(html, /学情内容/);
});
