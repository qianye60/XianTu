/**
 * @fileoverview 记忆格式配置系统
 * 支持自定义记忆格式模板和解析规则
 */

import { escapeRegExp } from '@/utils/regex';

export interface MemorySection {
  icon: string;
  title: string;
  key: string;
  description: string;
  placeholder: string[];
}

export interface MemoryFormatConfig {
  id: string;
  name: string;
  description: string;
  titleFormat: string; // 如: "【{title}】"
  sections: MemorySection[];
  isDefault?: boolean;
}

/**
 * 预定义的记忆格式配置
 */
export const MEMORY_FORMAT_PRESETS: MemoryFormatConfig[] = [
  {
    id: 'cultivation_start',
    name: '修仙开局记忆',
    description: '适用于角色初始化时的完整记忆记录',
    titleFormat: '【{title}·修仙开局】',
    isDefault: true,
    sections: [
      {
        icon: '🏠',
        title: '家族记忆',
        key: 'family',
        description: '家庭成员和血脉亲情',
        placeholder: [
          '父亲{父亲名}的具体描述和情感联系',
          '母亲{母亲名}的温暖回忆和影响',
          '兄弟姐妹的成长互动记忆'
        ]
      },
      {
        icon: '💫',
        title: '成长印记',
        key: 'growth',
        description: '重要的成长经历和时间节点',
        placeholder: [
          '{年}年{月}月，{重要事件}的时间和地点',
          '与{青梅竹马名}/重要朋友的关键互动',
          '性格形成的关键转折点'
        ]
      },
      {
        icon: '🗺️',
        title: '地域烙印',
        key: 'location',
        description: '重要地点和环境记忆',
        placeholder: [
          '出生地{出生地名}的环境特征和归属感',
          '当前所在地{当前位置}的熟悉程度',
          '印象深刻的地方和经历'
        ]
      },
      {
        icon: '⚡',
        title: '特殊经历',
        key: 'special',
        description: '觉醒、传承等重要经历',
        placeholder: [
          '灵根觉醒/天赋显现的具体时刻',
          '重要传承物品的获得过程（如有）',
          '改变命运的关键事件'
        ]
      },
      {
        icon: '💭',
        title: '内心世界',
        key: 'inner',
        description: '心理状态和情感倾向',
        placeholder: [
          '当前的心境状态和性格倾向',
          '对未来修仙道路的期待或担忧',
          '内心深处的愿望和恐惧'
        ]
      }
    ]
  },
  {
    id: 'adventure_memory',
    name: '历练记忆',
    description: '适用于游戏中的冒险和历练记录',
    titleFormat: '【{title}·历练感悟】',
    sections: [
      {
        icon: '⚔️',
        title: '战斗经历',
        key: 'combat',
        description: '战斗和冲突的记忆',
        placeholder: [
          '与{敌人}的激战过程',
          '生死关头的感悟',
          '实力突破的契机'
        ]
      },
      {
        icon: '🤝',
        title: '人际邂逅',
        key: 'encounter',
        description: '遇见的人和发生的交流',
        placeholder: [
          '与{NPC名}的初次相遇',
          '重要的对话和承诺',
          '情感关系的变化'
        ]
      },
      {
        icon: '🎁',
        title: '收获所得',
        key: 'gains',
        description: '获得的物品、技能和感悟',
        placeholder: [
          '获得{物品名}的经过',
          '领悟{技能/感悟}的过程',
          '实力成长的体现'
        ]
      },
      {
        icon: '🌅',
        title: '心境变化',
        key: 'mindset',
        description: '内心状态的转变',
        placeholder: [
          '对{事件}的新理解',
          '价值观的转变',
          '未来目标的调整'
        ]
      }
    ]
  },
  {
    id: 'simple_memory',
    name: '简单记忆',
    description: '简化的记忆格式，适用于快速记录',
    titleFormat: '【{title}】',
    sections: [
      {
        icon: '📝',
        title: '重要事件',
        key: 'events',
        description: '值得记录的重要事件',
        placeholder: [
          '发生的重要事情',
          '当时的感受和想法',
          '对未来的影响'
        ]
      }
    ]
  }
];

