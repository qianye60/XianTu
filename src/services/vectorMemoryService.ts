/**
 * 向量记忆服务
 *
 * 使用本地向量存储实现长期记忆的智能检索
 * 支持标签提取、向量化、相似度检索
 *
 * 特点：
 * - 纯前端实现，使用 IndexedDB 存储
 * - 使用简单的 TF-IDF 向量化（无需外部 API）
 * - 支持标签过滤 + 向量相似度混合检索
 * - 保留全量发送模式作为备选
 */

import { openDB, type IDBPDatabase } from 'idb';

// ============ 类型定义 ============

export interface VectorMemoryEntry {
  id: string;
  content: string;
  tags: string[];
  vector: number[];
  timestamp: number;
  importance: number;
  category: 'combat' | 'social' | 'cultivation' | 'exploration' | 'event' | 'other';
  metadata?: {
    npcs?: string[];
    locations?: string[];
    items?: string[];
    time?: string;
  };
}

export interface MemorySearchResult {
  entry: VectorMemoryEntry;
  score: number;
  matchedTags: string[];
}

export interface VectorMemoryConfig {
  enabled: boolean;
  maxRetrieveCount: number;  // 最多检索多少条
  minSimilarity: number;     // 最低相似度阈值
  tagWeight: number;         // 标签匹配权重 (0-1)
  vectorWeight: number;      // 向量相似度权重 (0-1)
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: VectorMemoryConfig = {
  enabled: false,  // 默认关闭，保留全量发送
  maxRetrieveCount: 10,
  minSimilarity: 0.3,
  tagWeight: 0.4,
  vectorWeight: 0.6,
};

// ============ 中文分词和关键词提取 ============

// 修仙相关关键词词典
const CULTIVATION_KEYWORDS = new Set([
  // 境界
  '凡人', '炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '渡劫', '飞升',
  '初期', '中期', '后期', '圆满', '极境', '突破', '瓶颈',
  // 修炼
  '修炼', '闭关', '悟道', '感悟', '丹田', '经脉', '灵气', '真气', '法力', '神识',
  // 战斗
  '战斗', '交手', '斩杀', '击败', '重伤', '轻伤', '濒死', '陨落',
  // 物品
  '丹药', '法宝', '灵石', '功法', '秘籍', '材料', '灵草',
  // 关系
  '师父', '徒弟', '道友', '敌人', '仇人', '盟友', '宗门', '门派',
  // 地点
  '洞府', '山门', '秘境', '禁地', '坊市', '城池',
  // 事件
  '拜师', '入门', '出关', '历练', '任务', '机缘', '劫难',
]);

// 停用词
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '有', '和', '与', '或', '也', '都', '就', '着', '被', '让',
  '把', '给', '从', '到', '向', '往', '对', '于', '为', '而', '但', '却', '因', '所',
  '这', '那', '它', '他', '她', '我', '你', '们', '自', '其', '此', '彼',
  '一', '个', '些', '很', '更', '最', '非', '不', '无', '没', '未',
]);

/**
 * 简单中文分词（基于词典 + 单字切分）
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // 先提取词典中的关键词
  for (const keyword of CULTIVATION_KEYWORDS) {
    if (text.includes(keyword)) tokens.push(keyword);
  }

  // 提取人名（两到四个汉字，前后没有常见词缀）
  const namePattern = /[\u4e00-\u9fa5]{2,4}/g;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const word = match[0];
    if (!STOP_WORDS.has(word) && !CULTIVATION_KEYWORDS.has(word)) {
      tokens.push(word);
    }
  }

  return [...new Set(tokens)]; // 去重
}

/**
 * 从记忆内容中提取标签
 */
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  const tokens = tokenize(content);

  for (const token of tokens) {
    // 优先添加修仙关键词
    if (CULTIVATION_KEYWORDS.has(token)) {
      tags.push(token);
    }
  }

  // 提取可能的人名（连续2-3个汉字，不在词典中）
  const namePattern = /[\u4e00-\u9fa5]{2,3}/g;
  let match;
  while ((match = namePattern.exec(content)) !== null) {
    const word = match[0];
    if (!STOP_WORDS.has(word) && !CULTIVATION_KEYWORDS.has(word)) {
      // 可能是人名或地名
      if (tags.length < 15) {
        tags.push(word);
      }
    }
  }

  return [...new Set(tags)].slice(0, 20); // 最多20个标签
}

