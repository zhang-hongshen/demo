export const DEFAULT_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_MODEL = 'deepseek-v4-flash';

function firstPresent(values, keys) {
  for (const key of keys) {
    const value = values?.[key];
    if (value != null && value !== '') return value;
  }
  return undefined;
}

export function configFromEnv(values = {}) {
  return {
    baseUrl: firstPresent(values, ['deepseek_base_url', 'DEEPSEEK_BASE_URL']) || DEFAULT_BASE_URL,
    apiKey: firstPresent(values, ['deepseek_api_key', 'DEEPSEEK_API_KEY', 'api_key', 'API_KEY']),
    model: firstPresent(values, ['deepseek_model', 'DEEPSEEK_MODEL', 'model', 'MODEL']) || DEFAULT_MODEL
  };
}