/**
 * 获取默认记忆格式
 */
export function getDefaultMemoryFormat(): MemoryFormatConfig {
  return MEMORY_FORMAT_PRESETS.find(preset => preset.isDefault) || MEMORY_FORMAT_PRESETS[0];
}

/**
 * 根据ID获取记忆格式
 */
export function getMemoryFormat(id: string): MemoryFormatConfig | undefined {
  return MEMORY_FORMAT_PRESETS.find(preset => preset.id === id);
}

/**
 * 生成记忆格式的提示词模板
 */
export function generateMemoryPromptTemplate(config: MemoryFormatConfig, title: string = '记忆片段'): string {
  const formattedTitle = config.titleFormat.replace('{title}', title);
  
  let template = `${formattedTitle}\n\n`;
  
  config.sections.forEach(section => {
    template += `${section.icon} **${section.title}**\n`;
    section.placeholder.forEach(placeholder => {
      template += `- ${placeholder}\n`;
    });
    template += '\n';
  });
  
  return template.trim();
}

/**
 * 解析记忆内容，提取结构化信息
 */
export interface ParsedMemory {
  title?: string;
  sections: { [key: string]: string[] };
  format?: MemoryFormatConfig;
}

export function parseMemoryContent(content: string): ParsedMemory {
  const result: ParsedMemory = {
    sections: {}
  };
  
  // 提取标题
  const titleMatch = content.match(/【([^】]+)】/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }
  
  // 尝试识别使用的格式
  let matchedFormat: MemoryFormatConfig | undefined;
  for (const format of MEMORY_FORMAT_PRESETS) {
    const formatIcons = format.sections.map(s => s.icon);
    const contentHasIcons = formatIcons.some(icon => content.includes(icon));
    if (contentHasIcons) {
      matchedFormat = format;
      break;
    }
  }
  
  if (matchedFormat) {
    result.format = matchedFormat;
    
    // 按照格式解析各个部分
    const allIconsPattern = MEMORY_FORMAT_PRESETS
      .flatMap(f => f.sections.map(s => escapeRegExp(s.icon)))
      .join('|');

    matchedFormat.sections.forEach(section => {
      const sectionRegex = new RegExp(
        `${escapeRegExp(section.icon)}\\s*\\*\\*${escapeRegExp(section.title)}\\*\\*([\\s\\S]*?)(?=${allIconsPattern}|$)`
      );
      const sectionMatch = content.match(sectionRegex);
      
      if (sectionMatch) {
        const sectionContent = sectionMatch[1].trim();
        const items = sectionContent
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(line => line.length > 0);
        
        result.sections[section.key] = items;
      }
    });
  } else {
    // 如果没有识别到特定格式，尝试通用解析
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: string[] = [];
    
    lines.forEach(line => {
      if (line.startsWith('-')) {
        items.push(line.replace(/^-\s*/, ''));
      } else if (!line.includes('【') && !line.includes('】') && !line.includes('**')) {
        items.push(line);
      }
    });
    
    result.sections['general'] = items;
  }
  
  return result;
}

/**
 * 随机化记忆格式模板（用于游戏中的随机性）
 */
export function randomizeMemoryFormat(config: MemoryFormatConfig): MemoryFormatConfig {
  const randomizedSections = [...config.sections];
  
  // 随机打乱部分顺序
  if (Math.random() > 0.5) {
    randomizedSections.sort(() => Math.random() - 0.5);
  }
  
  // 随机选择部分section（保留2-4个）
  const sectionCount = Math.max(2, Math.floor(Math.random() * randomizedSections.length) + 1);
  const selectedSections = randomizedSections.slice(0, sectionCount);
  
  return {
    ...config,
    id: config.id + '_randomized',
    sections: selectedSections
  };
}
