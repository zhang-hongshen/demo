import { buildTeachingMessages } from './promptBuilder.js';

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

function normalizeTeachingResult(result) {
  if (!result || result.rawText) return result;

  const plan = result.teachingPlan || {};
  const analysis = result.learningAnalysis || {};

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
    learningAnalysis: {
      misconceptions: toArray(analysis.misconceptions),
      riskGroups: toArray(analysis.riskGroups),
      interventions: toArray(analysis.interventions),
      dataIndicators: toArray(analysis.dataIndicators)
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
