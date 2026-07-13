import fs from 'node:fs';
import path from 'node:path';
import { configFromEnv } from './runtimeConfig.js';

export function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        if (index === -1) return [line, ''];
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      })
  );
}

export function loadEnv(filePath = path.resolve(process.cwd(), '.env')) {
  const fileValues = fs.existsSync(filePath) ? parseEnv(fs.readFileSync(filePath, 'utf8')) : {};
  return configFromEnv({ ...fileValues, ...process.env });
}
