/**
 * AI Game Master (游戏主控) 核心工具集
 * 此文件负责构建发送给AI的请求，并解析AI返回的结构化响应。
 */

import { toast } from './toast';
import { set, get, unset, cloneDeep } from 'lodash';
import type { GameCharacter, GM_Request, GM_Response } from '../types/AIGameMaster';

/**
 * 构建一个标准的游戏主控请求 (GM_Request) 对象。
 * 这是发送给AI的“天道请求”。
 * 它负责将创建时的基础角色数据，转换为AI需要的完整 GameCharacter 结构。
 * @param initialCharacter - 创建时保存的基础角色数据
 * @param creationDetails - 包含年龄和描述来源的创建详情
 * @param mapData - 当前世界的地图数据
 * @returns {GM_Request} - 构建完成的请求对象
 */
import type { CharacterBaseInfo } from '@/types/game';

/**
 * 【已废弃/待重构】
 * 构建一个标准的游戏主控请求 (GM_Request) 对象。
 * 这是发送给AI的“天道请求”。
 * 它负责将创建时的基础角色数据，转换为AI需要的完整 GameCharacter 结构。
 * @param baseInfo - 角色的基础静态信息
 * @param creationDetails - 包含年龄和描述来源的创建详情
 * @param mapData - 当前世界的地图数据
 * @returns {GM_Request} - 构建完成的请求对象
 */
export function buildGmRequest(
  baseInfo: CharacterBaseInfo,
  creationDetails: { age: number; originName: string; spiritRootName: string; },
  mapData: any
): GM_Request {

  // 将基础数据转换为完整的 GameCharacter 结构
  const character: GameCharacter = {
    identity: {
      name: baseInfo.名字,
      title: undefined,
      age: creationDetails.age,
      apparent_age: creationDetails.age > 25 ? 25 : creationDetails.age, // 假设25岁后可驻颜
      gender: '未知', // 初始性别未知，待AI设定或玩家选择
      description: '一位初入修行之道的新晋道友。',
    },
    cultivation: {
      realm: '凡人', // 初始境界
      realm_progress: 0,
      lifespan_remaining: 80 - creationDetails.age, // 凡人基础寿命
      breakthrough_bottleneck: '未曾修行',
    },
    attributes: { // 直接从创建数据中获取，添加安全访问
      STR: baseInfo.先天六司?.根骨 || 10,
      CON: baseInfo.先天六司?.心性 || 10,
      DEX: baseInfo.先天六司?.灵性 || 10,
      INT: baseInfo.先天六司?.悟性 || 10,
      SPI: baseInfo.先天六司?.灵性 || 10, // 神魂暂用灵性替代
      LUK: baseInfo.先天六司?.气运 || 10,
    },
    resources: {
      qi: { current: 100, max: 100 }, // 气血
      ling: { current: 0, max: 0 },   // 灵气
      shen: { current: 10, max: 10 },  // 神识
    },
    qualities: {
      origin: { name: creationDetails.originName, effects: [] },
      spiritRoot: { name: creationDetails.spiritRootName, quality: '未知', attributes: [] },
      talents: [], // 初始天赋待AI生成
    },
    skills: {}, // 初始无任何技艺
    cultivation_arts: {}, // 初始无功法
    equipment: {
      accessories: [],
      treasures: [],
      consumables: [],
    },
    social: {
      relationships: {},
      reputation: {},
    },
    hidden_state: {
      karma: { righteous: 0, demonic: 0, heavenly_favor: 0 },
      dao_heart: { stability: 50, demons: [], enlightenment: 0 },
      special_marks: [],
    },
    status: {
      conditions: ['健康'],
      location: '未知',
      activity: '等待降世',
      mood: '迷茫',
    },
  };

  const request: GM_Request = {
    character: character,
    world: {
      lorebook: "...", // TODO: 注入核心世界书内容
      mapInfo: mapData,
      time: "开元元年春" // TODO: 实现动态时间系统
    },
    memory: {
      short_term: [],
      mid_term: [],
      long_term: []
    }
  };
  return request;
}

/**
 * 解析来自AI的游戏主控响应 (GM_Response)，并将其指令应用到一个内存中的 saveData 对象上。
 * 这是“天道响应”的防火墙和解释器，确保所有AI驱动的状态变更都被收敛到单一数据源。
 * @param response - AI返回的GM_Response对象。
 * @param currentSaveData - 当前从酒馆读取的 character.saveData 对象。
 * @returns {Promise<any>} - 返回一个被指令修改过的、新的 saveData 对象。
 */
