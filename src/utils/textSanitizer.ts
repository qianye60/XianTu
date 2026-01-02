import type { TextReplaceRule } from '@/types/textRules';

const MAX_LINE_LENGTH = 500;
const MAX_REPLACE_RULES = 50;
const MAX_REPLACE_REPLACEMENT_LENGTH = 1500;

let cachedReplaceKey: string | null = null;
let cachedCompiledReplaceRules: Array<{ re: RegExp; replacement: string }> = [];

type SanitizerSettings = {
  replaceRules: TextReplaceRule[];
};

function safeGetSanitizerSettings(): SanitizerSettings {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { replaceRules: [] };
    }
    const raw = localStorage.getItem('dad_game_settings');
    if (!raw) return { replaceRules: [] };
    const parsed = JSON.parse(raw);
    return {
      replaceRules: Array.isArray(parsed?.replaceRules) ? (parsed.replaceRules as TextReplaceRule[]) : [],
    };
  } catch {
    return { replaceRules: [] };
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReplaceFlags(rule: TextReplaceRule): string {
  const globalFlag = rule.global === false ? '' : 'g';
  const i = rule.ignoreCase ? 'i' : '';
  const m = rule.mode === 'regex' && rule.multiline ? 'm' : '';
  const s = rule.mode === 'regex' && rule.dotAll ? 's' : '';
  return `${globalFlag}${i}${m}${s}`;
}

function escapeReplacementForText(replacement: string): string {
  return replacement.replace(/\$/g, '$$$$');
}

function compileReplaceRules(rules: TextReplaceRule[]): Array<{ re: RegExp; replacement: string }> {
  const compiled: Array<{ re: RegExp; replacement: string }> = [];
  for (const rule of rules) {
    if (compiled.length >= MAX_REPLACE_RULES) break;
    if (!rule || rule.enabled === false) continue;
    if (typeof rule.pattern !== 'string' || !rule.pattern.trim()) continue;

    const pattern = rule.pattern.length > MAX_LINE_LENGTH ? rule.pattern.slice(0, MAX_LINE_LENGTH) : rule.pattern;
    const replacementRaw = typeof rule.replacement === 'string' ? rule.replacement : '';
    const replacement =
      rule.mode === 'text'
        ? escapeReplacementForText(replacementRaw.slice(0, MAX_REPLACE_REPLACEMENT_LENGTH))
        : replacementRaw.slice(0, MAX_REPLACE_REPLACEMENT_LENGTH);

    try {
      if (rule.mode === 'text') {
        const flags = `${rule.global === false ? '' : 'g'}${rule.ignoreCase ? 'i' : ''}`;
        compiled.push({ re: new RegExp(escapeRegExp(pattern), flags), replacement });
      } else {
        const flags = buildReplaceFlags(rule);
        compiled.push({ re: new RegExp(pattern, flags), replacement });
      }
    } catch {
      // ignore invalid rule
    }
  }
  return compiled;
}

function getCompiledReplaceRules(): Array<{ re: RegExp; replacement: string }> {
  const settings = safeGetSanitizerSettings();
  const settingsKey = JSON.stringify(settings.replaceRules || []);
  if (settingsKey === cachedReplaceKey) return cachedCompiledReplaceRules;

  cachedReplaceKey = settingsKey;
  cachedCompiledReplaceRules = compileReplaceRules(settings.replaceRules || []);
  return cachedCompiledReplaceRules;
}

function sanitizeWithRules(
  text: string,
  replaceRules: Array<{ re: RegExp; replacement: string }>,
): string {
  if (!text) return '';

  let result = text;

  // Built-in: remove thinking/analysis blocks and leftover tags.
  result = result
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?analysis>/gi, '');

  for (const rule of replaceRules) {
    result = result.replace(rule.re, rule.replacement);
  }

  return result;
}

export function sanitizeAITextForDisplay(text: string): string {
  return sanitizeWithRules(text, getCompiledReplaceRules());
}