export function extractFirstJsonSnippet(text: string): string | null {
  if (!text) return null;

  // 1) Prefer fenced code blocks (```json ... ```)
  const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  for (const match of text.matchAll(fenceRe)) {
    const candidate = (match[1] || '').trim();
    if (!candidate) continue;
    if (candidate.includes('{') || candidate.includes('[')) return candidate;
  }

  // 2) Fallback: find first balanced {...} or [...]
  const starts: Array<{ index: number; opener: '{' | '['; closer: '}' | ']' }> = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') starts.push({ index: i, opener: '{', closer: '}' });
    if (ch === '[') starts.push({ index: i, opener: '[', closer: ']' });
  }

  for (const start of starts) {
    const snippet = extractBalancedJson(text, start.index, start.opener, start.closer);
    if (snippet) return snippet;
  }

  return null;
}

function extractBalancedJson(
  text: string,
  startIndex: number,
  opener: '{' | '[',
  closer: '}' | ']',
): string | null {
  const stack: string[] = [closer];
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      const expected = stack[stack.length - 1];
      if (ch !== expected) return null;
      stack.pop();
      if (stack.length === 0) {
        return text.slice(startIndex, i + 1).trim();
      }
    }
  }

  return null;
}

export function parseJsonFromText<T = unknown>(text: string): T {
  const snippet = extractFirstJsonSnippet(text);
  if (!snippet) {
    throw new Error('未找到可解析的 JSON 片段');
  }
  return JSON.parse(snippet) as T;
}

