import { configFromEnv } from '../../src/runtimeConfig.js';
import { generateTeachingPackage } from '../../src/deepseekClient.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const GENERATE_ERROR = '智能生成服务暂时不可用，请稍后重试或载入样例。';

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export async function handleGenerateRequest({ request, env = {}, generate }) {
  try {
    const input = await request.json();
    const config = configFromEnv(env);
    const result = await generate(input, config);
    return json(200, { ok: true, result });
  } catch {
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
