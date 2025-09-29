/**
 * 中期记忆转换工具
 * 
 * 处理短期记忆到中期记忆的转换逻辑
 * 与酒馆变量系统集成，实现隐藏的中期记忆存储
 */

import { getTavernHelper } from './tavern';
import type { MemoryEntry } from '@/types/game';

export interface MemoryTransitionConfig {
  shortTermLimit: number;        // 短期记忆条数限制
  autoConvertThreshold: number;  // 自动转换阈值
  midTermLimit: number;          // 中期记忆条数限制
}

export class MemoryTransitionManager {
  private static instance: MemoryTransitionManager | null = null;
  
  private config: MemoryTransitionConfig = {
    shortTermLimit: 10,
    autoConvertThreshold: 8,
    midTermLimit: 50
  };

  public static getInstance(): MemoryTransitionManager {
    if (!this.instance) {
      this.instance = new MemoryTransitionManager();
    }
    return this.instance;
  }

  /**
   * 检查存档中的短期记忆，如果超过阈值则转换为中期记忆
   */
  async checkAndConvertMemories(saveData: any): Promise<{
    converted: boolean;
    convertedCount: number;
    totalShortTerm: number;
    totalMidTerm: number;
  }> {
    if (!saveData?.记忆?.短期记忆) {
      return {
        converted: false,
        convertedCount: 0,
        totalShortTerm: 0,
        totalMidTerm: 0
      };
    }

    const shortTermMemories = saveData.记忆.短期记忆;
    const currentMidTerm = saveData.记忆.中期记忆 || [];
    
    if (shortTermMemories.length < this.config.autoConvertThreshold) {
      return {
        converted: false,
        convertedCount: 0,
        totalShortTerm: shortTermMemories.length,
        totalMidTerm: currentMidTerm.length
      };
    }

    // 计算需要转换的记忆条数
    const convertCount = Math.floor(shortTermMemories.length / 2);
    const toConvert = shortTermMemories.slice(0, convertCount);
    
    console.log(`[记忆转换] 开始转换 ${convertCount} 条短期记忆为中期记忆`);

    // 将转换的记忆存储到酒馆变量（隐藏状态）
    await this.storeMemoriesToTavern(toConvert, true);

    // 从短期记忆中移除已转换的
    saveData.记忆.短期记忆 = shortTermMemories.slice(convertCount);

    // 更新中期记忆统计（不直接存储内容，只记录转换信息）
    const conversionRecord = {
      timestamp: new Date().toISOString(),
      convertedCount: convertCount,
      type: 'auto_conversion'
    };

    // 确保中期记忆数组存在
    if (!saveData.记忆.中期记忆) {
      saveData.记忆.中期记忆 = [];
    }

    // 添加转换记录（不是实际内容）
    saveData.记忆.中期记忆.push(`[自动转换] ${new Date().toLocaleString()} 转换了${convertCount}条短期记忆为隐藏中期记忆`);

    // 限制中期记忆记录数量
    if (saveData.记忆.中期记忆.length > this.config.midTermLimit) {
      saveData.记忆.中期记忆 = saveData.记忆.中期记忆.slice(-this.config.midTermLimit);
    }

    console.log(`[记忆转换] 转换完成: ${convertCount} 条记忆已隐藏存储到酒馆变量`);

    return {
      converted: true,
      convertedCount: convertCount,
      totalShortTerm: saveData.记忆.短期记忆.length,
      totalMidTerm: currentMidTerm.length + 1 // +1 for the conversion record
    };
  }

