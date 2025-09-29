import { toast } from './toast';
import { 
  COMMON_CORE_RULES, 
  COMMON_NARRATIVE_RULES, 
  COMMON_DATA_MANIPULATION_RULES,
  COMMON_ITEM_RULES,
  COMMON_NPC_RULES,
  COMMON_DAO_RULES,
  CHARACTER_INITIALIZATION_RULES
} from './prompts/commonPromptRules';

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
export interface TavernHelper {
  // 核心生成与命令
  generate: (config: {
    user_input?: string;
    should_stream?: boolean;
    image?: File | string | (File | string)[];
    overrides?: any;
    injects?: Array<{
      role: string;
      content: string;
      position: string;
      depth?: number;
      should_scan?: boolean;
    }>;
    max_chat_history?: 'all' | number;
    custom_api?: any;
    generation_id?: string;
  }) => Promise<string>; // 更新generate方法签名
  generateRaw: (config: any) => Promise<unknown>; // 更改为接受配置对象
  triggerSlash: (command: string) => Promise<unknown>;
  
  // 变量操作
  getVariables(options: { type: 'global' | 'chat' }): Promise<Record<string, unknown>>;
  insertOrAssignVariables(data: Record<string, any>, options: { type: 'global' | 'chat' }): Promise<void>;
  deleteVariable(variable_path: string, options?: { type?: string; message_id?: number | 'latest' }): Promise<{ variables: Record<string, any>; delete_occurred: boolean }>;
  
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
  updateChatHistory?(history: any[]): Promise<void>; // 为了向后兼容，设为可选

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
 */
export async function generateItemWithTavernAI<T = unknown>(
  prompt: string,
  typeName: string,
  showToast: boolean = true,
  retries: number = 3,
  useStreaming: boolean = false,
  onStreamChunk?: (chunk: string) => void
): Promise<T | null> {
  // 内部：对GM_Response进行严格校验，避免"嵌套读取/关键词修正"，让AI自行修正
  const ensureValidGMResponse = (data: any): any => {
    try {
      if (!data || typeof data !== 'object') return data;
      // 仅当看起来像GM响应时才校验（包含text和tavern_commands字段）
      const hasText = Object.prototype.hasOwnProperty.call(data, 'text');
      const hasCmds = Object.prototype.hasOwnProperty.call(data, 'tavern_commands');
      if (!hasText || !hasCmds) return data;

      const allowed = new Set(['set', 'add', 'delete', 'push', 'pull']);
      const scopes = new Set(['global', 'chat', 'character', 'message']);

      const toArray = (tc: any): any[] => {
        if (Array.isArray(tc)) return tc;
        // 支持对象格式 { set: {...}, add: {...}, push: [...], pull: [...], delete: [...] }
        if (tc && typeof tc === 'object') {
          const arr: any[] = [];
          const pushFromObject = (obj: any, action: string) => {
            if (!obj || typeof obj !== 'object') return;
            for (const k of Object.keys(obj)) {
              arr.push({ action, scope: 'chat', key: k, value: obj[k] });
            }
          };
          const pushFromArray = (list: any, action: string) => {
            if (!Array.isArray(list)) return;
            for (const it of list) {
              if (!it) continue;
              if (Array.isArray(it)) {
                const [k, v] = it;
                if (typeof k === 'string') arr.push({ action, scope: 'chat', key: k, value: v });
              } else if (typeof it === 'object') {
                const k = (it as any).key;
                if (typeof k === 'string') arr.push({ action, scope: (it as any).scope || 'chat', key: k, value: (it as any).value });
              } else if (typeof it === 'string' && action === 'delete') {
                arr.push({ action, scope: 'chat', key: it });
              }
            }
          };
          if ('set' in tc) pushFromObject(tc.set, 'set');
          if ('add' in tc) pushFromObject(tc.add, 'add');
          if ('push' in tc) pushFromArray(tc.push, 'push');
          if ('pull' in tc) pushFromArray(tc.pull, 'pull');
          if ('delete' in tc) pushFromArray(tc.delete, 'delete');
          console.log('【神识印记|校验】tavern_commands 对象格式已展开为数组，长度:', arr.length);
          return arr;
        }
        console.warn('【神识印记|校验】tavern_commands 类型异常，非数组/对象，类型:', typeof tc);
        return [];
      };

      let cmds = (data as any).tavern_commands;
      cmds = toArray(cmds);

      if (!Array.isArray(cmds)) {
        throw new Error('tavern_commands 必须为数组');
      }

      // 逐条严格校验
      const normalized: any[] = [];
      for (const c of cmds) {
        if (!c || typeof c !== 'object') throw new Error('命令项必须为对象');

        // 兼容常见别名：command/_.set/set_player_data 等，统一映射为 action
        const rawAction = (c as any).action ?? (c as any).command ?? (c as any).op;
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
        const scope = String((c as any).scope || 'chat').trim();
        const key = String((c as any).key || '').trim();
        if (!allowed.has(action)) throw new Error('存在非法action');
        if (!scopes.has(scope)) throw new Error('存在非法scope');
        if (!key) throw new Error('存在非法key');
        normalized.push({ action, scope, key, value: (c as any).value });
      }

      (data as any).tavern_commands = normalized;
      console.log('【神识印记|校验】tavern_commands 通过校验，数量:', normalized.length);
      return data;
    } catch (e) {
      // 抛出错误以触发上一层重试（重新生成）
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`GM响应校验失败: ${msg}`);
    }
  };
  let lastError: Error | null = null;
  
