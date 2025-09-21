/**
 * 游戏数据校验和重试系统
 * 确保AI生成的数据符合预期结构，问题数据直接打回重新生成
 */

// 数据校验规则
export interface ValidationRule {
  path: string;
  type: 'required' | 'type' | 'array' | 'range' | 'enum' | 'custom';
  value?: any;
  message: string;
}

// 校验结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  expected: any;
  received: any;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * 角色基础信息校验规则
 */
export const CHARACTER_BASE_VALIDATION_RULES: ValidationRule[] = [
  { path: '名字', type: 'required', message: '角色名字不能为空' },
  { path: '性别', type: 'enum', value: ['男', '女'], message: '性别必须是男或女' },
  { path: '世界', type: 'required', message: '世界信息不能为空' },
  { path: '天资', type: 'required', message: '天资信息不能为空' },
  { path: '出生', type: 'required', message: '出生信息不能为空' },
  { path: '灵根', type: 'required', message: '灵根信息不能为空' },
  { path: '天赋', type: 'array', message: '天赋必须是数组' },
  { path: '先天六司', type: 'required', message: '先天六司不能为空' },
  { path: '先天六司.根骨', type: 'range', value: [1, 100], message: '根骨数值必须在1-100之间' },
  { path: '先天六司.灵性', type: 'range', value: [1, 100], message: '灵性数值必须在1-100之间' },
  { path: '先天六司.悟性', type: 'range', value: [1, 100], message: '悟性数值必须在1-100之间' },
  { path: '先天六司.气运', type: 'range', value: [1, 100], message: '气运数值必须在1-100之间' },
  { path: '先天六司.魅力', type: 'range', value: [1, 100], message: '魅力数值必须在1-100之间' },
  { path: '先天六司.心性', type: 'range', value: [1, 100], message: '心性数值必须在1-100之间' }
];

/**
 * 世界信息校验规则
 */
export const WORLD_INFO_VALIDATION_RULES: ValidationRule[] = [
  { path: '世界名称', type: 'required', message: '世界名称不能为空' },
  { path: '世界背景', type: 'required', message: '世界背景不能为空' },
  { path: '大陆信息', type: 'array', message: '大陆信息必须是数组' },
  { path: '势力信息', type: 'array', message: '势力信息必须是数组' },
  { path: '地点信息', type: 'array', message: '地点信息必须是数组' },
  { path: '势力信息[].名称', type: 'required', message: '势力名称不能为空' },
  { path: '势力信息[].类型', type: 'required', message: '势力类型不能为空' },
  { path: '势力信息[].等级', type: 'enum', value: ['超级', '一流', '二流', '三流', '末流'], message: '势力等级必须是有效值' },
  { path: '势力信息[].描述', type: 'required', message: '势力描述不能为空' },
  // 强化：宗门页面依赖的结构
  { path: '势力信息[].leadership', type: 'required', message: '宗门领导层信息缺失（leadership）' },
  { path: '势力信息[].memberCount', type: 'required', message: '宗门成员统计信息缺失（memberCount）' },
  { path: '地点信息[].名称', type: 'required', message: '地点名称不能为空' },
  { path: '地点信息[].类型', type: 'required', message: '地点类型不能为空' },
  { path: '地点信息[].描述', type: 'required', message: '地点描述不能为空' }
];

/**
 * 存档数据校验规则
 */
export const SAVE_DATA_VALIDATION_RULES: ValidationRule[] = [
  { path: '玩家角色状态', type: 'required', message: '玩家角色状态不能为空' },
  { path: '装备栏', type: 'required', message: '装备栏不能为空' },
  { path: '背包', type: 'required', message: '背包不能为空' },
  { path: '记忆', type: 'required', message: '记忆系统不能为空' },
  { path: '游戏时间', type: 'required', message: '游戏时间不能为空' },
  { path: '修炼功法', type: 'required', message: '修炼功法不能为空' },
  { path: '玩家角色状态.境界', type: 'required', message: '境界信息不能为空' },
  { path: '玩家角色状态.气血', type: 'required', message: '气血信息不能为空' },
  { path: '玩家角色状态.灵气', type: 'required', message: '灵气信息不能为空' },
  { path: '玩家角色状态.神识', type: 'required', message: '神识信息不能为空' },
  { path: '玩家角色状态.寿命', type: 'required', message: '寿命信息不能为空' },
  { path: '背包.灵石', type: 'required', message: '灵石信息不能为空' },
  { path: '背包.物品', type: 'required', message: '物品信息不能为空' },
  { path: '记忆.短期记忆', type: 'array', message: '短期记忆必须是数组' },
  { path: '记忆.中期记忆', type: 'array', message: '中期记忆必须是数组' },
  { path: '记忆.长期记忆', type: 'array', message: '长期记忆必须是数组' }
];

