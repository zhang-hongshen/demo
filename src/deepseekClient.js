import { buildRewriteMessages, buildTeachingMessages } from './promptBuilder.js';
import { isRewriteValue, validateRewriteRequest } from './rewriteContract.js';

function joinUrl(baseUrl, suffix) {
  return `${baseUrl.replace(/\/+$/, '')}${suffix}`;
}

export function buildDeepSeekRequest({ input, config }) {
  if (!config?.baseUrl) throw new Error('Missing DeepSeek base URL');
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
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      stream: false,
      messages: buildTeachingMessages(input)
    }
  };
}

export function buildRewriteRequest({ input, config }) {
  if (!config?.baseUrl) throw new Error('Missing DeepSeek base URL');
  if (!config?.apiKey) throw new Error('Missing api_key in .env');

  const validation = validateRewriteRequest(input);
  if (!validation.ok) throw new Error(validation.error);

  return {
    url: joinUrl(config.baseUrl, '/chat/completions'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: {
      model: config.model || 'deepseek-v4-flash',
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      stream: false,
      messages: buildRewriteMessages(validation.value)
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
    return normalizeTeachingResult(JSON.parse(cleaned));
  } catch {
    return { rawText: content };
  }
}

export function parseRewritePayload(payload, valueType) {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek rewrite response did not include message content');

  const cleaned = String(content)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('DeepSeek rewrite response was not valid JSON');
  }

  if (!isRewriteValue(parsed?.value, valueType)) {
    throw new Error('DeepSeek rewrite response had an invalid value');
  }

  return valueType === 'text'
    ? parsed.value.trim()
    : parsed.value.map((item) => item.trim()).filter(Boolean);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value !== 'string') return [value];

  const parts = value
    .split(/[；;]\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [value.trim()];
}

function normalizeTieredTasks(tasks = {}) {
  return {
    basic: toArray(tasks.basic),
    advanced: toArray(tasks.advanced),
    challenge: toArray(tasks.challenge)
  };
}

function normalizeFlowItem(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      stage: item.stage || `环节${index + 1}`,
      minutes: item.minutes || '',
      activity: item.activity || item.content || item.description || ''
    };
  }

  const text = String(item ?? '').trim();
  const match = text.match(/^(.+?)[（(](\d+)\s*分钟[）)][:：]\s*(.+)$/);
  if (match) {
    return {
      stage: match[1],
      minutes: Number(match[2]),
      activity: match[3]
    };
  }

  return {
    stage: `环节${index + 1}`,
    minutes: '',
    activity: text
  };
}

function normalizeSlideItem(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      title: item.title || item.heading || `第${index + 1}页`,
      speakerNotes: item.speakerNotes || item.notes || item.content || item.description || ''
    };
  }

  const text = String(item ?? '').trim();
  const match = text.match(/^(.+?)[：:]\s*(.+)$/);
  return {
    title: match ? match[1] : `第${index + 1}页`,
    speakerNotes: match ? match[2] : text
  };
}

function normalizeQuizItem(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      type: item.type || item.kind || '问答',
      question: item.question || item.prompt || `题目${index + 1}`,
      answer: item.answer || item.correctAnswer || item.correct_answer || '',
      explanation: item.explanation || item.reason || item.analysis || ''
    };
  }

  return {
    type: '问答',
    question: String(item ?? '').trim(),
    answer: '',
    explanation: ''
  };
}

function normalizeRubricItem(item, index) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      criterion: item.criterion || item.name || item.item || `评分项${index + 1}`,
      score: item.score || item.points || item.value || '',
      comment: item.comment || item.feedback || item.reason || item.description || ''
    };
  }

  return {
    criterion: `评分项${index + 1}`,
    score: '',
    comment: String(item ?? '').trim()
  };
}

function normalizeTeachingResult(result) {
  if (!result || result.rawText) return result;

  const plan = result.teachingPlan || {};
  const analysis = result.learningAnalysis || {};
  const assignment = result.assignmentReview || result.assignmentGrading || result.homeworkReview || {};

  return {
    ...result,
    teachingPlan: {
      objectives: toArray(plan.objectives),
      keyPoints: toArray(plan.keyPoints),
      classFlow: toArray(plan.classFlow).map(normalizeFlowItem),
      teacherActions: toArray(plan.teacherActions),
      studentActions: toArray(plan.studentActions),
      assessment: plan.assessment || ''
    },
    slideOutline: toArray(result.slideOutline).map(normalizeSlideItem),
    quiz: toArray(result.quiz).map(normalizeQuizItem),
    tieredTasks: normalizeTieredTasks(result.tieredTasks),
    learningAnalysis: {
      misconceptions: toArray(analysis.misconceptions),
      riskGroups: toArray(analysis.riskGroups),
      interventions: toArray(analysis.interventions),
      dataIndicators: toArray(analysis.dataIndicators)
    },
    assignmentReview: {
      score: assignment.score || assignment.totalScore || assignment.grade || '',
      level: assignment.level || assignment.rating || assignment.performance || '',
      strengths: toArray(assignment.strengths || assignment.highlights || assignment.advantages),
      issues: toArray(assignment.issues || assignment.problems || assignment.mistakes),
      rubric: toArray(assignment.rubric || assignment.scoringDetails || assignment.criteria).map(normalizeRubricItem),
      feedback: assignment.feedback || assignment.comment || assignment.teacherComment || '',
      improvementTasks: toArray(assignment.improvementTasks || assignment.suggestions || assignment.nextSteps)
    },
    pitchScript: result.pitchScript || ''
  };
}

export async function generateTeachingPackage({ input, config, fetchImpl = fetch, timeoutMs = 60000 }) {
  const request = buildDeepSeekRequest({ input, config });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`DeepSeek request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const suffix = detail ? `: ${detail.slice(0, 500)}` : '';
    throw new Error(`DeepSeek request failed with status ${response.status || 'unknown'}${suffix}`);
  }

  return parseDeepSeekPayload(await response.json());
}

export async function rewriteTeachingSection({ input, config, fetchImpl = fetch, timeoutMs = 60000 }) {
  const validation = validateRewriteRequest(input);
  if (!validation.ok) throw new Error(validation.error);
  const request = buildRewriteRequest({ input: validation.value, config });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`DeepSeek rewrite request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const suffix = detail ? `: ${detail.slice(0, 500)}` : '';
    throw new Error(`DeepSeek rewrite request failed with status ${response.status || 'unknown'}${suffix}`);
  }

  return parseRewritePayload(await response.json(), validation.value.target.valueType);
}