export async function processGmResponse<T extends object>(response: GM_Response, currentSaveData: T): Promise<T> {
  // 兼容 tavern_commands 为数组或对象（对象支持 set/add/push/pull/delete 分区）
  const toArr = (obj: any): any[] => {
    const out: any[] = [];
    if (!obj || typeof obj !== 'object') return out;
    const pick = (list: any, action: string) => {
      if (!list) return;
      if (Array.isArray(list)) {
        for (const it of list) {
          if (it && typeof it === 'object' && it.key) out.push({ action, scope: it.scope || 'chat', key: it.key, value: it.value });
          else if (Array.isArray(it)) { const [key, value] = it; out.push({ action, scope: 'chat', key, value }); }
        }
      } else if (typeof list === 'object') {
        for (const k of Object.keys(list)) out.push({ action, scope: 'chat', key: k, value: list[k] });
      }
    };
    ['set','add','push','pull','delete'].forEach(op => pick((obj as any)[op], op));
    for (const sec of ['variables','npc','npc_interactions','map','world']) {
      const secObj = (obj as any)[sec];
      if (secObj && typeof secObj === 'object') ['set','add','push','pull','delete'].forEach(op => pick(secObj[op], op));
    }
    return out;
  };
  const commands = Array.isArray((response as any).tavern_commands) ? (response as any).tavern_commands : toArr((response as any).tavern_commands);
  if (!commands || commands.length === 0) {
    console.log('AI响应中无可执行命令（tavern_commands 对象/数组），无需处理。');
    return currentSaveData;
  }
  if (false) {
    console.log('AI响应中无 tavern_commands 指令，无需处理。');
    return currentSaveData; // 没有指令，直接返回原始对象
  }

  // 创建一个深拷贝，以避免修改原始的 Pinia store 状态或传入的对象引用
  (response as any).tavern_commands = commands;
  const newSaveData = cloneDeep(currentSaveData);

  console.log(`接收到 ${commands.length} 条天道法旨，开始在内存中模拟执行...`);

    // 物品写入规范化：仅允许 类型 = 法宝 | 功法 | 其他；确保 物品ID 存在；修正品质结构
    const normalizeItem = (val: any) => {
      if (!val || typeof val !== 'object') return val;
      const mapType = (t: any, name?: any): '法宝' | '功法' | '其他' => {
        const s = String(t || '').trim();
        const n = String(name || '').trim();
        // 强化归类：可穿戴/可持用的基础装备与工具一律归为“法宝”
        // 示例：旧锄头、粗布衣、布衣、草鞋、木棍、短杖、斗笠、披风、帽、头盔等
        if (/(锄头|锄|布衣|粗布衣|衣|袍|披风|斗笠|帽|头盔|盔|护甲|铠甲|甲|护腕|手套|戒指|指环|项链|腰带|鞋|靴|草鞋|木棍|短杖)/.test(n)) {
          return '法宝';
        }
        const w = ['武器','兵器','法器','灵器','宝物','剑','刀','飞剑','木剑'];
        const wear = ['布衣','衣','衣物','甲','盔','头盔','盔甲','披风','护腕','靴','鞋','腰带','戒指','指环','项链','项饰','饰品'];
        const g = ['功法','心法','秘籍','法诀','经书','法门','内功','刀法','剑法','要诀','口诀','心诀','真经','经','诀'];
        if (s === '法宝' || w.includes(s)) return '法宝';
        if (wear.some(k => n.includes(k))) return '法宝';
        if (s === '功法' || g.includes(s)) return '功法';
        return '其他';
      };
      const out: any = { ...val };
      out.名称 = out.名称 || out.name || '未命名物品';
      out.类型 = mapType(out.类型 || out.type, out.名称);
      out.数量 = typeof out.数量 === 'number' && out.数量 > 0 ? out.数量 : 1;
      // 描述兼容
      out.描述 = out.描述 || out.description || out.desc || out.说明 || '';
      if (!out.物品ID) {
        const base = (out.名称 || 'item').replace(/[^a-zA-Z0-9一-龥]/g, '');
        out.物品ID = 'item_' + base + '_' + Math.floor(Math.random()*1e6);
      }
      // 品质修正（兼容 阶位/品质 文本）
      if (!out.品质 || typeof out.品质 !== 'object') {
        out.品质 = { quality: '凡', grade: 1 };
      } else {
        // 将 阶位/品质 字段映射到 quality
        if (!('quality' in out.品质)) {
          const level = out.品质.阶位 || out.品质.品质 || out.品质.quality;
          out.品质.quality = level || '凡';
        }
        if (typeof out.品质.grade !== 'number') {
          const g = out.品质.品级;
          out.品质.grade = typeof g === 'number' ? g : 1;
        }
      }
      // 规范化功法效果（若为功法且AI使用了不同键名）
      if (out.类型 === '功法') {
        const eff = out.功法效果 || out.technique_effect || out.effect || out.effects;
        if (eff && typeof eff === 'object') {
          const e: any = { ...eff };
          const normEff: any = {};
          // 修炼速度加成: 支持多种键名（数值 0-1 或 百分比）
          const spd = e.修炼速度加成 ?? e.cultivation_speed ?? e.speed ?? e.speed_up ?? e.修炼速度;
          if (typeof spd === 'number') {
            normEff.修炼速度加成 = spd > 1 ? spd / 100 : spd; // 百分比转小数
          }
          // 属性加成：支持 attribute_bonus/attributes
          const attrs = e.属性加成 ?? e.attribute_bonus ?? e.attributes ?? e.attr_bonus;
          if (attrs && typeof attrs === 'object') {
            normEff.属性加成 = { ...attrs };
          }
          // 特殊能力：支持 special_abilities/perks
          const abilities = e.特殊能力 ?? e.special_abilities ?? e.perks;
          if (Array.isArray(abilities)) {
            normEff.特殊能力 = abilities.map((x: any) => String(x));
          }
          if (Object.keys(normEff).length > 0) out.功法效果 = normEff;
        }
      }

      return out;
    };

  try {
    // 规范化NPC人物关系对象，保证前端关系网能展示
    const normalizeNpc = (name: string, val: any, current: any) => {
      if (!val || typeof val !== 'object') {
        return {
          角色基础信息: {
            名字: name,
            性别: '未知',
            年龄: undefined,
            世界: current?.角色基础信息?.世界 || '未知',
            天资: '未知',
            出生: '未知',
            灵根: '未知',
            天赋: [],
            先天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }
          },
          外貌描述: '',
          角色存档信息: undefined,
          人物关系: '相识',
          人物好感度: 0,
          人物记忆: [],
          最后互动时间: new Date().toISOString(),
          背包: undefined
        };
      }

      // 已是完整结构则补齐默认值后返回
      if (val.角色基础信息 && typeof val.角色基础信息 === 'object') {
        const base = val.角色基础信息;
        return {
          角色基础信息: {
            名字: base.名字 || name,
            性别: base.性别 || '未知',
            年龄: base.年龄,
            世界: base.世界 || current?.角色基础信息?.世界 || '未知',
            天资: base.天资 || '未知',
            出生: base.出生 || '未知',
            灵根: base.灵根 || '未知',
            天赋: Array.isArray(base.天赋) ? base.天赋 : [],
            先天六司: base.先天六司 || { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 }
          },
          外貌描述: val.外貌描述 || '',
          角色存档信息: val.角色存档信息,
          人物关系: val.人物关系 || '相识',
          人物好感度: typeof val.人物好感度 === 'number' ? val.人物好感度 : 0,
          人物记忆: Array.isArray(val.人物记忆) ? val.人物记忆 : [],
          最后互动时间: val.最后互动时间 || new Date().toISOString(),
          // NPC背包支持
          背包: val.背包 && typeof val.背包 === 'object' ? {
            物品: val.背包.物品 && typeof val.背包.物品 === 'object' ? 
              Object.fromEntries(
                Object.entries(val.背包.物品).map(([k, v]) => [k, normalizeItem(v)])
              ) : {}
          } : undefined
        };
      }

      // 兼容简化/旧格式，如 { type, value, memories }
      const relType = val.人物关系 || val.关系 || val.type || '相识';
      const favor = typeof val.人物好感度 === 'number' ? val.人物好感度
                  : typeof val.好感度 === 'number' ? val.好感度
                  : typeof val.value === 'number' ? val.value
                  : 0;
      const memories = Array.isArray(val.人物记忆) ? val.人物记忆
                      : Array.isArray(val.memories) ? val.memories
                      : [];

        const clamp = (n: any) => {
          const v = Number(n || 0);
          return Math.max(0, Math.min(10, isNaN(v) ? 0 : Math.round(v)));
        };
        return {
          角色基础信息: {
            名字: name,
            性别: val.性别 || '未知',
            年龄: val.年龄,
            世界: current?.角色基础信息?.世界 || '未知',
            天资: '未知',
            出生: '未知',
            灵根: '未知',
            天赋: [],
            先天六司: {
              根骨: clamp((val.先天六司 as any)?.根骨),
              灵性: clamp((val.先天六司 as any)?.灵性),
              悟性: clamp((val.先天六司 as any)?.悟性),
              气运: clamp((val.先天六司 as any)?.气运),
              魅力: clamp((val.先天六司 as any)?.魅力),
              心性: clamp((val.先天六司 as any)?.心性)
            }
          },
        外貌描述: val.外貌描述 || '',
        角色存档信息: undefined,
        人物关系: relType,
        人物好感度: favor,
        人物记忆: memories,
        最后互动时间: new Date().toISOString(),
        // NPC背包支持（简化格式）
        背包: val.背包 && typeof val.背包 === 'object' ? {
          物品: val.背包.物品 && typeof val.背包.物品 === 'object' ? 
            Object.fromEntries(
              Object.entries(val.背包.物品).map(([k, v]) => [k, normalizeItem(v)])
            ) : {}
        } : undefined
      };
    };

    const protectedPaths = new Set([
      '角色基础信息.性别',
      '角色基础信息.名字'
    ]);

    for (const command of commands) {
      // 规范化 key：允许 AI 返回以 character.saveData. 开头的绝对路径
      const rawKey = typeof command.key === 'string' ? command.key.trim() : '';
      let normKey = rawKey;
      if (normKey.startsWith('character.saveData.')) {
        normKey = normKey.substring('character.saveData.'.length);
      } else if (normKey === 'character.saveData' || normKey === '') {
        // 设置整个根对象的命令不在此处处理
        console.log(`跳过无法在内存应用的命令: ${String(command.key)}`);
        continue;
      }
      // 进一步纠正历史/模型可能生成的错误路径，统一到真实的 SaveData 结构
      // 1) 玩家角色状态.寿元.* -> 玩家角色状态.寿命.*
      normKey = normKey.replace('玩家角色状态.寿元.', '玩家角色状态.寿命.');
      // 1.1) 角色状态.* -> 玩家角色状态.*
      normKey = normKey.replace(/^角色状态\./, '玩家角色状态.');
      // 2) 将误写到 玩家角色状态 的先天/出身/灵根/天赋 归并到 角色基础信息
      normKey = normKey.replace('玩家角色状态.先天六司.', '角色基础信息.先天六司.');
      normKey = normKey.replace('玩家角色状态.出身效果', '角色基础信息.出身详情.效果');
      normKey = normKey.replace('玩家角色状态.出身', '角色基础信息.出生');
      normKey = normKey.replace('玩家角色状态.灵根品质', '角色基础信息.灵根详情.quality');
      normKey = normKey.replace('玩家角色状态.灵根属性', '角色基础信息.灵根详情.attributes');
      normKey = normKey.replace('玩家角色状态.天赋', '角色基础信息.天赋');
      normKey = normKey.replace('玩家角色状态.描述', '角色基础信息.描述');

      // 修正误写的 物品.* 到 背包.物品.*
      if ((normKey === '物品' || normKey.startsWith('物品.'))) {
        normKey = normKey.replace(/^物品/, '背包.物品');
      }

      // 当写入背包物品时进行规范化；若命令为 push 到 背包.物品（对象），改为 set 到 背包.物品.{物品ID}
      if ((normKey === '背包.物品' || normKey.startsWith('背包.物品.')) && (command.action === 'push' || command.action === 'set')) {
        try {
          const writeSingle = (keyPath: string, value: any) => {
            const valObj = normalizeItem(value);
            if (keyPath === '背包.物品' || keyPath.endsWith('.')) {
              const itemId = valObj?.物品ID || ('item_' + Math.floor(Math.random() * 1e6));
              set(newSaveData, `背包.物品.${itemId}`, valObj);
              // 自动装备：若物品标记equipped且为法宝，则放入首个空的装备栏
              try {
                if ((value?.equipped === true || valObj?.equipped === true) && valObj?.类型 === '法宝') {
                  const slots = ['法宝1','法宝2','法宝3','法宝4','法宝5','法宝6'];
                  let placed = false;
                  for (const sk of slots) {
                    const cur = get(newSaveData, `装备栏.${sk}`, null);
                    if (!cur || cur === 'null') {
                      set(newSaveData, `装备栏.${sk}`, valObj);
                      unset(newSaveData, `背包.物品.${itemId}`);
                      placed = true;
                      break;
                    }
                  }
                }
              } catch {}
            } else if (keyPath.startsWith('背包.物品.') ) {
              // 处理含多级分类（如 背包.物品.装备.衣物）→ 扁平化到单一物品键
              const rawSuffix = keyPath.substring('背包.物品.'.length);
              const safeId = rawSuffix.includes('.') ? rawSuffix.replace(/\./g, '_') : rawSuffix;
              if (!valObj.物品ID || valObj.物品ID !== safeId) valObj.物品ID = safeId;
              set(newSaveData, `背包.物品.${safeId}`, valObj);
              try {
                if ((value?.equipped === true || valObj?.equipped === true) && valObj?.类型 === '法宝') {
                  const slots = ['法宝1','法宝2','法宝3','法宝4','法宝5','法宝6'];
                  let placed = false;
                  for (const sk of slots) {
                    const cur = get(newSaveData, `装备栏.${sk}`, null);
                    if (!cur || cur === 'null') {
                      set(newSaveData, `装备栏.${sk}`, valObj);
                      unset(newSaveData, `背包.物品.${safeId}`);
                      placed = true;
                      break;
                    }
                  }
                }
              } catch {}
            }
          };

          if (Array.isArray(command.value)) {
            // 数组：逐个写入。若指定到具体key，则首个写到该key，其余生成新ID
            if (normKey.startsWith('背包.物品.') && command.value.length > 0) {
              writeSingle(normKey, command.value[0]);
              for (let i = 1; i < command.value.length; i++) writeSingle('背包.物品', command.value[i]);
            } else {
              for (const v of command.value) writeSingle('背包.物品', v);
            }
          } else {
            writeSingle(normKey, command.value);
          }
          continue; // 已处理
        } catch (e) { console.error('背包物品处理错误', e); }
      }

      // 位置字符串 → 对象规范化
      if (normKey === '玩家角色状态.位置' && command.action === 'set' && typeof command.value === 'string') {
        const curCoord = get(newSaveData, '玩家角色状态.位置.坐标', { X: 0, Y: 0 });
        set(newSaveData, '玩家角色状态.位置', { 描述: String(command.value), 坐标: curCoord });
        continue;
      }

      // 规范化 灵根 对象: 若写入 角色基础信息.灵根 为对象，则拆分为名称与灵根详情
      if (normKey === '角色基础信息.灵根' && command.action === 'set' && command.value && typeof command.value === 'object') {
        const v: any = command.value;
        const name = v.名称 || v.name || '';
        const quality = v.品质 || v.质量 || v.quality;
        const attrs = v.属性 || v.attributes;
        if (name) set(newSaveData, '角色基础信息.灵根', name);
        if (quality) set(newSaveData, '角色基础信息.灵根详情.quality', quality);
        if (attrs) set(newSaveData, '角色基础信息.灵根详情.attributes', attrs);
        continue;
      }

      // 规范化 天赋 数组: 若是对象数组，拆分为名称数组与详情数组
      if (normKey === '角色基础信息.天赋' && command.action === 'set' && Array.isArray(command.value)) {
        const names: string[] = [];
        const details: any[] = [];
        for (const t of command.value) {
          if (t && typeof t === 'object') {
            const n = t.名称 || t.name || '';
            if (n) names.push(n);
            details.push(t);
          } else if (typeof t === 'string') {
            names.push(t);
          }
        }
        set(newSaveData, '角色基础信息.天赋', names);
        if (details.length > 0) set(newSaveData, '角色基础信息.天赋详情', details);
        continue;
      }

      // 社交.关系 映射到 人物关系
      if ((normKey.startsWith('社交.关系.') || normKey === '社交.关系') && (command.action === 'set' || command.action === 'push')) {
        try {
          const name = normKey.split('.').slice(-1)[0] || '无名氏';
          const fixed = normalizeNpc(name, command.value, newSaveData);
          set(newSaveData, `人物关系.${name}`, fixed);
          continue;
        } catch (e) { console.error('社交关系处理错误', e); }
      }

      // 状态效果规范化：字段统一、类型小写、时间规范
      const normalizeStatus = (val: any) => {
        if (!val) return val;
        if (typeof val === 'string') {
          return {
            状态名称: val,
            类型: 'buff',
            时间: '未指定',
            状态描述: ''
          };
        }
        if (typeof val !== 'object') return val;
        const out: any = { ...val };
        if (!out.状态名称) out.状态名称 = out.名称 || out.name || '';
        if (!out.状态描述) out.状态描述 = out.描述 || out.desc || '';
        if (out.类型) out.类型 = String(out.类型).toLowerCase();
        if (out.类型 !== 'buff' && out.类型 !== 'debuff') out.类型 = 'debuff';
        if (!out.时间) {
          if (typeof out.持续时间 === 'number') {
            out.时间 = out.持续时间 < 0 ? '未解除前永远存留' : `${out.持续时间}分钟`;
          } else {
            out.时间 = '未指定';
          }
        }
        delete out.名称; delete out.name; delete out.描述; delete out.desc; delete out.持续时间;
        return out;
      };

      if ((normKey === '玩家角色状态.状态效果' || normKey.startsWith('玩家角色状态.状态效果.')) && (command.action === 'push' || command.action === 'set')) {
        try {
          const val = normalizeStatus(command.value);
          if (command.action === 'push') {
            const arr = get(newSaveData, '玩家角色状态.状态效果', []) as any[];
            if (Array.isArray(arr)) arr.push(val); else set(newSaveData, '玩家角色状态.状态效果', [val]);
            continue;
          } else {
            set(newSaveData, normKey, val);
            continue;
          }
        } catch (e) { console.error('状态效果处理错误', e); }
      }

      // 人物关系规范化写入：人物关系.<姓名> → NpcProfile
      if ((normKey.startsWith('人物关系.') || normKey.startsWith('玩家角色状态.人物关系.')) && (command.action === 'set' || command.action === 'push')) {
        try {
          const name = normKey.split('.').slice(-1)[0] || '无名氏';
          const fixed = normalizeNpc(name, command.value, newSaveData);
          set(newSaveData, normKey, fixed);
          continue;
        } catch (e) { console.error('人物关系处理错误', e); }
      }

      // 保护玩家创角选择：性别/名字始终保护；出生/灵根仅在非“随机”情况下保护
      let skipChange = false;
      if (protectedPaths.has(normKey)) {
        skipChange = true;
      } else if (normKey === '角色基础信息.出生') {
        const cur = get(newSaveData as any, '角色基础信息.出生');
        const isRandom = typeof cur === 'string' && cur.includes('随机');
        skipChange = !isRandom;
      } else if (normKey === '角色基础信息.灵根') {
        const cur = get(newSaveData as any, '角色基础信息.灵根');
        const isRandom = typeof cur === 'string' && cur.includes('随机');
        skipChange = !isRandom;
      } else if (normKey.startsWith('角色基础信息.先天六司')) {
        // 先天六司禁止修改
        skipChange = true;
      }
      if (skipChange) {
        console.warn(`[PROCESS-GM] 跳过对受保护字段的修改: ${normKey}`);
        continue;
      }

      console.log(`内存执行: ${command.action} ${normKey}`, command.value);

      switch (command.action) {
        case 'set':
          set(newSaveData, normKey, command.value);
          break;

        case 'add': {
          const currentValue = Number(get(newSaveData, normKey, 0));
          const valueToAdd = Number(command.value);
          set(newSaveData, normKey, currentValue + valueToAdd);
          break;
        }

        case 'push': {
          const currentArray = get(newSaveData, normKey, []) as any[];
          if (Array.isArray(currentArray)) {
            currentArray.push(command.value);
          } else {
            console.error(`[PROCESS-GM-ERROR] Key "${command.key}" is not an array, cannot push.`);
          }
          break;
        }

        case 'pull': {
          let currentArray = get(newSaveData, normKey, []) as any[];
          if (Array.isArray(currentArray)) {
            const valueToRemove = JSON.stringify(command.value);
            currentArray = currentArray.filter((item: any) => JSON.stringify(item) !== valueToRemove);
            set(newSaveData, normKey, currentArray);
          } else {
            console.error(`[PROCESS-GM-ERROR] Key "${command.key}" is not an array, cannot pull.`);
          }
          break;
        }

        case 'delete':
          unset(newSaveData, normKey);
          break;

        default:
          console.warn(`[PROCESS-GM-WARNING] 未知的指令动作: ${command.action}`);
      }
    }

    console.log("内存执行完毕，返回更新后的 saveData。", newSaveData);
    return newSaveData;

  } catch (error: any) {
    console.error("在内存中执行AI指令时发生严重错误:", error);
    toast.error(`执行天道法旨失败: ${error.message}`);
    // 如果发生错误，返回原始对象，避免状态被污染
    return currentSaveData;
  }
}
