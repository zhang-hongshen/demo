import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.js';
import { generateTeachingPackage } from './deepseekClient.js';
import { sampleResult } from './sampleResult.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeError(message, secrets = []) {
  if (!message) return '服务暂时不可用，请稍后重试。';
  return secrets
    .filter(Boolean)
    .reduce((current, secret) => current.replace(new RegExp(escapeRegExp(secret), 'g'), '<redacted>'), message)
    .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
    .replace(/[A-Za-z0-9_-]{12,}/g, '<redacted>');
}

function safeGenerateError(message, secrets = []) {
  safeError(message, secrets);
  return '智能生成服务暂时不可用，请稍后重试或载入样例。';
}

async function serveStatic(request, response) {
  const requestPath = new URL(request.url, 'http://localhost').pathname;
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { ok: false, error: 'Forbidden' });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    sendJson(response, 404, { ok: false, error: 'Not found' });
  }
}

export function createServer(options = {}) {
  const config = options.config || loadEnv();
  const generate = options.generate || ((input) => generateTeachingPackage({ input, config }));

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/api/sample') {
      sendJson(response, 200, { ok: true, result: sampleResult });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const input = await readJson(request);
        const result = await generate(input);
        sendJson(response, 200, { ok: true, result });
      } catch (error) {
        sendJson(response, 502, { ok: false, error: safeGenerateError(error.message, [config.apiKey]) });
      }
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { ok: false, error: 'Method not allowed' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 5173);
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`智教方案生成台 running at http://localhost:${port}`);
  });
}
