import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPptx, pptFileName, pptThemes } from '../public/pptxExport.js';

function zipEntryNames(bytes) {
  const buffer = Buffer.from(bytes);
  const names = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    names.push(name);
    offset += 30 + nameLength + extraLength + compressedSize;
  }
  return names;
}

function zipEntries(bytes) {
  const buffer = Buffer.from(bytes);
  const entries = new Map();
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    entries.set(name, buffer.subarray(dataStart, dataStart + compressedSize).toString('utf8'));
    offset = dataStart + compressedSize;
  }
  return entries;
}

test('pptThemes includes common built-in themes', () => {
  assert.deepEqual(
    pptThemes.map((theme) => theme.id),
    ['formal-blue', 'academic-green', 'minimal-mono', 'vitality-orange', 'mobile-blue']
  );
});

test('buildPptx creates a themed pptx package with assignment review', () => {
  const bytes = buildPptx({
    themeId: 'mobile-blue',
    input: { course: '数据结构', topic: '二叉树遍历' },
    result: {
      teachingPlan: {
        objectives: ['掌握三种遍历规则'],
        keyPoints: ['递归调用过程'],
        classFlow: [{ stage: '导入', minutes: 5, activity: '展示样例树' }],
        teacherActions: ['追问递归出口'],
        studentActions: ['写出遍历序列'],
        assessment: '课堂练习'
      },
      slideOutline: [{ title: '遍历规则', speakerNotes: '前序、中序、后序' }],
      quiz: [{ type: '单选', question: '前序先访问什么？', answer: '根节点', explanation: '根左右' }],
      learningAnalysis: {
        misconceptions: ['混淆遍历顺序'],
        riskGroups: ['递归基础薄弱学生'],
        interventions: ['用调用栈辅助讲解'],
        dataIndicators: ['练习正确率']
      },
      assignmentReview: {
        score: '86',
        level: '良好',
        strengths: ['遍历序列完整'],
        issues: ['递归边界解释不够充分'],
        improvementTasks: ['补写递归终止条件']
      },
      pitchScript: '突出课堂闭环。'
    }
  });

  const names = zipEntryNames(bytes);
  const text = Buffer.from(bytes).toString('utf8');

  assert.ok(bytes instanceof Uint8Array);
  assert.equal(Buffer.from(bytes.subarray(0, 2)).toString('utf8'), 'PK');
  assert.ok(names.includes('[Content_Types].xml'));
  assert.ok(names.includes('ppt/presentation.xml'));
  assert.ok(names.includes('ppt/slides/slide1.xml'));
  assert.ok(names.includes('ppt/slides/slide8.xml'));
  assert.match(text, /数据结构/);
  assert.match(text, /二叉树遍历/);
  assert.match(text, /掌握三种遍历规则/);
  assert.match(text, /作业批改/);
  assert.match(text, /遍历序列完整/);
  assert.match(text, /突出课堂闭环/);
  assert.match(text, /0086D1/);
});

test('buildPptx includes office-compatible package relationships and master metadata', () => {
  const bytes = buildPptx({
    input: { course: '数据结构', topic: '二叉树遍历' },
    result: {
      teachingPlan: { objectives: ['掌握三种遍历规则'], classFlow: [] },
      slideOutline: [],
      quiz: [],
      learningAnalysis: {},
      pitchScript: '突出课堂闭环。'
    }
  });
  const entries = zipEntries(bytes);

  assert.ok(entries.has('docProps/core.xml'));
  assert.ok(entries.has('docProps/app.xml'));
  assert.match(entries.get('[Content_Types].xml'), /application\/vnd\.openxmlformats-package\.core-properties\+xml/);
  assert.match(entries.get('[Content_Types].xml'), /application\/vnd\.openxmlformats-officedocument\.extended-properties\+xml/);
  assert.match(entries.get('_rels/.rels'), /metadata\/core-properties/);
  assert.match(entries.get('_rels/.rels'), /extended-properties/);
  assert.match(entries.get('ppt/presentation.xml'), /<p:defaultTextStyle>/);
  assert.match(entries.get('ppt/slideMasters/slideMaster1.xml'), /<p:clrMap /);
  assert.match(entries.get('ppt/slideLayouts/slideLayout1.xml'), /<p:clrMapOvr>/);
  assert.match(entries.get('ppt/theme/theme1.xml'), /<a:sp3d>/);
  assert.doesNotMatch(entries.get('ppt/slideMasters/slideMaster1.xml'), /<p:sldLayoutId id="1"/);
});

test('pptFileName creates a safe pptx filename', () => {
  assert.equal(pptFileName({ course: '数据结构/算法', topic: '二叉树:遍历' }), '课堂方案-数据结构-算法-二叉树-遍历.pptx');
});
