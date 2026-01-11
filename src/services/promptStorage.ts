/**
 * 提示词存储服务 - 使用IndexedDB
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { getSystemPrompts, PROMPT_CATEGORIES, type PromptDefinition } from './defaultPrompts';

interface PromptsDB extends DBSchema {
  prompts: {
    key: string;
    value: {
      key: string;
      content: string;
      modified: boolean;
      enabled: boolean;
      weight?: number; // 添加权重字段
      updatedAt: string;
    };
  };
}

export interface PromptItem {
  key: string;
  name: string;
  content: string;
  modified: boolean;
  enabled: boolean;
  default: string;
  category: string;
  description?: string;
  order?: number;
  weight?: number;
}

export interface PromptsByCategory {
  [category: string]: {
    info: {
      name: string;
      description: string;
      icon: string;
    };
    prompts: PromptItem[];
  };
}

class PromptStorage {
  private db: IDBPDatabase<PromptsDB> | null = null;

  async init() {
    if (this.db) return;
    this.db = await openDB<PromptsDB>('dad-prompts', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('prompts')) {
          db.createObjectStore('prompts', { keyPath: 'key' });
        }
      }
    });
  }

  /**
   * 加载所有提示词（平铺结构）
   */
  async loadAll(): Promise<Record<string, PromptItem>> {
    await this.init();
    const defaults = getSystemPrompts();
    const result: Record<string, PromptItem> = {};

    for (const key in defaults) {
      const saved = await this.db!.get('prompts', key);
      const currentContent = saved?.content || defaults[key].content;
      // enabled 默认为 true，只有明确设置为 false 时才禁用
      const isEnabled = saved?.enabled !== false;
      // 权重：优先使用用户保存的，否则使用默认值
      const currentWeight = saved?.weight !== undefined ? saved.weight : defaults[key].weight;
      result[key] = {
        key,
        name: defaults[key].name,
        content: currentContent,
        modified: !!saved && saved.content !== defaults[key].content,
        enabled: isEnabled,
        default: defaults[key].content,
        category: defaults[key].category,
        description: defaults[key].description,
        order: defaults[key].order,
        weight: currentWeight
      };
    }

    return result;
  }

  /**
   * 按分类加载所有提示词
   */
  async loadByCategory(): Promise<PromptsByCategory> {
    await this.init();
    const allPrompts = await this.loadAll();
    const result: PromptsByCategory = {};

    // 初始化分类
    for (const [categoryKey, categoryInfo] of Object.entries(PROMPT_CATEGORIES)) {
      result[categoryKey] = {
        info: categoryInfo,
        prompts: []
      };
    }

    // 按分类整理提示词
    for (const key in allPrompts) {
      const prompt = allPrompts[key];
      const category = prompt.category;
      if (result[category]) {
        result[category].prompts.push(prompt);
      } else {
        // 未知分类，放到第一个分类
        const firstCategory = Object.keys(result)[0];
        if (firstCategory) {
          result[firstCategory].prompts.push(prompt);
        }
      }
    }

    // 按 order 排序
    for (const category in result) {
      result[category].prompts.sort((a, b) => (a.order || 999) - (b.order || 999));
    }

    return result;
  }

  async save(key: string, content: string, enabled: boolean = true, weight?: number) {
    await this.init();
    await this.db!.put('prompts', {
      key,
      content,
      modified: true,
      enabled,
      weight,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 切换提示词启用状态
   */
  async setEnabled(key: string, enabled: boolean) {
    await this.init();
    const defaults = getSystemPrompts();
    const saved = await this.db!.get('prompts', key);
    const content = saved?.content || defaults[key]?.content || '';
    const modified = saved?.modified || false;

    await this.db!.put('prompts', {
      key,
      content,
      modified,
      enabled,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 获取启用的提示词列表
   */
  async getEnabledPrompts(): Promise<string[]> {
    const allPrompts = await this.loadAll();
    return Object.keys(allPrompts).filter(key => allPrompts[key].enabled);
  }

  async get(key: string): Promise<string> {
    await this.init();
    const defaults = getSystemPrompts();
    const saved = await this.db!.get('prompts', key);

    if (saved?.enabled === false) {
      return '';
    }

    // 如果有保存且标记为已修改，使用用户自定义内容
    // 否则始终使用最新的默认值（确保代码更新后提示词也更新）
    if (saved?.modified) {
      return saved.content;
    }

    return defaults[key]?.content || '';
  }

  async reset(key: string) {
    await this.init();
    await this.db!.delete('prompts', key);
  }

  async resetAll() {
    await this.init();
    await this.db!.clear('prompts');
  }

  /**
   * 导出所有提示词
   */
  async exportAll(): Promise<Record<string, string>> {
    const allPrompts = await this.loadAll();
    const result: Record<string, string> = {};
    for (const key in allPrompts) {
      result[key] = allPrompts[key].content;
    }
    return result;
  }

  /**
   * 导入提示词
   */
  async importPrompts(data: Record<string, string>): Promise<number> {
    await this.init();
    const defaults = getSystemPrompts();
    let importCount = 0;

    for (const key in data) {
      // 只导入已知的提示词键
      if (defaults[key]) {
        await this.save(key, data[key]);
        importCount++;
      }
    }

    return importCount;
  }
}

export const promptStorage = new PromptStorage();