/**
 * 推断记忆分类
 */
export function inferCategory(content: string, tags: string[]): VectorMemoryEntry['category'] {
  const combatKeywords = ['战斗', '交手', '斩杀', '击败', '重伤', '攻击', '防御'];
  const socialKeywords = ['师父', '徒弟', '道友', '拜师', '结交', '好感', '关系'];
  const cultivationKeywords = ['修炼', '闭关', '突破', '感悟', '境界', '功法'];
  const explorationKeywords = ['探索', '发现', '秘境', '历练', '寻找'];
  const eventKeywords = ['机缘', '劫难', '事件', '任务', '完成'];

  const check = (keywords: string[]) =>
    keywords.some(k => content.includes(k) || tags.includes(k));

  if (check(combatKeywords)) return 'combat';
  if (check(socialKeywords)) return 'social';
  if (check(cultivationKeywords)) return 'cultivation';
  if (check(explorationKeywords)) return 'exploration';
  if (check(eventKeywords)) return 'event';
  return 'other';
}

// ============ 向量化 ============

/**
 * 简单的 TF-IDF 向量化
 * 使用预定义词汇表，避免需要全局 IDF 统计
 */
class SimpleVectorizer {
  private vocabulary: string[];
  private wordToIndex: Map<string, number>;

  constructor() {
    // 使用修仙关键词作为词汇表
    this.vocabulary = Array.from(CULTIVATION_KEYWORDS);
    this.wordToIndex = new Map();
    this.vocabulary.forEach((word, index) => {
      this.wordToIndex.set(word, index);
    });
  }

  /**
   * 将文本转换为向量
   */
  vectorize(text: string): number[] {
    const tokens = tokenize(text);
    const vector = new Array(this.vocabulary.length).fill(0);

    // 计算词频
    const wordCount = new Map<string, number>();
    for (const token of tokens) {
      wordCount.set(token, (wordCount.get(token) || 0) + 1);
    }

    // 填充向量
    for (const [word, count] of wordCount) {
      const index = this.wordToIndex.get(word);
      if (index !== undefined) {
        vector[index] = count;
      }
    }

    // L2 归一化
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    return dotProduct; // 已归一化，点积即余弦相似度
  }
}

// ============ 向量记忆服务类 ============

class VectorMemoryService {
  private db: IDBPDatabase | null = null;
  private vectorizer: SimpleVectorizer;
  private config: VectorMemoryConfig;
  private saveSlot: string = '';

