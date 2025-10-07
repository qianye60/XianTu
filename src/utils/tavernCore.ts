import { toast } from './toast';
import { getTavernHelper } from './tavern';

// ⚠️ 所有规则已移至酒馆预设，不再从代码导入

// =======================================================================
//                           提示词压缩工具
// =======================================================================
/**
 * 压缩要发送给模型的系统提示词，去除无意义空白以减少 token：
 * - 统一换行为 \n
 * - 移除每行行尾空格
 * - 去除每行的前导缩进
 * - 折叠连续空行为单个空行
 * - 去除首尾空白
 */
function compactPrompt(text: string): string {
  if (!text) return '';
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const cleaned: string[] = [];
  let prevBlank = false;
  for (let line of lines) {
    line = line.replace(/[ \t]+$/g, ''); // 去除行尾空白
    line = line.replace(/^\s+/g, '');    // 去除前导缩进
    const isBlank = line.length === 0;
    if (isBlank && prevBlank) continue;   // 折叠多余空行
    cleaned.push(line);
    prevBlank = isBlank;
  }
  return cleaned.join('\n').trim();
}

// =======================================================================
//                           核心：酒馆上下文获取
// =======================================================================

/**
 * 诊断AI响应问题的辅助函数
 */
export function diagnoseAIResponse(rawResult: unknown, typeName: string): void {
  const aiResponse = rawResult as AIResponse;

  console.log(`【神识印记-诊断】开始诊断${typeName}的AI响应:`, {
    type: typeof rawResult,
    isNull: rawResult === null,
    isUndefined: rawResult === undefined,
    isString: typeof rawResult === 'string',
    isEmpty: typeof rawResult === 'string' && rawResult.trim() === '',
    length: typeof rawResult === 'string' ? rawResult.length : 'N/A',
    hasChoices: aiResponse && aiResponse.choices,
    choicesLength: aiResponse && aiResponse.choices ? aiResponse.choices.length : 'N/A'
  });

  // 检查是否是OpenAI格式的响应
  if (aiResponse && typeof aiResponse === 'object' && aiResponse.choices) {
    console.log(`【神识印记-诊断】检测到OpenAI格式响应，choices:`, aiResponse.choices);
    if (aiResponse.choices.length > 0 && aiResponse.choices[0].message) {
      console.log(`【神识印记-诊断】第一个choice的消息内容:`, aiResponse.choices[0].message.content);
      if (!aiResponse.choices[0].message.content || aiResponse.choices[0].message.content.trim() === '') {
        console.warn(`【神识印记-诊断】AI返回了空的content，这通常表示模型配置问题或提示词过于复杂`);
      }
    }
  }
}

// 为酒馆世界书条目定义一个最小化的接口以确保类型安全
interface LorebookEntry {
  uid: number;
  comment: string;
  keys: string[];
  content: string;
}

/**
 * 扩展 Window 接口以包含 TavernHelper
 */
import type { TavernHelper } from '@/types';
interface WindowWithTavernHelper extends Window {
  TavernHelper?: TavernHelper;
}

/**
 * AI响应的可能格式
 */
interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
    text?: string;
  }>;
}

/**
 * 通用AI生成函数，使用TavernHelper.generate()方法直接调用
 * 统一使用 injectPrompts 方式注入提示词，避免重复添加到对话历史
 */