  console.log(`【神识印记】开始生成${typeName}，使用TavernHelper.generate()方法`);
  console.log(`【神识印记-调试】提示词长度: ${prompt?.length || 0} 字符`);
  console.log(`【神识印记-调试】提示词前500字符:`, prompt.substring(0, 500));
  console.log(`【神识印记-调试】提示词是否包含核心规则:`, prompt.includes('【核心规则'));
  console.log(`【神识印记-调试】提示词是否包含格式化标记:`, prompt.includes('【格式化标记规范】'));
  console.log(`【神识印记-调试】提示词是否包含INPUT_PLACEHOLDER:`, prompt.includes('INPUT_PLACEHOLDER'));

  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        console.log(`【神识印记】开始第 ${i} 次重试生成 ${typeName}...`);
        toast.info(`天机扰动，正在第 ${i} 次尝试推演${typeName}...`);
      }

      const helper = getTavernHelper();
      if (showToast && i === 0) {
        toast.info(`天机运转，推演${typeName}...`);
      }

      // 压缩系统规则与提示词，减少 token 占用
      const systemBundle = await (async () => {
        try {
          const helper = getTavernHelper();
          const vars = await helper.getVariables({ type: 'chat' });
          const bundle = typeof vars['system.rules.bundle'] === 'string' ? (vars['system.rules.bundle'] as string) : '';
          if (bundle && bundle.trim()) return compactPrompt(bundle);
        } catch {}
        // 回退：内建拼装一份基础规则
        const parts = [
          '【核心规则】',
          (typeof COMMON_CORE_RULES === 'string' ? COMMON_CORE_RULES : ''),
          '【叙事规则】',
          (typeof COMMON_NARRATIVE_RULES === 'string' ? COMMON_NARRATIVE_RULES : ''),
          '【数据操作规则】',
          (typeof COMMON_DATA_MANIPULATION_RULES === 'string' ? COMMON_DATA_MANIPULATION_RULES : ''),
          '【物品系统】',
          (typeof COMMON_ITEM_RULES === 'string' ? COMMON_ITEM_RULES : ''),
          '【NPC系统】',
          (typeof COMMON_NPC_RULES === 'string' ? COMMON_NPC_RULES : ''),
          '【三千大道系统】',
          (typeof COMMON_DAO_RULES === 'string' ? COMMON_DAO_RULES : ''),
          '【角色初始化特别规则】',
          (typeof CHARACTER_INITIALIZATION_RULES === 'string' ? CHARACTER_INITIALIZATION_RULES : ''),
        ].filter(Boolean).join('\n\n');
        return compactPrompt(parts);
      })();

      const preparedPrompt = compactPrompt(prompt);

      console.log(`【神识印记】调用TavernHelper.generate()方法，将提示词作为系统注入`);
      console.log(`【神识印记-调试】提示词长度(压缩后):`, preparedPrompt.length);
      console.log(`【神识印记-调试】提示词前300字符:`, preparedPrompt.substring(0, 300));
      console.log(`【神识印记-调试】提示词后300字符:`, preparedPrompt.substring(Math.max(0, preparedPrompt.length - 300)));
      
      // 使用TavernHelper.generate()方法，将完整提示词作为系统注入
      const rawResult = await helper.generate({
        user_input: "请按照系统指令执行，生成符合要求的JSON响应。",
        injects: [
          { role: "system", content: systemBundle, position: "in_chat", depth: 0, should_scan: false },
          { role: "system", content: preparedPrompt, position: "in_chat", depth: 0, should_scan: false }
        ],
        should_stream: useStreaming,
        max_chat_history: 0  // 不使用聊天历史，避免干扰
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
          return checked;
        } catch {
          console.warn(`【神识印记】响应中未找到JSON代码块，且无法直接解析为JSON: ${text}`);
          
          // 不再提供fallback响应，直接抛出错误让重试机制处理
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
        return checked;
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`【神识印记】JSON解析失败:`, parseError);
        console.error(`【神识印记】原始JSON字符串:`, jsonStr);
        throw new Error(`JSON解析失败: ${errorMsg}`);
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`【神识印记】第 ${i} 次尝试失败:`, errorMsg);

      if (i < retries) {
        console.log(`【神识印记】准备重试，剩余尝试次数: ${retries - i}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
        continue;
      }

      console.error(`【神识印记】所有重试次数已用尽，生成${typeName}失败`);
      break;
    }
  }

  // 所有重试都失败了
  const errorMsg = `推演${typeName}失败: ${lastError?.message || '未知错误'}`;
  console.error(`【神识印记】${errorMsg}`);

  if (showToast) {
    toast.error(errorMsg);
  }

  return null;
}

/**
 * 将系统规则打包并缓存到酒馆变量，便于后续自动注入
 */
export async function cacheSystemRulesToTavern(scope: 'chat' | 'global' = 'chat'): Promise<void> {
  const buildRulesBundle = (): string => {
    const sections = [
      '【核心规则】',
      (typeof COMMON_CORE_RULES === 'string' ? COMMON_CORE_RULES : ''),
      '【叙事规则】',
      (typeof COMMON_NARRATIVE_RULES === 'string' ? COMMON_NARRATIVE_RULES : ''),
      '【数据操作规则】',
      (typeof COMMON_DATA_MANIPULATION_RULES === 'string' ? COMMON_DATA_MANIPULATION_RULES : ''),
      '【物品系统】',
      (typeof COMMON_ITEM_RULES === 'string' ? COMMON_ITEM_RULES : ''),
      '【NPC系统】',
      (typeof COMMON_NPC_RULES === 'string' ? COMMON_NPC_RULES : ''),
      '【三千大道系统】',
      (typeof COMMON_DAO_RULES === 'string' ? COMMON_DAO_RULES : ''),
      '【角色初始化特别规则】',
      (typeof CHARACTER_INITIALIZATION_RULES === 'string' ? CHARACTER_INITIALIZATION_RULES : ''),
    ].filter(Boolean);
    return sections.join('\n\n');
  };
  try {
    const helper = getTavernHelper();
    const bundle = buildRulesBundle();
    await helper.insertOrAssignVariables({ 'system.rules.bundle': bundle, 'system.rules.version': '1' }, { type: scope });
    console.log('【神识印记】系统规则已写入酒馆变量');
  } catch (e) {
    console.warn('【神识印记】写入酒馆变量失败（不影响运行）:', e);
  }
}
