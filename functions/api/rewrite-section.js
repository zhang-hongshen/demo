import { configFromEnv } from '../../src/runtimeConfig.js';
import { rewriteTeachingSection } from '../../src/deepseekClient.js';
import { validateRewriteRequest } from '../../src/rewriteContract.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const REWRITE_ERROR = '内容重写暂时不可用，请稍后重试。';

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeDiagnostic(message, secrets = []) {
  const secretPattern = secrets.filter(Boolean).map(escapeRegExp).join('|');
  return String(message || 'unknown')
    .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
    .replace(new RegExp(secretPattern || '$^', 'g'), '<redacted>')
    .replace(/[A-Za-z0-9_-]{12,}/g, '<redacted>');
}

export async function handleRewriteRequest({ request, env = {}, rewrite, logger = console }) {
  const config = configFromEnv(env);

  try {
    const input = await request.json();
    const validation = validateRewriteRequest(input);
    if (!validation.ok) return json(400, { ok: false, error: '重写参数无效。' });

    const value = await rewrite(validation.value, config);
    return json(200, { ok: true, value });
  } catch (error) {
    logger?.error?.('rewrite_failed', sanitizeDiagnostic(error?.message, [config.apiKey]));
    return json(502, { ok: false, error: REWRITE_ERROR });
  }
}

export async function onRequestPost(context) {
  return handleRewriteRequest({
    request: context.request,
    env: context.env,
    rewrite: (input, config) => rewriteTeachingSection({ input, config })
  });
}