export async function generateItemWithTavernAI<T = unknown>(
  prompt: string,
  typeName: string,
  showToast: boolean = true,
  _retries: number = 3,
  useStreaming: boolean = false,
  onStreamChunk?: (chunk: string) => void
): Promise<T | null> {
  // 内部：对GM_Response进行严格校验，避免"嵌套读取/关键词修正"，让AI自行修正
  const ensureValidGMResponse = (data: unknown): unknown => {
    try {
      if (!data || typeof data !== 'object') return data;
      // 仅当看起来像GM响应时才校验（包含text和tavern_commands字段）
      const hasText = Object.prototype.hasOwnProperty.call(data, 'text');
      const hasCmds = Object.prototype.hasOwnProperty.call(data, 'tavern_commands');
      if (!hasText || !hasCmds) return data;

      const allowed = new Set(['set', 'add', 'delete', 'push', 'pull']);
      const scopes = new Set(['global', 'chat', 'character', 'message']);

      const toArray = (tc: unknown): unknown[] => {
        if (Array.isArray(tc)) return tc;
        // 支持对象格式 { set: {...}, add: {...}, push: [...], pull: [...], delete: [...] }
        if (tc && typeof tc === 'object') {
          const arr: Record<string, unknown>[] = [];
          const pushFromObject = (obj: unknown, action: string) => {
            if (!obj || typeof obj !== 'object') return;
            for (const k of Object.keys(obj)) {
              arr.push({ action, scope: 'chat', key: k, value: (obj as Record<string, unknown>)[k] });
            }
          };
          const pushFromArray = (list: unknown, action: string) => {
            if (!Array.isArray(list)) return;
            for (const it of list) {
              if (!it) continue;
              if (Array.isArray(it)) {
                const [k, v] = it;
                if (typeof k === 'string') arr.push({ action, scope: 'chat', key: k, value: v });
              } else if (typeof it === 'object' && it) {
                const k = (it as Record<string, unknown>).key;
                if (typeof k === 'string') arr.push({ action, scope: (it as Record<string, unknown>).scope || 'chat', key: k, value: (it as Record<string, unknown>).value });
              } else if (typeof it === 'string' && action === 'delete') {
                arr.push({ action, scope: 'chat', key: it });
              }
            }
          };
          if ('set' in tc) pushFromObject((tc as { set: unknown }).set, 'set');
          if ('add' in tc) pushFromObject((tc as { add: unknown }).add, 'add');
          if ('push' in tc) pushFromArray((tc as { push: unknown }).push, 'push');
          if ('pull' in tc) pushFromArray((tc as { pull: unknown }).pull, 'pull');
          if ('delete' in tc) pushFromArray((tc as { delete: unknown }).delete, 'delete');
          console.log('【神识印记|校验】tavern_commands 对象格式已展开为数组，长度:', arr.length);
          return arr;
        }
        console.warn('【神识印记|校验】tavern_commands 类型异常，非数组/对象，类型:', typeof tc);
        return [];
      };

      let cmds = (data as Record<string, unknown>).tavern_commands;
      cmds = toArray(cmds);

      if (!Array.isArray(cmds)) {
        throw new Error('tavern_commands 必须为数组');
      }

      // 逐条严格校验
      const normalized: Record<string, unknown>[] = [];
      for (const c of cmds) {
        if (!c || typeof c !== 'object') throw new Error('命令项必须为对象');

        // 兼容常见别名：command/_.set/set_player_data 等，统一映射为 action
        const rawAction = (c as Record<string, unknown>).action ?? (c as Record<string, unknown>).command ?? (c as Record<string, unknown>).op;
        let action = String(rawAction || '').trim().toLowerCase();
        // 规范化常见别名
        const aliasMap: Record<string, 'set' | 'add' | 'push' | 'pull' | 'delete'> = {
          'set_value': 'set',
          'set_player_data': 'set',
          'add_item': 'push',
          'add_npc': 'set',
          'remove_item': 'pull',
          'remove_npc': 'delete',
          '_.set': 'set',
          '_.add': 'add',
          '_.push': 'push',
          '_.pull': 'pull',
          '_.delete': 'delete',
          'unset': 'delete',
          'del': 'delete',
        };
        if (aliasMap[action as keyof typeof aliasMap]) {
          action = aliasMap[action as keyof typeof aliasMap];
        }
        // 也允许原生关键字（保持原样）
        const scope = String((c as Record<string, unknown>).scope || 'chat').trim();
        const key = String((c as Record<string, unknown>).key || '').trim();
        if (!allowed.has(action)) throw new Error('存在非法action');
        if (!scopes.has(scope)) throw new Error('存在非法scope');
        if (!key) throw new Error('存在非法key');
        normalized.push({ action, scope, key, value: (c as Record<string, unknown>).value });
      }

      (data as Record<string, unknown>).tavern_commands = normalized;
      console.log('【神识印记|校验】tavern_commands 通过校验，数量:', normalized.length);
      return data;
    } catch (e) {
      // 抛出错误以触发上一层重试（重新生成）
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`GM响应校验失败: ${msg}`);
    }
  };
  // let lastError: Error | null = null;

  // 记录注入的提示词ID，用于最后清理
  console.log(`【神识印记】开始生成${typeName}，使用TavernHelper.generate()方法`);
  console.log(`【神识印记-调试】提示词长度: ${prompt?.length || 0} 字符`);
  console.log(`【神识印记-调试】提示词前500字符:`, prompt.substring(0, 500));
  console.log(`【神识印记-调试】提示词是否包含核心规则:`, prompt.includes('【核心规则'));
  console.log(`【神识印记-调试】提示词是否包含格式化标记:`, prompt.includes('【格式化标记规范】'));
  console.log(`【神识印记-调试】提示词是否包含INPUT_PLACEHOLDER:`, prompt.includes('INPUT_PLACEHOLDER'));

  // 准备提示词
  const preparedPrompt = compactPrompt(prompt);
  console.log(`【神识印记】准备发送任务提示词，大小:`, preparedPrompt.length, '字符');

  const helper = getTavernHelper();
  if (!helper) {
    throw new Error('酒馆助手未初始化');
  }

  // 简单直接：将提示词作为 user_input 发送一次，禁用重试
  // 如果AI返回格式错误，让调用方自己处理
  try {
    if (showToast) {
      toast.info(`天机运转，推演${typeName}...`);
    }

    console.log(`【神识印记】使用/inject命令注入提示词`);
    console.log(`【神识印记-调试】准备发送的提示词长度:`, preparedPrompt.length);
    console.log(`【神识印记-调试】提示词前500字符:`, preparedPrompt.substring(0, 500));
    console.log(`【神识印记-调试】提示词后500字符:`, preparedPrompt.substring(Math.max(0, preparedPrompt.length - 500)));
    console.log(`【神识印记-调试】提示词是否包含DATA_STRUCTURE_DEFINITIONS:`, preparedPrompt.includes('# 数据结构定义'));
    console.log(`【神识印记-调试】提示词是否包含玩家核心选择:`, preparedPrompt.includes('# 玩家核心选择'));
    console.log(`【神识印记-调试】提示词是否包含千夜:`, preparedPrompt.includes('千夜'));
    console.log(`【神识印记-调试】提示词是否包含瑶池圣地:`, preparedPrompt.includes('瑶池圣地'));

    // 🔥 新方案：不使用 /inject 命令，直接将完整提示词作为 user_input 发送
    // 这样可以避免污染世界书，因为 user_input 不会被保存到角色卡或世界书
    // 同时使用 max_chat_history: 0 禁用聊天历史，确保提示词不会被记录

    console.log(`【神识印记】直接发送提示词作为 user_input，不使用注入`);
    console.log(`【神识印记-调试】提示词长度:`, preparedPrompt.length);

    // 发送生成请求，将提示词直接作为user_input
    const rawResult = await helper.generate({
      user_input: preparedPrompt,  // 直接发送完整提示词
      should_stream: useStreaming,
      max_chat_history: 0  // 禁用聊天历史，防止提示词被记录
      // 注意：quiet_prompt 和 quiet_image 不在标准类型定义中，已移除
    } as any);

    console.log(`【神识印记-调试】TavernHelper.generate()返回结果类型:`, typeof rawResult);
    console.log(`【神识印记-调试】TavernHelper.generate()返回结果:`, rawResult);

    // generate()函数返回完整的响应文本,无论streaming是否启用

    // 🔥 修复：处理 SillyTavern 可能返回的对象格式
    let text: string;
    if (typeof rawResult === 'string') {
      text = rawResult.trim();
    } else if (rawResult && typeof rawResult === 'object') {
      // 如果返回的是对象，尝试提取 content 字段
      const resultObj = rawResult as Record<string, unknown>;
      if (typeof resultObj.content === 'string') {
        console.log(`【神识印记】检测到对象格式响应，提取content字段`);
        text = resultObj.content.trim();
      } else if (typeof resultObj.text === 'string') {
        console.log(`【神识印记】检测到对象格式响应，提取text字段`);
        text = resultObj.text.trim();
      } else {
        console.error(`【神识印记】无法从对象中提取文本内容:`, rawResult);
        throw new Error(`TavernHelper.generate()返回了无效的对象格式`);
      }
    } else {
      throw new Error(`TavernHelper.generate()返回了空的响应内容，响应类型: ${typeof rawResult}`);
    }

    if (!text) {
      throw new Error(`提取的响应文本为空`);
    }

    console.log(`【神识印记】AI响应文本长度:`, text.length);
    console.log(`【神识印记】AI原始响应文本 (前200字符):`, text.substring(0, 200));

    // 尝试提取JSON
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    }

    if (!jsonMatch) {
      // 尝试直接解析整个响应为JSON
      try {
        const parsed = JSON.parse(text);
        const checked = ensureValidGMResponse(parsed);
        if (showToast) {
          toast.success(`${typeName}推演完成！`);
        }
        return checked as T;
      } catch {
        console.warn(`【神识印记】响应中未找到JSON代码块，且无法直接解析为JSON: ${text}`);
        throw new Error(`响应格式无效：缺少JSON代码块或无法解析的内容`);
      }
    }

    const jsonStr = jsonMatch[1].trim();
    console.log(`【神识印记】提取到的JSON字符串:`, jsonStr);

    try {
      const parsed = JSON.parse(jsonStr);
      console.log(`【神识印记】成功解析${typeName}:`, parsed);
      if (showToast) {
        toast.success(`${typeName}推演完成！`);
      }
      const checked = ensureValidGMResponse(parsed);
      return checked as T;
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`【神识印记】JSON解析失败:`, parseError);
      console.error(`【神识印记】原始JSON字符串:`, jsonStr);
      throw new Error(`JSON解析失败: ${errorMsg}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`【神识印记】生成${typeName}失败:`, errorMsg);

    if (showToast) {
      toast.error(`推演${typeName}失败: ${errorMsg}`);
    }

    return null;
  }
}

/**
 * ⚠️ 已废弃：系统规则已移至酒馆预设，不再需要从代码写入
 * 保留此函数以保持向后兼容，实际不执行任何操作
 */
export async function cacheSystemRulesToTavern(_scope: 'chat' | 'global' = 'chat'): Promise<void> {
  console.log('【神识印记】系统规则已在酒馆预设中配置，无需从代码写入');
  // 空操作 - 所有规则已在酒馆预设中维护
}

/**
 * Raw模式AI生成 - 用于AI推演功能
 * 使用generateRaw的ordered_prompts参数发送纯净提示词，完全不包含世界书、聊天历史或角色卡
 * @param userPrompt 用户输入的提示词
 * @param systemPrompt 可选的系统提示词（如世界生成提示、天赋生成提示等）
 * @param showToast 是否显示toast提示
 */
export async function generateWithRawPrompt(
  userPrompt: string,
  systemPrompt?: string,
  showToast: boolean = true
): Promise<string | null> {
  try {
    const helper = getTavernHelper();
    if (!helper) {
      throw new Error('酒馆助手未初始化');
    }

    if (showToast) {
      toast.info('天机运转，AI推演中...');
    }

    console.log(`【AI推演-Raw模式】用户输入:`, userPrompt);
    if (systemPrompt) {
      console.log(`【AI推演-Raw模式】使用系统提示词:`, systemPrompt.substring(0, 100) + '...');
    }

    // 构建ordered_prompts - 完全自定义提示词顺序，不包含任何世界书、角色卡、聊天历史
    const orderedPrompts: Array<{ role: 'system' | 'user'; content: string }> = [];

    // 如果有系统提示词，先添加系统提示词
    if (systemPrompt) {
      orderedPrompts.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 添加用户输入
    orderedPrompts.push({
      role: 'user',
      content: userPrompt
    });

    console.log(`【AI推演-Raw模式】发送${orderedPrompts.length}条提示词`);

    // 使用generateRaw的ordered_prompts参数，完全控制发送内容，关闭世界书
    const rawResult = await helper.generateRaw({
      ordered_prompts: orderedPrompts,
      should_stream: false
    });

    console.log(`【AI推演-Raw模式】收到响应类型:`, typeof rawResult);

    // 提取文本内容
    let text: string;
    if (typeof rawResult === 'string') {
      text = rawResult.trim();
    } else {
      throw new Error('收到非字符串类型的响应');
    }

    if (!text) {
      throw new Error('响应文本为空');
    }

    console.log(`【AI推演-Raw模式】响应文本长度: ${text.length} 字符`);
    console.log(`【AI推演-Raw模式】响应前200字符:`, text.substring(0, 200));

    if (showToast) {
      toast.success('AI推演完成');
    }

    return text;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`【AI推演-Raw模式】失败:`, errorMsg);

    if (showToast) {
      toast.error(`AI推演失败: ${errorMsg}`);
    }

    return null;
  }
}
