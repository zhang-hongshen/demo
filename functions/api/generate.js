import { configFromEnv } from '../../src/runtimeConfig.js';
import { generateTeachingPackage } from '../../src/deepseekClient.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const GENERATE_ERROR = '智能生成服务暂时不可用，请稍后重试或载入样例。';

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeDiagnostic(message, secrets = []) {
  return String(message || 'unknown')
    .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
    .replace(
      new RegExp(secrets.filter(Boolean).map(escapeRegExp).join('|') || '$^', 'g'),
      '<redacted>'
    );
}

export async function handleGenerateRequest({ request, env = {}, generate, logger = console }) {
  const config = configFromEnv(env);
  try {
    const input = await request.json();
    const result = await generate(input, config);
    return json(200, { ok: true, result });
  } catch (error) {
    logger?.error?.('generate_failed', sanitizeDiagnostic(error?.message, [config.apiKey]));
    return json(502, { ok: false, error: GENERATE_ERROR });
  }
}

export async function onRequestPost(context) {
  return handleGenerateRequest({
    request: context.request,
    env: context.env,
    generate: (input, config) => generateTeachingPackage({ input, config })
  });
}
