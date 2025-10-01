import { toast } from './toast';

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
 * TavernHelper API 接口定义 - 作为类型安全的唯一真实来源
 */
// 提示词注入类型定义(根据@types文档)
export interface InjectionPrompt {
  id: string;
  position: 'in_chat' | 'none';
  depth: number;
  role: 'system' | 'assistant' | 'user';
  content: string;
  filter?: (() => boolean) | (() => Promise<boolean>);
  should_scan?: boolean;
}

export interface InjectPromptsOptions {
  once?: boolean; // 是否只在下一次请求生成中有效
}

export interface Overrides {
  char_description?: string;
  char_personality?: string;
  scenario?: string;
  example_dialogue?: string;
  [key: string]: unknown;
}

export interface TavernHelper {
  // 核心生成与命令
  generate: (config: {
    user_input?: string;
    should_stream?: boolean;
    image?: File | string | (File | string)[];
    overrides?: Overrides;
    injects?: Omit<InjectionPrompt, 'id'>[];
    max_chat_history?: 'all' | number;
    custom_api?: Record<string, unknown>;
    generation_id?: string;
  }) => Promise<string>; // 更新generate方法签名
  generateRaw: (config: Record<string, unknown>) => Promise<unknown>; // 更改为接受配置对象
  triggerSlash: (command: string) => Promise<unknown>;

  // 提示词注入
  injectPrompts: (prompts: InjectionPrompt[], options?: InjectPromptsOptions) => void;
  uninjectPrompts: (ids: string[]) => void;

  // 变量操作
  getVariables(options: { type: 'global' | 'chat' }): Promise<Record<string, unknown>>;
  insertOrAssignVariables(data: Record<string, unknown>, options: { type: 'global' | 'chat' }): Promise<void>;
  deleteVariable(variable_path: string, options?: { type?: string; message_id?: number | 'latest' }): Promise<{ variables: Record<string, unknown>; delete_occurred: boolean }>;

  // 角色与宏
  getCharData(): Promise<{ name: string } | null>;
  substitudeMacros(macro: string): Promise<string>;

  // 世界书操作
  getLorebooks(): Promise<string[]>;
  createLorebook(name: string): Promise<void>;
  getLorebookEntries(name: string): Promise<LorebookEntry[]>;
  setLorebookEntries(name: string, entries: Partial<LorebookEntry>[]): Promise<void>;
  createLorebookEntries(name: string, entries: unknown[]): Promise<void>;

  // 聊天记录操作
  getLastMessageId(): Promise<number>;
  deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'all' }): Promise<void>;
  updateChatHistory?(history: unknown[]): Promise<void>; // 为了向后兼容，设为可选

  // 设置与其他
  settings?: {
    token?: string;
  };
}

/**
 * 扩展 Window 接口以包含 TavernHelper
 */
interface WindowWithTavernHelper extends Window {
  TavernHelper?: TavernHelper;
}

/**
 * 获取SillyTavern助手API，适配iframe环境。
 * @returns {TavernHelper} - 返回TavernHelper对象
 */

export function getTavernHelper(): TavernHelper {
  console.log('【神识印记】开始检查TavernHelper可用性...');
  const parentWindow = window.parent as WindowWithTavernHelper;
  if (parentWindow && parentWindow.TavernHelper?.generate) {
    console.log('【神识印记】TavernHelper检查通过，包含generate方法');
    return parentWindow.TavernHelper;
  }

  console.error('【神识印记】TavernHelper检查失败');
  toast.error('感应酒馆助手灵脉失败，请确认在SillyTavern环境中运行！');
  throw new Error('TavernHelper API not found in window.parent.');
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

    // 使用 /inject slash command 注入提示词
    // position=before 在主提示词之前，depth=0 最高优先级，role=system 系统角色，ephemeral=true 临时注入
    const injectId = `init_prompt_${Date.now()}`;

    // 转义提示词中的特殊字符（特别是引号）
    const escapedPrompt = preparedPrompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const injectCommand = `/inject id="${injectId}" position=before depth=0 role=system ephemeral=true "${escapedPrompt}"`;

    console.log(`【神识印记-调试】注入命令ID:`, injectId);
    console.log(`【神识印记-调试】注入命令长度:`, injectCommand.length);

    try {
      const injectResult = await helper.triggerSlash(injectCommand);
      console.log(`【神识印记】提示词注入成功，返回:`, injectResult);
    } catch (injectError) {
      console.warn(`【神识印记】提示词注入失败:`, injectError);
      // 继续执行，即使注入失败
    }

    // 发送生成请求
    const rawResult = await helper.generate({
      user_input: '请严格按照上述系统指令执行角色初始化任务',
      should_stream: useStreaming,
      max_chat_history: 0  // 禁用聊天历史
    });

    console.log(`【神识印记-调试】TavernHelper.generate()返回结果类型:`, typeof rawResult);
    console.log(`【神识印记-调试】TavernHelper.generate()返回结果长度:`, rawResult?.length || 0);
    console.log(`【神识印记-调试】TavernHelper.generate()返回结果前200字符:`, rawResult?.substring(0, 200));

    // 处理流式回调
    if (useStreaming && onStreamChunk) {
      onStreamChunk(rawResult || '');
    }

    if (!rawResult || typeof rawResult !== 'string' || rawResult.trim() === '') {
      throw new Error(`TavernHelper.generate()返回了空的响应内容，响应类型: ${typeof rawResult}`);
    }

    const text = rawResult.trim();
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
