type ParsedRegex = { pattern: string; flags: string } | null;

const MAX_RULES = 30;
const MAX_LINE_LENGTH = 500;

let cachedRawRules: string | null = null;
let cachedCompiledRules: RegExp[] = [];

function safeGetCustomStripRulesRaw(): string {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
    const raw = localStorage.getItem('dad_game_settings');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.customStripRegex === 'string' ? parsed.customStripRegex : '';
  } catch {
    return '';
  }
}

function ensureGlobalFlag(flags: string): string {
  const normalized = flags || '';
  return normalized.includes('g') ? normalized : `${normalized}g`;
}

function tryParseRegexLine(line: string): ParsedRegex {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) return null;

  if (trimmed.startsWith('/') && trimmed.length > 2) {
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash > 0) {
      const pattern = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1);
      if (pattern) return { pattern, flags };
    }
  }

  return { pattern: trimmed, flags: 'g' };
}

function compileCustomStripRules(rawRules: string): RegExp[] {
  const lines = rawRules.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rules: RegExp[] = [];

  for (const line of lines) {
    if (rules.length >= MAX_RULES) break;
    if (line.length > MAX_LINE_LENGTH) continue;

    const parsed = tryParseRegexLine(line);
    if (!parsed) continue;

    try {
      const flags = ensureGlobalFlag(parsed.flags);
      rules.push(new RegExp(parsed.pattern, flags));
    } catch {
      // ignore invalid regex
    }
  }

  return rules;
}

function getCompiledCustomStripRules(): RegExp[] {
  const rawRules = safeGetCustomStripRulesRaw();
  if (rawRules === cachedRawRules) return cachedCompiledRules;

  cachedRawRules = rawRules;
  cachedCompiledRules = compileCustomStripRules(rawRules);
  return cachedCompiledRules;
}

export function sanitizeAITextForDisplay(text: string): string {
  if (!text) return '';

  let result = text;

  // Built-in: remove thinking/analysis blocks and leftover tags.
  result = result
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?analysis>/gi, '');

  const customRules = getCompiledCustomStripRules();
  for (const rule of customRules) {
    result = result.replace(rule, '');
  }

  return result;
}

