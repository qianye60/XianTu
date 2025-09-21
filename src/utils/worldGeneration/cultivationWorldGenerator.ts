/**
 * @fileoverview 修仙世界势力生成模板
 * 包含真实的修仙世界势力类型和生成逻辑
 */

import { getTavernHelper } from '../tavern';
import type { CultivationWorldSettings } from './gameWorldConfig';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig } from './enhancedWorldPrompts';
import { calculateSectData, type SectCalculationData } from './sectDataCalculator';
import type { WorldInfo, WorldContinent, WorldFaction, WorldLocation, WorldGenerationInfo } from '@/types/game.d';

/**
 * 真实修仙世界势力生成器
 */
export class CultivationWorldGenerator {
  private worldSettings: CultivationWorldSettings;
  private characterBackground?: string;
  private userConfig?: any; // 用户自定义配置
  
  constructor(settings: CultivationWorldSettings, characterBackground?: string, userConfig?: any) {
    this.worldSettings = settings;
    this.characterBackground = characterBackground;
    this.userConfig = userConfig;
    
    console.log('[修仙世界生成器] 初始化配置:', {
      characterBackground,
      userConfig
    });
  }

  /**
   * 生成完整的修仙世界
   */
  async generateWorld(): Promise<any> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('酒馆系统不可用');
    }

    // 构建世界生成提示词
    const worldPrompt = this.buildWorldGenerationPrompt();
    
    // 添加完整提示词的日志输出
    console.log('[修仙世界生成器] 完整提示词长度:', worldPrompt.length);
    console.log('[修仙世界生成器] 完整提示词内容:');
    console.log('='.repeat(50));
    console.log(worldPrompt);
    console.log('='.repeat(50));

    try {
      // 调用AI生成世界
      const response = await tavern.generateRaw({
        user_input: worldPrompt,
        custom_api: {
          temperature: 0.8
        }
      });

      console.log('[修仙世界生成器] AI响应:', response);

      // 解析并保存世界数据
      await this.parseAndSaveWorldData(String(response));

      return {
        success: true,
        message: '修仙世界生成完成',
        settings: this.worldSettings
      };

    } catch (error: any) {
      console.error('[修仙世界生成器] 生成失败:', error);
      
      // 提供更详细的错误信息
      if (error?.message === 'Bad Request') {
        throw new Error('API请求格式错误，可能是提示词过长或包含无效字符');
      } else if (error?.message && error.message.includes('token')) {
        throw new Error('API token 无效或已过期');
      } else if (error?.message && error.message.includes('timeout')) {
        throw new Error('API请求超时，请稍后重试');
      } else {
        throw new Error(`世界生成失败: ${error?.message || '未知错误'}`);
      }
    }
  }

  private buildWorldGenerationPrompt(): string {
    // 构建配置对象
    const promptConfig: WorldPromptConfig = {
      factionCount: this.userConfig?.majorFactionsCount || 7,
      totalLocations: this.userConfig?.totalLocations || 25,
      secretRealms: this.userConfig?.secretRealmsCount || 8,
      characterBackground: this.characterBackground,
      worldBackground: this.userConfig?.worldBackground,
      worldEra: this.userConfig?.worldEra,
      worldName: this.userConfig?.worldName
    };
    
    // 使用增强提示词构建器（按原样返回提示词内容）
    return EnhancedWorldPromptBuilder.buildPrompt(promptConfig);
  }

  /**
   * 解析并保存世界数据到character.saveData中
   */
  private async parseAndSaveWorldData(response: string): Promise<void> {
    const tavern = getTavernHelper();
    if (!tavern) {
      console.warn('[修仙世界生成器] 无法获取酒馆助手，跳过数据保存');
      return;
    }

    try {
      console.log('[修仙世界生成器] 开始解析AI响应:', response.substring(0, 500));
      
      // 初始化worldData为空对象，确保后续fallback逻辑能正确执行
      let worldData: any = {};
      
      try {
        // 尝试从响应中提取JSON数据
        let jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (!jsonMatch) {
          // 尝试匹配没有代码块标记的JSON
          jsonMatch = response.match(/(\{[\s\S]*"locations"\s*:\s*\[[\s\S]*?\}\s*\][\s\S]*?\})/);
        }
        
        if (jsonMatch) {
          worldData = JSON.parse(jsonMatch[1]);
          console.log('[修仙世界生成器] 成功解析AI返回的世界数据:', worldData);
          console.log('[修仙世界生成器] 大陆数量:', worldData.continents?.length || 0);
          console.log('[修仙世界生成器] 势力数量:', worldData.factions?.length || 0);
          console.log('[修仙世界生成器] 地点数量:', worldData.locations?.length || 0);
        } else {
          console.warn('[修仙世界生成器] 无法从AI响应中提取JSON数据，将使用完整fallback数据');
        }
      } catch (parseError) {
        console.warn('[修仙世界生成器] JSON解析失败，将使用完整fallback数据:', parseError);
        worldData = {}; // 确保使用空对象，触发所有fallback逻辑
      }
      
      // 详细检查AI返回的数据结构
      if (!worldData.continents || !Array.isArray(worldData.continents)) {
        console.error('[修仙世界生成器] AI未返回有效的continents数组:', worldData.continents);
      }
      if (!worldData.factions || !Array.isArray(worldData.factions)) {
        console.error('[修仙世界生成器] AI未返回有效的factions数组:', worldData.factions);
      }
      if (!worldData.locations || !Array.isArray(worldData.locations)) {
        console.error('[修仙世界生成器] AI未返回有效的locations数组:', worldData.locations);
      }
      
      // [数据验证] 检查AI生成的数据质量
      console.log('[修仙世界生成器] 开始验证AI生成的数据质量...');
      
      // 验证大陆信息
      if (!worldData.continents || !Array.isArray(worldData.continents) || worldData.continents.length === 0) {
        console.error('[修仙世界生成器] AI未生成有效的大陆信息');
        throw new Error('AI生成的世界数据缺少大陆信息，请重试');
      }
      
      // 验证势力信息
      if (!worldData.factions || !Array.isArray(worldData.factions) || worldData.factions.length === 0) {
        console.error('[修仙世界生成器] AI未生成有效的势力信息');
        throw new Error('AI生成的世界数据缺少势力信息，请重试');
      }
      
      // 验证地点信息
      if (!worldData.locations || !Array.isArray(worldData.locations) || worldData.locations.length === 0) {
        console.error('[修仙世界生成器] AI未生成有效的地点信息');
        throw new Error('AI生成的世界数据缺少地点信息，请重试');
      }
      
      console.log('[修仙世界生成器] 检查完成，最终数组大小:', {
        大陆: worldData.continents?.length || 0,
        势力: worldData.factions?.length || 0,
        地点: worldData.locations?.length || 0
      });
      
      // 构建规范化的世界信息数据结构
      const worldInfo: WorldInfo = {
        世界名称: worldData.world_name || this.userConfig?.worldName || '修仙界',
        世界背景: worldData.world_background || this.userConfig?.worldBackground || '',
        大陆信息: (worldData.continents || []).map((continent: any): WorldContinent => ({
          名称: continent.name || continent.名称,
          描述: continent.description || continent.描述,
          地理特征: continent.terrain_features || continent.geography || continent.地理特征,
          修真环境: continent.cultivation_environment || continent.修真环境,
          气候: continent.climate,
          天然屏障: continent.natural_barriers,
          大洲边界: continent.continent_bounds
        })),
        势力信息: (worldData.factions || []).map((faction: any): WorldFaction => {
          // 清洗势力境界：仅保留 凡人→渡劫，移除“大乘”“真仙”等更高境界
          const sanitizeRealmName = (name?: string) => {
            if (!name || typeof name !== 'string') return name as any;
            const base = name.replace(/(初期|中期|后期|圆满|极境)/g, '');
            const suffixMatch = name.match(/(初期|中期|后期|圆满|极境)/);
            const suffix = suffixMatch ? suffixMatch[1] : '';
            if (base.includes('大乘') || base.includes('真仙')) {
              return `渡劫${suffix}`.trim();
            }
            return name;
          };

          const sanitizeByRealm = (byRealm: any) => {
            if (!byRealm || typeof byRealm !== 'object') return byRealm;
            const cleaned: Record<string, number> = { ...byRealm } as any;
            let moved = 0;
            if (Object.prototype.hasOwnProperty.call(cleaned, '大乘')) {
              moved += Number((cleaned as any)['大乘']) || 0;
              delete (cleaned as any)['大乘'];
            }
            if (Object.prototype.hasOwnProperty.call(cleaned, '真仙')) {
              moved += Number((cleaned as any)['真仙']) || 0;
              delete (cleaned as any)['真仙'];
            }
            if (moved > 0) {
              (cleaned as any)['渡劫'] = (Number((cleaned as any)['渡劫']) || 0) + moved;
            }
            return cleaned;
          };

          // 统一“最强修为”和成员分布的一致性：以成员分布为准
          const allowedOrder = ['练气','筑基','金丹','元婴','化神','炼虚','合体','渡劫'];
          const realmIndex = (r: string) => {
            const base = r.replace(/(初期|中期|后期|圆满|极境)/g, '');
            const idx = allowedOrder.indexOf(base);
            return idx === -1 ? -1 : idx;
          };
          const highestFromMembers = (byRealm: Record<string, number> | undefined): string | null => {
            if (!byRealm) return null;
            let highest: string | null = null;
            let maxIdx = -1;
            for (const [realm, count] of Object.entries(byRealm)) {
              const idx = realmIndex(realm);
              if ((Number(count) || 0) > 0 && idx > maxIdx) {
                maxIdx = idx;
                highest = realm;
              }
            }
            if (highest) {
              const base = highest.replace(/(初期|中期|后期|圆满|极境)/g, '');
              return `${base}后期`;
            }
            return null;
          };

          if (faction?.leadership) {
            faction.leadership.宗主修为 = sanitizeRealmName(faction.leadership.宗主修为);
            faction.leadership.最强修为 = sanitizeRealmName(faction.leadership.最强修为);
          }
          if (faction?.memberCount?.byRealm) {
            faction.memberCount.byRealm = sanitizeByRealm(faction.memberCount.byRealm);
          }

          // 校正“最强修为”与成员分布一致
          const highest = highestFromMembers(faction?.memberCount?.byRealm);
          if (highest) {
            const currentMaxIdx = realmIndex(faction?.leadership?.最强修为 || '');
            const memberMaxIdx = realmIndex(highest);
            if (memberMaxIdx > currentMaxIdx) {
              if (!faction.leadership) (faction as any).leadership = {};
              (faction.leadership as any).最强修为 = highest;
            }
          }
          // 先准备计算数据
          const calcData: SectCalculationData = {
            名称: faction.name || faction.名称,
            类型: faction.type || faction.类型 || '中立宗门',
            等级: faction.level || faction.等级 || '三流',
            宗主修为: faction.leadership?.宗主修为,
            最强修为: faction.leadership?.最强修为,
            长老数量: faction.leadership?.长老数量,
            核心弟子数: faction.leadership?.核心弟子数,
            内门弟子数: faction.leadership?.内门弟子数,
            外门弟子数: faction.leadership?.外门弟子数
          };

          // 使用算法计算声望值和战力
          const calculatedData = calculateSectData(calcData);
          
          return {
            名称: faction.name || faction.名称,
            类型: faction.type || faction.类型 || '中立宗门',
            等级: faction.level || faction.等级 || '三流',
            位置: faction.headquarters?.coordinates || faction.headquarters || faction.location || faction.位置,
            势力范围: faction.territory_bounds || faction.territory || faction.势力范围 || [],
            描述: faction.description || faction.描述,
            特色: faction.specialties || faction.features || faction.特色,
            与玩家关系: faction.player_relationship || faction.与玩家关系 || '中立',
            
            // 使用算法计算的可靠数值
            声望值: calculatedData.声望值,
            
            // 新增字段映射
            specialties: faction.specialties || (Array.isArray(faction.特色) ? faction.特色 : [faction.特色].filter(Boolean)),
            
            // 成员统计
            memberCount: faction.memberCount ? {
              total: faction.memberCount.total || 0,
              byRealm: faction.memberCount.byRealm || {},
              byPosition: faction.memberCount.byPosition || {}
            } : undefined,
            
            // 宗门领导层
            leadership: faction.leadership ? {
              宗主: faction.leadership.宗主,
              宗主修为: faction.leadership.宗主修为,
              副宗主: faction.leadership.副宗主,
              长老数量: faction.leadership.长老数量 || 0,
              最强修为: faction.leadership.最强修为,
              综合战力: calculatedData.综合战力, // 使用算法计算的可靠数值
              核心弟子数: faction.leadership.核心弟子数,
              内门弟子数: faction.leadership.内门弟子数,
              外门弟子数: faction.leadership.外门弟子数
            } : undefined,
            
            // 势力范围详情
            territoryInfo: faction.territoryInfo ? {
              controlledAreas: faction.territoryInfo.controlledAreas || [],
              influenceRange: faction.territoryInfo.influenceRange,
              strategicValue: faction.territoryInfo.strategicValue
            } : undefined,
            
            // 加入相关
            canJoin: faction.canJoin !== undefined ? faction.canJoin : true,
            joinRequirements: faction.joinRequirements || [],
            benefits: faction.benefits || []
          };
        }),
        地点信息: (worldData.locations || []).map((location: any): WorldLocation => ({
          名称: location.name || location.名称,
          类型: location.type || location.类型 || '其他',
          位置: location.coordinates || location.position || location.位置,
          coordinates: location.coordinates, // 保留原始坐标数据供地图使用
          描述: location.description || location.描述,
          特色: location.features || location.特色,
          安全等级: location.danger_level || location.safety_level || location.安全等级 || '较安全',
          开放状态: location.status || location.开放状态 || '开放',
          相关势力: location.controlled_by ? [location.controlled_by] : (location.related_factions || location.相关势力 || []),
          特殊功能: location.special_attributes || location.special_functions || location.特殊功能 || []
        })),
        生成信息: {
          生成时间: new Date().toISOString(),
          世界纪元: worldData.world_era || this.userConfig?.worldEra || '修仙纪元',
          特殊设定: worldData.special_settings || [],
          版本: '1.0'
        } as WorldGenerationInfo
      };

      console.log('🎯 [玩家出生地处理] 已禁用：地图生成阶段不处理玩家出生地');
      
      // 处理玩家出生地数据
      if (false && worldData.player_spawn && worldData.player_spawn.birth_location) {
        const birthLocation = worldData.player_spawn.birth_location;
        console.log('🎯 [玩家出生地处理] 找到出生地数据:', birthLocation);
        
        // 验证出生地坐标是否在大陆内部
        const isValidCoordinate = this.validateBirthLocationInContinent(
          birthLocation.coordinates,
          worldData.player_spawn.continent_id,
          worldData.continents
        );
        
        if (!isValidCoordinate) {
          console.warn('🎯 [玩家出生地处理] 出生地坐标不在指定大陆内部，尝试调整坐标');
          // 如果坐标不在大陆内，尝试使用大陆中心点附近的坐标
          const adjustedCoords = this.adjustBirthLocationToContinent(
            worldData.player_spawn.continent_id,
            worldData.continents
          );
          if (adjustedCoords) {
            birthLocation.coordinates = adjustedCoords;
            console.log('🎯 [玩家出生地处理] 已调整出生地坐标为:', adjustedCoords);
          }
        }
        
        // 保存玩家出生地信息（已禁用）
        // 保留样例结构，避免语法错误
        // (worldInfo as any).玩家出生地 = {
        //   大陆ID: worldData.player_spawn.continent_id,
        //   出生地名称: birthLocation.name,
        //   出生地类型: birthLocation.type,
        //   坐标: birthLocation.coordinates,
        //   描述: birthLocation.description,
        //   安全等级: birthLocation.safety_level,
        //   显著特征: birthLocation.notable_features || [],
        //   附近地标: birthLocation.nearby_landmarks || [],
        //   人口规模: birthLocation.population,
        //   管辖情况: birthLocation.governance
        // };
      } else if (false) {
        console.warn('🎯 [玩家出生地处理] AI未生成玩家出生地数据，将使用默认设置');
        
        // 创建默认出生地点，尝试放在第一个大陆的中心附近
        let defaultCoords = { longitude: 110.5, latitude: 35.0 };
        if (worldData.continents && worldData.continents.length > 0) {
          const firstContinent = worldData.continents[0];
          if (firstContinent.continent_bounds && Array.isArray(firstContinent.continent_bounds)) {
            // 计算第一个大陆的中心点
            const bounds = firstContinent.continent_bounds;
            const centerLng = bounds.reduce((sum: number, p: any) => sum + p.longitude, 0) / bounds.length;
            const centerLat = bounds.reduce((sum: number, p: any) => sum + p.latitude, 0) / bounds.length;
            defaultCoords = { longitude: centerLng, latitude: centerLat };
            console.log('🎯 [玩家出生地处理] 使用第一个大陆的中心点作为默认出生地:', defaultCoords);
          }
        }
        
        // 创建默认出生地点（已禁用）
        // (worldInfo as any).玩家出生地 = {
        //   大陆ID: worldData.continents?.[0]?.id || 'unknown',
        //   出生地名称: '无名村落',
        //   出生地类型: 'village',
        //   坐标: defaultCoords,
        //   描述: '一个偏远的无名村落，民风淳朴，远离修仙界的纷争',
        //   安全等级: '安全',
        //   显著特征: ['民风淳朴', '远离纷争', '环境宁静'],
        //   附近地标: [],
        //   人口规模: '数十户人家',
        //   管辖情况: '无人管辖的自治村落'
        // };
      }

      // 初始化时直接删除现有的character.saveData，创建全新的完整架构
      console.log('[修仙世界生成器] 正在清除现有数据并创建全新的完整角色架构');
      
      // 先删除现有的 character.saveData
      try {
        await tavern.deleteVariable('character.saveData', { type: 'chat' });
        console.log('[修仙世界生成器] 已清除现有的character.saveData');
      } catch (error) {
        console.log('[修仙世界生成器] character.saveData不存在或清除失败，继续创建新架构');
      }
      
      // 创建全新的完整角色数据架构
      const newSaveData = {
        // 角色基础信息
        角色基础信息: {
          名字: '',
          性别: '',
          年龄: 0,
          出生: '',
          灵根: '',
          天赋: [],
          天资: '',
          先天六司: {
            根骨: 0,
            灵性: 0,
            悟性: 0,
            气运: 0,
            魅力: 0,
            心性: 0
          }
        },
        
        // 玩家角色状态
        玩家角色状态: {
          境界: {
            等级: 0,
            名称: '凡人',
            当前进度: 0,
            下一级所需: 10,
            突破描述: ''
          },
          声望: 0,
          位置: {
            描述: '',
            坐标: { X: 0, Y: 0 }
          },
          气血: { 当前: 100, 最大: 100 },
          灵气: { 当前: 50, 最大: 50 },
          神识: { 当前: 30, 最大: 30 },
          寿命: { 当前: 18, 最大: 100 },
          修为: { 当前: 0, 最大: 10 },
          状态效果: []
        },
        
        // 装备栏
        装备栏: {
          装备1: null,
          装备2: null, 
          装备3: null,
          装备4: null,
          装备5: null,
          装备6: null
        },
        
        // 背包系统
        背包: {
          灵石: {
            下品: 0,
            中品: 0,
            上品: 0,
            极品: 0
          },
          物品: {}
        },
        
        // 人物关系
        人物关系: {},
        
        // 记忆系统
        记忆: {
          短期记忆: [],
          中期记忆: [],
          长期记忆: []
        },
        
        // 三千大道系统
        三千大道: {
          已解锁大道: [],
          大道进度: {},
          大道路径定义: {}
        },
        
        // 游戏时间
        游戏时间: {
          年: 1000,
          月: 1,
          日: 1,
          小时: 0,
          分钟: 0
        },
        
        // 世界信息
        世界信息: worldInfo
      };
      
      // 保存全新的角色数据架构到酒馆
      await tavern.insertOrAssignVariables({
        'character.saveData': newSaveData
      }, { type: 'chat' });
      
      console.log('🌍 [修仙世界生成器] 完整角色架构已创建并保存');
      console.log('📊 [角色架构统计]', {
        主要模块数: Object.keys(newSaveData).length,
        世界名称: worldInfo.世界名称,
        大陆数量: worldInfo.大陆信息?.length || 0,
        势力数量: worldInfo.势力信息?.length || 0,
        地点数量: worldInfo.地点信息?.length || 0
      });
      
      // [最终验证] 强制验证保存的数据是否包含fallback内容
      try {
        const verificationVariables = await tavern.getVariables({ type: 'chat' });
        const savedWorldInfo = (verificationVariables['character.saveData'] as any)?.世界信息;
        
        if (savedWorldInfo) {
          console.log('✅ [验证成功] 保存的世界信息包含:', {
            大陆数量: savedWorldInfo.大陆信息?.length || 0,
            势力数量: savedWorldInfo.势力信息?.length || 0, 
            地点数量: savedWorldInfo.地点信息?.length || 0,
            第一个大陆名称: savedWorldInfo.大陆信息?.[0]?.名称,
            第一个势力名称: savedWorldInfo.势力信息?.[0]?.名称,
            第一个地点名称: savedWorldInfo.地点信息?.[0]?.名称
          });
          
          // 如果验证发现数据仍然为空，强制再次保存
          if (!savedWorldInfo.大陆信息?.length || !savedWorldInfo.势力信息?.length || !savedWorldInfo.地点信息?.length) {
            console.warn('⚠️ [验证失败] 数据为空，强制重新保存fallback数据');
            
            // 直接修改现有的saveData，确保数组有内容
            const currentSaveData = verificationVariables['character.saveData'] as any;
            if (currentSaveData?.世界信息) {
              currentSaveData.世界信息.大陆信息 = worldInfo.大陆信息;
              currentSaveData.世界信息.势力信息 = worldInfo.势力信息;
              currentSaveData.世界信息.地点信息 = worldInfo.地点信息;
              
              await tavern.insertOrAssignVariables({
                'character.saveData': currentSaveData
              }, { type: 'chat' });
              
              console.log('🔄 [强制修复] 已重新保存包含fallback数据的世界信息');
            }
          }
        } else {
          console.error('❌ [验证失败] 未找到保存的世界信息');
        }
      } catch (verificationError) {
        console.error('❌ [验证过程出错]:', verificationError);
      }
      
    } catch (error) {
      console.error('[修仙世界生成器] 解析或保存世界数据失败:', error);
      console.log('[修仙世界生成器] 原始响应内容:', response);
      throw new Error(`世界数据解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 验证出生地坐标是否在指定大陆内部
   */
  private validateBirthLocationInContinent(
    coordinates: {longitude: number, latitude: number},
    continentId: string,
    continents: any[]
  ): boolean {
    if (!coordinates || !continentId || !continents) return false;
    
    const targetContinent = continents.find(c => c.id === continentId);
    if (!targetContinent || !targetContinent.continent_bounds) return false;
    
    // 使用简单的点在多边形内算法（射线法）
    return this.pointInPolygon(coordinates, targetContinent.continent_bounds);
  }
  
  /**
   * 点在多边形内判断（射线法）
   */
  private pointInPolygon(point: {longitude: number, latitude: number}, polygon: any[]): boolean {
    const x = point.longitude;
    const y = point.latitude;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  /**
   * 调整出生地坐标到大陆内部
   */
  private adjustBirthLocationToContinent(
    continentId: string,
    continents: any[]
  ): {longitude: number, latitude: number} | null {
    if (!continentId || !continents) return null;
    
    const targetContinent = continents.find(c => c.id === continentId);
    if (!targetContinent || !targetContinent.continent_bounds) return null;
    
    const bounds = targetContinent.continent_bounds;
    
    // 计算大陆的中心点
    const centerLng = bounds.reduce((sum: number, p: any) => sum + p.longitude, 0) / bounds.length;
    const centerLat = bounds.reduce((sum: number, p: any) => sum + p.latitude, 0) / bounds.length;
    
    // 在中心点附近随机偏移一小段距离，确保在内部
    const offsetLng = (Math.random() - 0.5) * 0.2; // ±0.1度的随机偏移
    const offsetLat = (Math.random() - 0.5) * 0.2;
    
    const adjustedCoords = {
      longitude: centerLng + offsetLng,
      latitude: centerLat + offsetLat
    };
    
    // 验证调整后的坐标是否在多边形内
    if (this.pointInPolygon(adjustedCoords, bounds)) {
      return adjustedCoords;
    }
    
    // 如果随机偏移后仍然不在内部，直接返回中心点
    return { longitude: centerLng, latitude: centerLat };
  }
}
