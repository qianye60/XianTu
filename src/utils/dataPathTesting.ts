/**
 * @fileoverview 酒馆数据路径测试工具
 * 用于验证AI命令执行的路径是否正确
 */

import type { SaveData } from '@/types/game.d';

/**
 * 测试路径访问是否正确
 */
export function testDataPaths() {
  console.log('🧪 [路径测试] 开始测试酒馆数据路径...');
  
  // 模拟一个完整的SaveData结构
  const mockSaveData: SaveData = {
    玩家角色状态: {
      境界: { 等级: 0, 名称: '凡人', 当前进度: 0, 下一级所需: 100, 突破描述: '未曾修行' },
      声望: 0,
      位置: { 描述: '测试位置', 坐标: { X: 100, Y: 100 } },
      气血: { 当前: 100, 最大: 100 },
      灵气: { 当前: 50, 最大: 50 },
      神识: { 当前: 30, 最大: 30 },
      寿命: { 当前: 18, 最大: 80 },
      修为: { 当前: 0, 最大: 100 },
      状态效果: []
    },
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    三千大道: { 已解锁大道: [], 大道进度: {}, 大道路径定义: {} },
    背包: { 
      灵石: { 下品: 10, 中品: 5, 上品: 0, 极品: 0 }, 
      物品: {
        '测试物品': {
          物品ID: '测试物品',
          名称: '测试丹药',
          类型: '其他',
          品质: { quality: '黄', grade: 1 },
          数量: 3,
          描述: '测试用的丹药'
        }
      }
    },
    人物关系: {},
    宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] },
    记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] },
    游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: 0, 分钟: 0 },
    修炼功法: { 功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0 }
  };

  const testPaths = [
    // 基础属性路径
    { path: '玩家角色状态.气血.当前', expected: 100 },
    { path: '玩家角色状态.灵气.最大', expected: 50 },
    { path: '玩家角色状态.境界.名称', expected: '凡人' },
    
    // 背包路径 - 关键测试！
    { path: '背包.灵石.下品', expected: 10 },
    { path: '背包.物品.测试物品.名称', expected: '测试丹药' },
    
    // 装备路径
    { path: '装备栏.装备1', expected: null },
    
    // 记忆路径
    { path: '记忆.短期记忆', expected: [] },
  ];

  console.log('🧪 [路径测试] 测试路径访问...');
  
  for (const test of testPaths) {
    try {
      const value = getNestedValue(mockSaveData, test.path);
      const success = JSON.stringify(value) === JSON.stringify(test.expected);
      
      console.log(`${success ? '✅' : '❌'} [路径测试] ${test.path}:`, {
        expected: test.expected,
        actual: value,
        success
      });
    } catch (error) {
      console.error(`❌ [路径测试] ${test.path} 访问失败:`, error);
    }
  }
  
  console.log('🧪 [路径测试] 测试完成');
}

/**
 * 通过路径获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * 验证路径格式是否符合要求
 */
export function validatePathFormat(command: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查是否有variable和path字段
  if (!command.variable) {
    errors.push('缺少 variable 字段');
  }
  
  if (!command.path) {
    errors.push('缺少 path 字段');
  }
  
  // 检查variable是否为character.saveData
  if (command.variable !== 'character.saveData') {
    errors.push(`variable 应为 "character.saveData"，当前为 "${command.variable}"`);
  }
  
  // 检查path是否以正确的前缀开始
  const validPrefixes = [
    '玩家角色状态.',
    '背包.',
    '装备栏.',
    '记忆.',
    '人物关系.',
    '修炼功法.',
    '宗门系统.',
    '三千大道.'
  ];
  
  if (command.path && !validPrefixes.some(prefix => command.path.startsWith(prefix))) {
    errors.push(`路径格式错误。当前路径: "${command.path}"，应以以下前缀之一开始: ${validPrefixes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export const DataPathTesting = {
  testDataPaths,
  validatePathFormat,
};