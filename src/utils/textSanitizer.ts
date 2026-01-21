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
  // 支持多种变体：<thinking>, <Thinking>, <antThinking>, <ant-thinking> 等
  result = result
    .replace(/<(?:ant[-_]?)?thinking>[\s\S]*?<\/(?:ant[-_]?)?thinking>/gi, '')
    .replace(/<\/?(?:ant[-_]?)?thinking>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<\/?analysis>/gi, '')
    // 移除可能的reasoning标签
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\/?reasoning>/gi, '')
    // 移除可能的thought标签
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<\/?thought>/gi, '');

  for (const rule of replaceRules) {
    result = result.replace(rule.re, rule.replacement);
  }

  return result;
}

export function sanitizeAITextForDisplay(text: string): string {
  return sanitizeWithRules(text, getCompiledReplaceRules());
}

/**
 * 从完整的 JSON 响应中提取 text 字段
 * 用于最终显示时调用，不用于流式过程中
 */
export function extractTextFromJsonResponse(text: string): string {
  if (!text) return '';

  // 先移除 thinking 类标签
  let cleaned = text
    .replace(/<think[^>]*>[\s\S]*?<\/think[^>]*>/gi, '')
    .replace(/<\/?think[^>]*>/gi, '')
    .trim();

  // 查找 JSON 对象
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return cleaned;
  }

  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.text === 'string') {
      return parsed.text;
    }
  } catch {
    // JSON 解析失败，返回原文
  }

  return cleaned;
}