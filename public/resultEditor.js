export function cloneResult(result) {
  if (typeof structuredClone === 'function') return structuredClone(result);
  return JSON.parse(JSON.stringify(result));
}

export function targetPath(target = {}) {
  const fieldParts = String(target.field || '').split('.').filter(Boolean);
  if (!Number.isInteger(target.index)) return [target.section, ...fieldParts];
  if (fieldParts.length === 1) return [target.section, target.index, ...fieldParts];
  return [target.section, fieldParts[0], target.index, ...fieldParts.slice(1)];
}

function readPath(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

export function readResultTarget(result, target) {
  return readPath(result, targetPath(target));
}

export function updateResultTarget(result, target, value) {
  const next = cloneResult(result);
  const path = targetPath(target);
  if (!path.length) return next;

  let parent = next;
  for (const key of path.slice(0, -1)) {
    if (parent == null || parent[key] == null) throw new Error('Result target does not exist');
    parent = parent[key];
  }
  parent[path.at(-1)] = value;
  return next;
}

export function isRewriteValue(value, valueType) {
  if (valueType === 'text') return typeof value === 'string' && value.trim().length > 0;
  if (valueType === 'lines') return Array.isArray(value) && value.every((item) => typeof item === 'string');
  return false;
}

export function normalizeEditorLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function targetKey(target = {}) {
  return `${target.section || ''}.${target.field || ''}${Number.isInteger(target.index) ? `[${target.index}]` : ''}`;
}
