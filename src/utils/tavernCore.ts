import { toast } from './toast';
import type { GM_Response } from '../types/AIGameMaster';

// =======================================================================
//                           核心：酒馆上下文获取
// =======================================================================

/**
 * 诊断AI响应问题的辅助函数
 */
export function diagnoseAIResponse(rawResult: any, typeName: string): void {
  console.log(`【神识印记-诊断】开始诊断${typeName}的AI响应:`, {
    type: typeof rawResult,
    isNull: rawResult === null,
    isUndefined: rawResult === undefined,
    isString: typeof rawResult === 'string',
    isEmpty: typeof rawResult === 'string' && rawResult.trim() === '',
    length: typeof rawResult === 'string' ? rawResult.length : 'N/A',
    hasChoices: rawResult && rawResult.choices,
    choicesLength: rawResult && rawResult.choices ? rawResult.choices.length : 'N/A'
  });

  // 检查是否是OpenAI格式的响应
  if (rawResult && typeof rawResult === 'object' && rawResult.choices) {
    console.log(`【神识印记-诊断】检测到OpenAI格式响应，choices:`, rawResult.choices);
    if (rawResult.choices.length > 0 && rawResult.choices[0].message) {
      console.log(`【神识印记-诊断】第一个choice的消息内容:`, rawResult.choices[0].message.content);
      if (!rawResult.choices[0].message.content || rawResult.choices[0].message.content.trim() === '') {
        console.warn(`【神识印记-诊断】AI返回了空的content，这通常表示模型配置问题或提示词过于复杂`);
      }
    }
  }
}

/**
 * 获取SillyTavern助手API，适配iframe环境。
 * @returns {any} - 返回TavernHelper对象
 */
export function getTavernHelper(): any {
  console.log('【神识印记】开始检查TavernHelper可用性...');
  if (window.parent && (window.parent as any).TavernHelper?.generateRaw) {
    console.log('【神识印记】TavernHelper检查通过，返回对象');
    return (window.parent as any).TavernHelper;
  }

  console.error('【神识印记】TavernHelper检查失败');
  toast.error('感应酒馆助手灵脉失败，请确认在SillyTavern环境中运行！');
  throw new Error('TavernHelper API not found in window.parent.');
}

/**
 * 通用AI生成函数，使用SillyTavern原生斜杠命令绕过系统提示词覆盖
 */
