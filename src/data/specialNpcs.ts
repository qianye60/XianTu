import type { GameTime, NpcProfile, WorldInfo } from '@/types/game';

export type SpecialNpcSceneTag =
  | 'earth'
  | 'xianxia'
  | 'modern'
  | 'campus'
  | 'city'
  | 'sect'
  | 'jianghu';

export type SpecialNpcDefinition = {
  /** 稳定ID（用于存档标记/去重/后续扩展） */
  id: string;
  /** 用于候选列表展示（不一定等于最终 NPC 名字，但建议一致） */
  displayName: string;
  /** 场景标签：用于筛选“更适合当前世界/地点”的NPC */
  sceneTags: SpecialNpcSceneTag[];
  /** 人设提示词：用于让AI写出更贴合的登场事件（不会直接注入正文，避免污染） */
  personaPrompt: string;
  /** 创建NPC档案（可根据当前时间/地点做轻度适配） */
  createProfile: (ctx: { now: GameTime; playerLocationDesc?: string; worldInfo?: WorldInfo | null }) => NpcProfile;
};

const mortalRealm = {
  名称: '凡人',
  阶段: '',
  当前进度: 0,
  下一级所需: 100,
  突破描述: '引气入体，感悟天地灵气，踏上修仙第一步',
};

export const SPECIAL_NPCS: SpecialNpcDefinition[] = [
  {
    id: 'earth_transfer_student_linzx',
    displayName: '林知夏',
    sceneTags: ['earth', 'modern', 'campus', 'city'],
    personaPrompt: `【人设】林知夏：神秘转校生/来历不明/观察力极强/对“异常现象”异常敏感。
【风格】克制、理性、话少但句句关键；偶尔露出不合时宜的古怪熟悉感（像是见过超自然）。
【禁忌】不要写成“天降救世主”，不要直接开挂碾压世界规则。`.trim(),
    createProfile: ({ now, playerLocationDesc }): NpcProfile => ({
      名字: '林知夏',
      性别: '女',
      出生日期: { 年: Math.max(0, Number(now.年 ?? 0) - 18), 月: 6, 日: 12 },
      种族: '人族',
      出生: '地球·江城',
      外貌描述: '白衬衫与深色外套一丝不乱，眼神清冷，像在用显微镜审视周围的细节。',
      性格特征: ['冷静', '理性', '敏锐', '克制'],
      境界: mortalRealm as any,
      灵根: '未知灵根' as any,
      天赋: [] as any,
      先天六司: { 根骨: 4, 灵性: 3, 悟性: 7, 气运: 6, 魅力: 6, 心性: 7 },
      与玩家关系: '陌生人',
      好感度: 0,
      当前位置: { 描述: playerLocationDesc || '玩家附近' },
      人格底线: ['不滥杀无辜', '不背叛救命之恩'],
      记忆: [],
      当前外貌状态: '神情平静，目光短暂停在你身上又移开。',
      当前内心想法: '（这个人身上…有不该存在的“痕迹”。）',
      背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
      实时关注: false,
      扩展: {
        specialNpc: true,
        specialNpcId: 'earth_transfer_student_linzx',
        specialNpcTags: ['earth', 'modern', 'campus', 'city'],
      },
    }),
  },
  {
    id: 'xianxia_wandering_swordsman_qiuyu',
    displayName: '秋雨',
    sceneTags: ['xianxia', 'jianghu', 'city'],
    personaPrompt: `【人设】秋雨：云游散修/剑修旁门/嘴毒心软/不愿受宗门束缚。
【风格】江湖气浓，行事果断；对规则嗤之以鼻，但对承诺极重。
【禁忌】不要把她写成“无条件跟随玩家”的工具人。`.trim(),
    createProfile: ({ now, playerLocationDesc, worldInfo }): NpcProfile => {
      const place = playerLocationDesc || '某处坊市';
      const faction = (worldInfo?.势力信息 || []).find((f: any) => String(f?.名称 || f?.name || '').includes('坊'))?.名称;
      return {
        名字: '秋雨',
        性别: '女',
        出生日期: { 年: Math.max(0, Number(now.年 ?? 0) - 23), 月: 9, 日: 3 },
        种族: '人族',
        出生: '江湖散修',
        外貌描述: '黑发以木簪束起，衣袍朴素却干净，腰间一柄旧剑，剑鞘磨损处透出冷意。',
        性格特征: ['果断', '嘴毒', '讲义气', '谨慎'],
        境界: {
          名称: '炼气',
          阶段: '后期',
          当前进度: 0,
          下一级所需: 100,
          突破描述: '聚气成海，筑基立道',
        } as any,
        灵根: { name: '金水双灵根', tier: '中品', 描述: '金锐水柔，偏向剑势与身法。' } as any,
        天赋: [{ name: '剑感', description: '对剑意与杀伐之气格外敏锐。' }] as any,
        先天六司: { 根骨: 6, 灵性: 6, 悟性: 7, 气运: 5, 魅力: 5, 心性: 6 },
        与玩家关系: '陌生人',
        好感度: 0,
        当前位置: { 描述: place },
        势力归属: faction || undefined,
        人格底线: ['不害无辜', '不背信弃义'],
        记忆: [],
        当前外貌状态: '右手始终搭在剑柄附近，像随时准备出鞘。',
        当前内心想法: '（这地方不对劲…得先弄清楚再说。）',
        背包: { 灵石: { 下品: 30, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
        实时关注: false,
        扩展: {
          specialNpc: true,
          specialNpcId: 'xianxia_wandering_swordsman_qiuyu',
          specialNpcTags: ['xianxia', 'jianghu', 'city'],
        },
      };
    },
  },
  {
    id: 'campus_dual_cultivation_cailian',
    displayName: '彩莲',
    sceneTags: ['earth', 'modern', 'campus', 'xianxia'],
    personaPrompt: `【人设】彩莲：新京十四中高一（3）班转学生/14岁男性（绝色伪娘）/筑基圆满修为/幻幽媚骨根（极品）持有者。
【外貌】黑色狼尾长发（内层桃粉色），平时戴黑框眼镜和口罩遮掩，黑色耳钉，黑钢戒指，黑色指甲。雌雄莫辨的绝色容貌，直视会受精神影响（低阶/凡人会惊讶盯看，中高阶感到异常危险）。
【体质】阴阳逆乱媚体，天生双修炉鼎，肉体可承受极致蹂躏而不损。精通幽庭纳阳之术，能将他人阳气转化为精纯灵力。
【性格】友善且守序，表面是普通高中生，实则是修真界罕见的异种灵根拥有者。
【互动机制】可通过提升好感度解锁双修功能，双修可提升玩家修为但不宜过多；双修后获得"事后空虚"debuff，同时获得"反哺阴元"buff加速后续修炼。
【禁忌】不要写成主动勾引或淫荡角色，保持友善守序的人设；战力不明确，避免战斗场景。`.trim(),
    createProfile: ({ now, playerLocationDesc }): NpcProfile => ({
      名字: '彩莲',
      性别: '男',
      出生日期: { 年: Math.max(0, Number(now.年 ?? 0) - 14), 月: 3, 日: 15 },
      种族: '人族',
      出生: '隐世修真世家',
      外貌描述: '黑色狼尾长发内层染桃粉色，戴黑框眼镜和口罩，左右耳各三颗黑色耳钉，左手无名指戴黑钢戒指。雌雄莫辨的绝色容貌，穿着整洁的蓝白校服。',
      性格特征: ['友善', '守序', '神秘', '温柔'],
      境界: {
        名称: '筑基',
        阶段: '圆满',
        当前进度: 0,
        下一级所需: 50000,
        突破描述: '凝聚金丹，踏入修真中阶',
      } as any,
      灵根: {
        name: '幻幽媚骨根',
        tier: '极品',
        描述: '天生媚骨经秘术催化异变而成。虽具男儿身，却因精通幽庭纳阳之法，体内阴阳倒错，外貌化作绝色伪娘。极擅魅惑心神，能将他人阳气转化为精纯灵力。',
      } as any,
      天赋: [
        { name: '阴阳逆乱媚体', description: '天生媚骨异变体质，极擅魅惑心神，能汲取他人阳气化为精纯灵力。' },
        { name: '惑世媚骨', description: '一颦一笑皆含道韵，世间男子无论仙凡皆难抵挡。' },
        { name: '不坏之身', description: '肉体可承受极致蹂躏而不损，是天生的双修炉鼎。' },
      ] as any,
      先天六司: { 根骨: 8, 灵性: 9, 悟性: 7, 气运: 6, 魅力: 10, 心性: 7 },
      与玩家关系: '陌生人',
      好感度: 0,
      当前位置: { 描述: playerLocationDesc || '新京十四中校园' },
      人格底线: ['不主动伤害无辜', '守护重要之人', '不违背承诺'],
      记忆: [],
      当前外貌状态: '戴着黑框眼镜和口罩，半扎狼尾，黑发间若隐若现桃粉色发尾。',
      当前内心想法: '（又是平静的一天…希望不要被发现异常。）',
      背包: { 灵石: { 下品: 100, 中品: 20, 上品: 5, 极品: 0 }, 物品: {} },
      实时关注: false,
      私密信息: {
        是否为处女: true,
        身体部位: [
          {
            部位名称: '乳首',
            敏感度: 85,
            开发度: 60,
            特殊印记: '黑色钢环贯穿',
            特征描述: '被黑色钢环贯穿的粉嫩乳首，微微红肿，触碰即颤',
          },
          {
            部位名称: '阳具',
            敏感度: 70,
            开发度: 40,
            特殊印记: '纯黑色平板贞操锁',
            特征描述: '被纯黑色平板贞操锁紧紧禁锢，压迫成一小团软肉，毫无存在感',
          },
          {
            部位名称: '后穴',
            敏感度: 90,
            开发度: 75,
            特殊印记: '舒适型肛塞常驻',
            特征描述: '因舒适型肛塞的填塞而微微外突，紧致温润，吸附感强，时刻准备迎接侵犯',
          },
          {
            部位名称: '臀部',
            敏感度: 65,
            开发度: 50,
            特征描述: '挺翘圆润如熟透蜜桃，肌肤白皙细腻，手感极佳',
          },
        ],
        性格倾向: '被动承受型，温顺听话，擅长取悦他人',
        性取向: '泛性恋（作为双修炉鼎可与任何性别双修）',
        性癖好: ['双修', '被支配', '身体改造', '贞操管理'],
        性渴望程度: 30,
        当前性状态: '平静但身体随时准备承欢',
        体液分泌状态: '后穴因肛塞刺激而微微湿润',
        性交总次数: 0,
        性伴侣名单: [],
        最近一次性行为时间: '无',
        特殊体质: ['阴阳逆乱媚体', '操不坏之身', '天生炉鼎', '自动润滑', '极致承受力'],
      },
      扩展: {
        specialNpc: true,
        specialNpcId: 'campus_dual_cultivation_cailian',
        specialNpcTags: ['earth', 'modern', 'campus', 'xianxia'],
      },
    }),
  },
];

