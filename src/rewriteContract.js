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

const MAX_TEXT_LENGTH = 4200;
const MAX_LINE_COUNT = 20;
const MAX_LINE_LENGTH = 500;
const CONTEXT_FIELDS = ['course', 'topic', 'classProfile'];

function targetKey(feature, target) {
  const field = target?.field ? `.${target.field}` : '';
  return `${feature}:${target?.section || ''}${field}`;
}

function cleanContext(inputContext = {}) {
  return Object.fromEntries(
    CONTEXT_FIELDS
      .map((field) => [field, String(inputContext[field] || '').trim().slice(0, 600)])
      .filter(([, value]) => value)
  );
}

export function isRewriteValue(value, valueType) {
  if (valueType === 'text') {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT_LENGTH;
  }

  if (valueType === 'lines') {
    return Array.isArray(value)
      && value.length <= MAX_LINE_COUNT
      && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= MAX_LINE_LENGTH);
  }

  return false;
}

function normalizeValue(value, valueType) {
  if (valueType === 'text') return String(value).trim().slice(0, MAX_TEXT_LENGTH);
  return value.map((item) => String(item).trim().slice(0, MAX_LINE_LENGTH)).filter(Boolean).slice(0, MAX_LINE_COUNT);
}

export function validateRewriteRequest(input = {}) {
  const feature = ['slides', 'grading', 'analysis'].includes(input.feature) ? input.feature : '';
  const target = input.target && typeof input.target === 'object' ? input.target : {};
  const key = targetKey(feature, target);
  const definition = REWRITE_TARGETS[key];

  if (!feature || !definition) return { ok: false, error: '不支持的重写目标。' };
  if (target.valueType !== definition.valueType) return { ok: false, error: '重写内容类型不匹配。' };
  if (definition.index && (!Number.isInteger(target.index) || target.index < 0)) {
    return { ok: false, error: '重写目标缺少有效序号。' };
  }
  if (!definition.index && target.index !== undefined) return { ok: false, error: '重写目标序号无效。' };
  if (!REWRITE_INSTRUCTIONS.includes(input.instruction)) return { ok: false, error: '不支持的重写方式。' };
  if (!isRewriteValue(input.currentValue, definition.valueType)) return { ok: false, error: '当前内容无效。' };
  if (definition.valueType === 'lines' && input.currentValue.length === 0) {
    return { ok: false, error: '当前内容无效。' };
  }

  return {
    ok: true,
    value: {
      feature,
      target: {
        section: String(target.section),
        field: String(target.field),
        ...(definition.index ? { index: target.index } : {}),
        valueType: definition.valueType
      },
      currentValue: normalizeValue(input.currentValue, definition.valueType),
      instruction: input.instruction,
      inputContext: cleanContext(input.inputContext)
    }
  };
}

export function targetDescription(target) {
  return `${target.section}${target.field ? `.${target.field}` : ''}${Number.isInteger(target.index) ? `[${target.index}]` : ''}`;
}