export async function generateItemWithTavernAI<T = any>(
  prompt: string,
  typeName: string,
  showToast: boolean = true,
  retries: number = 2
): Promise<T | null> {
  let lastError: any = null;
  
  console.log(`【神识印记】开始生成${typeName}，使用原生/genraw命令`);
  console.log(`【神识印记-调试】提示词长度: ${prompt?.length || 0} 字符`);
  console.log(`【神识印记-调试】提示词前500字符:`, prompt.substring(0, 500));

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

      console.log(`【神识印记】使用SillyTavern原生/genraw斜杠命令`);
      
      // 使用SillyTavern的原生/genraw命令，它支持instruct=off来禁用指令模板，system参数来设置系统提示词
      // 参考：/genraw [lock=on|off]? [instruct=on|off]?=on [stop=list]? [as=system|char]? [system=string]? [length=number]? (string)
      
      let rawResult;
      
      // 方法1：使用/genraw命令，禁用指令模板，使用我们自己的系统提示词
      try {
        console.log(`【神识印记】方法1：使用/genraw instruct=off system=""`);
        
        // 构建genraw命令：禁用指令模板，清空系统提示词，直接使用我们的提示词
        const genrawCommand = `/genraw instruct=off system="" ${prompt}`;
        
        rawResult = await helper.triggerSlash(genrawCommand);
        
        if (rawResult && typeof rawResult === 'string' && rawResult.trim()) {
          console.log(`【神识印记】方法1成功，结果长度:`, rawResult.length);
        } else {
          throw new Error('方法1返回空结果');
        }
      } catch (error1) {
        console.log(`【神识印记】方法1失败:`, error1?.message || error1);
        
        // 方法2：使用/genraw命令，设置系统提示词为我们的提示词
        try {
          console.log(`【神识印记】方法2：使用/genraw system设定`);
          
          // 将我们的提示词作为system参数传递
          const escapedPrompt = prompt.replace(/"/g, '\\"');
          const genrawCommand = `/genraw instruct=off system="${escapedPrompt}" 请按照系统指令执行。`;
          
          rawResult = await helper.triggerSlash(genrawCommand);
          
          if (rawResult && typeof rawResult === 'string' && rawResult.trim()) {
            console.log(`【神识印记】方法2成功`);
          } else {
            throw new Error('方法2返回空结果');
          }
        } catch (error2) {
          console.log(`【神识印记】方法2失败:`, error2?.message || error2);
          
          // 方法3：直接使用generateRaw但用简化参数
          try {
            console.log(`【神识印记】方法3：使用generateRaw简化参数`);
            
            // 根据@types.txt，generateRaw只支持temperature, top_p, max_tokens参数
            rawResult = await helper.generateRaw(prompt, {
              temperature: 0.1,  // 降低随机性，提高一致性
              max_tokens: 4000
            });
            
            console.log(`【神识印记】方法3成功`);
          } catch (error3) {
            console.log(`【神识印记】方法3失败:`, error3?.message || error3);
            
            // 方法4：回退到最基础的generateRaw调用
            console.log(`【神识印记】方法4：最基础的generateRaw调用`);
            rawResult = await helper.generateRaw(prompt);
          }
        }
      }

      diagnoseAIResponse(rawResult, typeName);

      // 处理OpenAI格式的响应
      let text: string = '';
      if (rawResult && typeof rawResult === 'object' && rawResult.choices && rawResult.choices.length > 0) {
        text = rawResult.choices[0].message?.content || rawResult.choices[0].text || '';
      } else if (typeof rawResult === 'string') {
        text = rawResult;
      } else {
        console.warn(`【神识印记】未识别的AI响应格式，尝试字符串化:`, rawResult);
        text = String(rawResult || '');
      }

      if (!text || text.trim() === '') {
        throw new Error(`AI返回了空的响应内容，响应类型: ${typeof rawResult}`);
      }

      console.log(`【神识印记】AI原始响应文本 (前200字符):`, text.substring(0, 200));

      // 尝试提取JSON
      let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      }

      if (!jsonMatch) {
        // 尝试直接解析整个响应为JSON
        try {
          const parsed = JSON.parse(text.trim());
          if (showToast) {
            toast.success(`${typeName}推演完成！`);
          }
          return parsed;
        } catch {
          console.warn(`【神识印记】响应中未找到JSON代码块，且无法直接解析为JSON: ${text}`);
          
          // 如果是生成初始消息，尝试构造一个基本的GM_Response结构
          if (typeName.includes('天道初言') || typeName.includes('初始消息')) {
            console.log(`【神识印记】尝试从纯文本构造GM_Response结构`);
            const fallbackResponse = {
              text: text.trim(),
              around: "周围环境静谧，空气中弥漫着淡淡的灵气波动。",
              mid_term_memory: "【初始刻印】\n- 角色已进入修仙世界\n- 开始修行之路",
              tavern_commands: []
            } as T;
            console.log(`【神识印记】构造的fallback响应:`, fallbackResponse);
            if (showToast) {
              toast.warning(`${typeName}格式异常，已采用兼容处理`);
            }
            return fallbackResponse;
          }
          
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
        return parsed;
      } catch (parseError: any) {
        console.error(`【神识印记】JSON解析失败:`, parseError);
        console.error(`【神识印记】原始JSON字符串:`, jsonStr);
        throw new Error(`JSON解析失败: ${parseError.message}`);
      }

    } catch (error: any) {
      lastError = error;
      console.error(`【神识印记】第 ${i} 次尝试失败:`, error.message);

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