  constructor() {
    this.vectorizer = new SimpleVectorizer();
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  /**
   * 初始化数据库
   */
  async init(saveSlot: string): Promise<void> {
    this.saveSlot = saveSlot;
    const dbName = `vector-memory-${saveSlot}`;

    this.db = await openDB(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('memories')) {
          const store = db.createObjectStore('memories', { keyPath: 'id' });
          store.createIndex('tags', 'tags', { multiEntry: true });
          store.createIndex('category', 'category');
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });

    console.log(`[向量记忆] 初始化完成: ${dbName}`);
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('vectorMemoryConfig');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[向量记忆] 加载配置失败，使用默认配置');
    }
  }

  /**
   * 保存配置
   */
  saveConfig(config: Partial<VectorMemoryConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('vectorMemoryConfig', JSON.stringify(this.config));
  }

  /**
   * 获取当前配置
   */
  getConfig(): VectorMemoryConfig {
    return { ...this.config };
  }

  /**
   * 是否启用向量检索
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 添加记忆到向量库
   */
  async addMemory(content: string, importance: number = 5): Promise<VectorMemoryEntry | null> {
    if (!this.db) {
      console.warn('[向量记忆] 数据库未初始化');
      return null;
    }

    const tags = extractTags(content);
    const category = inferCategory(content, tags);
    const vector = this.vectorizer.vectorize(content);

    const entry: VectorMemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      tags,
      vector,
      timestamp: Date.now(),
      importance,
      category,
      metadata: {
        npcs: tags.filter(t => !CULTIVATION_KEYWORDS.has(t)).slice(0, 5),
      },
    };

    await this.db.put('memories', entry);
    console.log(`[向量记忆] 添加记忆: ${content.substring(0, 50)}... 标签: ${tags.join(', ')}`);
    return entry;
  }

  /**
   * 批量导入长期记忆
   */
  async importLongTermMemories(memories: string[]): Promise<number> {
    let count = 0;
    for (const memory of memories) {
      if (memory && memory.trim()) {
        await this.addMemory(memory, 7); // 长期记忆重要性较高
        count++;
      }
    }
    console.log(`[向量记忆] 导入 ${count} 条长期记忆`);
    return count;
  }

  /**
   * 检索相关记忆
   */
  async searchMemories(query: string, context?: {
    currentLocation?: string;
    involvedNpcs?: string[];
    recentEvents?: string[];
  }): Promise<MemorySearchResult[]> {
    if (!this.db || !this.config.enabled) {
      return [];
    }

    const queryTags = extractTags(query);
    const queryVector = this.vectorizer.vectorize(query);

    // 添加上下文标签
    if (context?.involvedNpcs) {
      queryTags.push(...context.involvedNpcs);
    }
    if (context?.currentLocation) {
      queryTags.push(context.currentLocation);
    }

    const allMemories = await this.db.getAll('memories') as VectorMemoryEntry[];
    const results: MemorySearchResult[] = [];

    for (const entry of allMemories) {
      // 计算标签匹配分数
      const matchedTags = entry.tags.filter(t => queryTags.includes(t));
      const tagScore = matchedTags.length / Math.max(queryTags.length, 1);

      // 计算向量相似度
      const vectorScore = this.vectorizer.cosineSimilarity(queryVector, entry.vector);

      // 综合分数
      const score = tagScore * this.config.tagWeight + vectorScore * this.config.vectorWeight;

      if (score >= this.config.minSimilarity) {
        results.push({ entry, score, matchedTags });
      }
    }

    // 按分数排序，取前 N 条
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, this.config.maxRetrieveCount);
  }

  /**
   * 获取所有记忆（用于全量发送模式）
   */
  async getAllMemories(): Promise<VectorMemoryEntry[]> {
    if (!this.db) return [];
    return await this.db.getAll('memories') as VectorMemoryEntry[];
  }

  /**
   * 获取记忆统计
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    topTags: { tag: string; count: number }[];
  }> {
    if (!this.db) {
      return { total: 0, byCategory: {}, topTags: [] };
    }

    const memories = await this.db.getAll('memories') as VectorMemoryEntry[];
    const byCategory: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    for (const mem of memories) {
      byCategory[mem.category] = (byCategory[mem.category] || 0) + 1;
      for (const tag of mem.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      total: memories.length,
      byCategory,
      topTags,
    };
  }

  /**
   * 清空向量库
   */
  async clear(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('memories');
    console.log('[向量记忆] 已清空向量库');
  }

  /**
   * 格式化检索结果为发送给 AI 的文本
   */
  formatForAI(results: MemorySearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    const lines = ['【相关长期记忆】'];
    for (const { entry, matchedTags } of results) {
      const tagStr = matchedTags.length > 0 ? `[${matchedTags.join(',')}]` : '';
      lines.push(`- ${tagStr} ${entry.content}`);
    }
    return lines.join('\n');
  }
}

// 导出单例
export const vectorMemoryService = new VectorMemoryService();