/**
 * 数据校验器类
 */
export class GameDataValidator {
  
  /**
   * 校验数据
   */
  static validate(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const rule of rules) {
      const result = this.validateRule(data, rule);
      if (result.error) {
        errors.push(result.error);
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 校验单个规则
   */
  private static validateRule(data: any, rule: ValidationRule): { error?: ValidationError; warning?: ValidationWarning } {
    const value = this.getValueByPath(data, rule.path);
    
    // 处理数组元素验证
    if (rule.path.includes('[]') && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemValue = value[i];
        const itemResult = this.validateSingleValue(itemValue, rule, `${rule.path}[${i}]`);
        if (itemResult.error) {
          return itemResult;
        }
      }
      return {}; // 所有数组元素都通过验证
    }
    
    // 处理单个值验证
    return this.validateSingleValue(value, rule, rule.path);
  }
  
  /**
   * 校验单个值
   */
  private static validateSingleValue(value: any, rule: ValidationRule, pathForError: string): { error?: ValidationError; warning?: ValidationWarning } {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            error: {
              path: pathForError,
              message: rule.message,
              expected: '非空值',
              received: value
            }
          };
        }
        break;
        
      case 'type':
        if (typeof value !== rule.value) {
          return {
            error: {
              path: pathForError,
              message: rule.message,
              expected: rule.value,
              received: typeof value
            }
          };
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          return {
            error: {
              path: pathForError,
              message: rule.message,
              expected: 'array',
              received: typeof value
            }
          };
        }
        break;
        
      case 'range':
        if (typeof value === 'number' && rule.value && Array.isArray(rule.value)) {
          const [min, max] = rule.value;
          if (value < min || value > max) {
            return {
              error: {
                path: pathForError,
                message: rule.message,
                expected: `${min}-${max}`,
                received: value
              }
            };
          }
        }
        break;
        
      case 'enum':
        if (rule.value && Array.isArray(rule.value) && !rule.value.includes(value)) {
          return {
            error: {
              path: pathForError,
              message: rule.message,
              expected: rule.value.join(' | '),
              received: value
            }
          };
        }
        break;
    }
    
    return {};
  }
  
  /**
   * 根据路径获取值
   */
  private static getValueByPath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    
    // 处理数组路径，如 '势力信息[].名称'
    if (path.includes('[]')) {
      const [arrayPath, itemPath] = path.split('[].');
      const array = this.getValueByPath(obj, arrayPath);
      if (!Array.isArray(array)) return undefined;
      
      // 对于数组元素验证，我们需要返回数组中所有元素的值进行逐一检查
      const values = [];
      for (const item of array) {
        const itemValue = this.getValueByPath(item, itemPath);
        values.push(itemValue);
      }
      return values; // 返回所有元素的值数组
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * 格式化校验错误为可读文本
   */
  static formatErrors(errors: ValidationError[]): string {
    return errors.map(error => 
      `路径: ${error.path}\n` +
      `错误: ${error.message}\n` +
      `期望: ${error.expected}\n` +
      `实际: ${error.received}\n`
    ).join('\n');
  }
}

/**
 * AI重试生成配置
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  validationRules: ValidationRule[];
  promptTemplate: string;
  fallbackData?: any;
}

/**
 * AI重试生成器
 */
export class AIRetryGenerator {
  
