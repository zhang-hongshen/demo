import { sampleResult } from '../../src/sampleResult.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export async function onRequestGet() {
  return json(200, { ok: true, result: sampleResult });
}