  /**
   * 将记忆存储到酒馆变量（隐藏状态）
   */
  private async storeMemoriesToTavern(memories: string[], isHidden: boolean = true): Promise<void> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        console.warn('[记忆转换] 酒馆助手不可用，跳过中期记忆存储');
        return;
      }

      const timestamp = Date.now();
      const variablesToSet: Record<string, any> = {};

      memories.forEach((memory, index) => {
        const variableName = `mid_term_memory_${timestamp}_${index}`;
        const memoryData = {
          content: memory,
          timestamp: new Date().toISOString(),
          importance: 2, // 默认重要性
          tags: isHidden ? ['converted_from_short', 'hidden'] : ['converted_from_short'],
          hidden: isHidden
        };

        variablesToSet[variableName] = JSON.stringify(memoryData);
      });

      // 批量设置变量
      await helper.insertOrAssignVariables(variablesToSet, { type: 'chat' });
      console.log(`[记忆转换] 已将 ${memories.length} 条记忆存储到酒馆变量`);

    } catch (error) {
      console.error('[记忆转换] 存储记忆到酒馆变量失败:', error);
    }
  }

  /**
   * 获取存储在酒馆变量中的中期记忆（用于AI分析）
   */
  async getHiddenMidTermMemories(): Promise<string[]> {
    try {
      const helper = getTavernHelper();
      if (!helper) return [];

      const variables = await helper.getVariables({ type: 'chat' });
      const hiddenMemories: string[] = [];

      Object.keys(variables).forEach(key => {
        if (key.startsWith('mid_term_memory_')) {
          try {
            const rawData = variables[key];
            const memoryData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            
            // 只获取隐藏的中期记忆
            if (memoryData.hidden && memoryData.content) {
              hiddenMemories.push(memoryData.content);
            }
          } catch (e) {
            console.error('[记忆转换] 解析中期记忆数据失败:', e);
          }
        }
      });

      // 按时间戳排序，最新的在前
      return hiddenMemories.reverse();

    } catch (error) {
      console.error('[记忆转换] 获取隐藏中期记忆失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的中期记忆变量
   */
  async cleanupOldMemories(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const helper = getTavernHelper();
      if (!helper) return 0;

      const variables = await helper.getVariables({ type: 'chat' });
      const now = Date.now();
      let cleanedCount = 0;

      for (const key of Object.keys(variables)) {
        if (key.startsWith('mid_term_memory_')) {
          try {
            const rawData = variables[key];
            const memoryData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            
            if (memoryData.timestamp) {
              const memoryAge = now - new Date(memoryData.timestamp).getTime();
              if (memoryAge > maxAge) {
                await helper.deleteVariable(key, { type: 'chat' });
                cleanedCount++;
              }
            }
          } catch (e) {
            console.error('[记忆转换] 解析记忆数据失败，删除异常变量:', key, e);
            await helper.deleteVariable(key, { type: 'chat' });
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[记忆转换] 清理了 ${cleanedCount} 条过期中期记忆`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('[记忆转换] 清理过期记忆失败:', error);
      return 0;
    }
  }

  /**
   * 获取记忆统计信息
   */
  async getMemoryStats(): Promise<{
    shortTermCount: number;
    midTermCount: number;
    hiddenMidTermCount: number;
    totalTavernVariables: number;
  }> {
    try {
      const helper = getTavernHelper();
      if (!helper) {
        return {
          shortTermCount: 0,
          midTermCount: 0,
          hiddenMidTermCount: 0,
          totalTavernVariables: 0
        };
      }

      const variables = await helper.getVariables({ type: 'chat' });
      let hiddenMidTermCount = 0;
      let totalTavernVariables = 0;

      Object.keys(variables).forEach(key => {
        if (key.startsWith('mid_term_memory_')) {
          totalTavernVariables++;
          try {
            const rawData = variables[key];
            const memoryData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            if (memoryData.hidden) {
              hiddenMidTermCount++;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      });

      return {
        shortTermCount: 0, // 需要从存档数据获取
        midTermCount: 0,   // 需要从存档数据获取
        hiddenMidTermCount,
        totalTavernVariables
      };

    } catch (error) {
      console.error('[记忆转换] 获取记忆统计失败:', error);
      return {
        shortTermCount: 0,
        midTermCount: 0,
        hiddenMidTermCount: 0,
        totalTavernVariables: 0
      };
    }
  }
}

export default MemoryTransitionManager;