  /**
   * 带重试的AI生成
   */
  static async generateWithRetry<T>(
    generator: () => Promise<T>,
    validator: (data: T) => ValidationResult,
    config: RetryConfig
  ): Promise<{ success: boolean; data?: T; errors?: string[] }> {
    
    const errors: string[] = [];
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      console.log(`[AI重试生成] 第${attempt}次尝试...`);
      
      try {
        // 生成数据
        const data = await generator();
        
        // 校验数据
        const validation = validator(data);
        
        if (validation.isValid) {
          console.log(`[AI重试生成] 第${attempt}次尝试成功！`);
          return { success: true, data };
        } else {
          const errorMsg = `第${attempt}次生成失败:\n${GameDataValidator.formatErrors(validation.errors)}`;
          console.warn(`[AI重试生成] ${errorMsg}`);
          errors.push(errorMsg);
          
          // 如果不是最后一次尝试，等待后重试
          if (attempt < config.maxRetries) {
            await this.delay(config.retryDelay);
          }
        }
        
      } catch (error: any) {
        const errorMsg = `第${attempt}次生成异常: ${error.message}`;
        console.error(`[AI重试生成] ${errorMsg}`);
        errors.push(errorMsg);
        
        if (attempt < config.maxRetries) {
          await this.delay(config.retryDelay);
        }
      }
    }
    
    console.error(`[AI重试生成] 所有尝试都失败了，共${config.maxRetries}次`);
    
    // 如果有fallback数据，返回fallback
    if (config.fallbackData) {
      console.log(`[AI重试生成] 使用fallback数据`);
      return { success: true, data: config.fallbackData };
    }
    
    return { success: false, errors };
  }
  
  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 增强提示词构建器
 */
export class EnhancedPromptBuilder {
  
  /**
   * 构建带数据校验要求的提示词
   */
  static buildValidatedPrompt(
    basePrompt: string,
    validationRules: ValidationRule[],
    previousErrors?: string[]
  ): string {
    let prompt = basePrompt;
    
    // 添加数据结构要求
    prompt += '\n\n## 🚨 数据结构严格要求\n\n';
    prompt += '**必须严格按照以下规则生成数据，违反规则的数据将被拒绝重新生成：**\n\n';
    
    // 根据校验规则生成具体要求
    const requirements = this.generateRequirements(validationRules);
    prompt += requirements;
    
    // 如果有之前的错误，添加错误修正指导
    if (previousErrors && previousErrors.length > 0) {
      prompt += '\n\n## ⚠️ 之前生成中发现的问题\n\n';
      prompt += '**请特别注意修正以下问题：**\n\n';
      previousErrors.forEach((error, index) => {
        prompt += `${index + 1}. ${error}\n\n`;
      });
    }
    
    // 添加JSON格式严格要求
    prompt += '\n\n## 📋 JSON输出格式要求\n\n';
    prompt += '1. **必须是有效的JSON格式**，不能有语法错误\n';
    prompt += '2. **所有字符串必须用双引号包围**\n';
    prompt += '3. **数字类型不能用引号包围**\n';
    prompt += '4. **布尔值必须是true或false，不能用引号**\n';
    prompt += '5. **数组和对象必须正确嵌套**\n';
    prompt += '6. **不能有多余的逗号**\n';
    prompt += '7. **必须以```json开始，以```结束**\n\n';
    
    return prompt;
  }
  
  /**
   * 根据校验规则生成具体要求
   */
  private static generateRequirements(rules: ValidationRule[]): string {
    let requirements = '';
    
    const groupedRules = this.groupRulesByPath(rules);
    
    for (const [pathPrefix, pathRules] of Object.entries(groupedRules)) {
      requirements += `### ${pathPrefix}\n\n`;
      
      for (const rule of pathRules) {
        switch (rule.type) {
          case 'required':
            requirements += `- **${rule.path}**: 必填字段，不能为空\n`;
            break;
          case 'array':
            requirements += `- **${rule.path}**: 必须是数组格式\n`;
            break;
          case 'range':
            if (rule.value && Array.isArray(rule.value)) {
              requirements += `- **${rule.path}**: 数值必须在${rule.value[0]}-${rule.value[1]}之间\n`;
            }
            break;
          case 'enum':
            if (rule.value && Array.isArray(rule.value)) {
              requirements += `- **${rule.path}**: 必须是以下值之一：${rule.value.join(', ')}\n`;
            }
            break;
        }
      }
      
      requirements += '\n';
    }
    
    return requirements;
  }
  
  /**
   * 按路径前缀分组规则
   */
  private static groupRulesByPath(rules: ValidationRule[]): Record<string, ValidationRule[]> {
    const grouped: Record<string, ValidationRule[]> = {};
    
    for (const rule of rules) {
      const prefix = rule.path.split('.')[0] || 'Root';
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(rule);
    }
    
    return grouped;
  }
}
