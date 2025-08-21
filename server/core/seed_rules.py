import json
from server.models import Origin, Talent, SpiritRoot, TalentTier

async def seed():
    """
    使用 Tortoise-ORM 为核心规则表注入初始数据。
    确保数据之间的关联正确建立。
    """
    print("--- [Rules] 开始播种核心规则 (ORM)... ---")

    # --- 出身数据 ---
    core_origins_data = [
        {'name': '书香门第', 'description': '你出生于凡人学者之家，自幼饱读诗书，神识与悟性远超常人。', 'attribute_modifiers': {'INT': 3, 'SPI': 2}, 'rarity': 8, 'talent_cost': 3},
        {'name': '将门虎子', 'description': '你生于凡尘将帅之家，千锤百炼，体魄强健，意志坚定。', 'attribute_modifiers': {'STR': 3, 'CON': 2}, 'rarity': 8, 'talent_cost': 3},
        {'name': '寒门散修', 'description': '你出身贫寒，于红尘中挣扎求生，虽无背景，却磨练出坚韧不拔的道心和远超常人的气运。', 'attribute_modifiers': {'CON': 1, 'LUK': 4}, 'rarity': 10, 'talent_cost': 2},
        {'name': '修仙世家', 'description': '你出身于一个末流修仙家族，血脉中蕴含稀薄灵气，自幼便有长辈引路，见识不凡。', 'attribute_modifiers': {'SPI': 2, 'INT': 1}, 'rarity': 5, 'talent_cost': 2},
        {'name': '魔道遗孤', 'description': '你是昔日某个被正道剿灭的魔道宗门的遗孤，身负血海深仇，心性狠辣，行事不择手段。', 'attribute_modifiers': {'STR': 2, 'SPI': 2, 'LUK': -1}, 'rarity': 3, 'talent_cost': 1},
        {'name': '平民出身', 'description': '平凡的农家子弟，虽无特殊背景，但生活历练造就了平衡的根基。', 'attribute_modifiers': {'STR': 1, 'CON': 1, 'INT': 1, 'SPI': 1}, 'rarity': 1, 'talent_cost': 0}
    ]

    # --- 天赋数据 ---
    core_talents_data = [
        {'name': '天生道体', 'description': '传说中的无上体质，与道相合，修行一日千里，万法皆通。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'INT', 'value': 5}, {'type': 'ATTRIBUTE_MODIFIER', 'target': 'SPI', 'value': 5}], 'rarity': 1, 'talent_cost': 10},
        {'name': '气运之子', 'description': '你仿佛被天地所眷顾，洪福齐天，时常能逢凶化吉，于危机中觅得大机缘。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'LUK', 'value': 10}], 'rarity': 1, 'talent_cost': 8},
        {'name': '剑心通明', 'description': '天生的剑修胚子，学习任何剑法都能迅速掌握精髓，剑道威力倍增。', 'effects': [{'type': 'SKILL_BONUS', 'skill': 'combat.sword', 'value': 0.3}], 'rarity': 3, 'talent_cost': 4},
        {'name': '丹道天赋', 'description': '你对药理有着天生的直觉，炼丹时如有神助，成丹率与品质远超常人。', 'effects': [{'type': 'SKILL_BONUS', 'skill': 'alchemy', 'value': 0.25}], 'rarity': 3, 'talent_cost': 4},
        {'name': '天生神力', 'description': '你的肉身天生便比常人强大，气血旺盛，力量惊人。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'STR', 'value': 3}, {'type': 'ATTRIBUTE_MODIFIER', 'target': 'CON', 'value': 3}], 'rarity': 5, 'talent_cost': 3},
        {'name': '过目不忘', 'description': '你的记忆力超群，任何功法典籍只需看过一遍便能牢记于心。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'INT', 'value': 4}], 'rarity': 5, 'talent_cost': 2},
        {'name': '体格健壮', 'description': '你比一般人更健康，不易生病，恢复力更强。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'CON', 'value': 2}], 'rarity': 10, 'talent_cost': 1},
        {'name': '小有福源', 'description': '你的运气比普通人好上一些，时常能捡到些小便宜。', 'effects': [{'type': 'ATTRIBUTE_MODIFIER', 'target': 'LUK', 'value': 2}], 'rarity': 10, 'talent_cost': 1}
    ]

    # --- 灵根数据 ---
    core_spirit_roots_data = [
        {'name': '废灵根', 'description': '五行杂乱，灵气难以入体，修行之路崎岖坎坷，常人万倍之功，难得寸进。', 'base_multiplier': 0.2, 'talent_cost': 0},
        {'name': '伪灵根', 'description': '四五行驳杂之根，吐纳灵气事倍功半，修行缓慢，若无大机缘，终生无望筑基。', 'base_multiplier': 0.5, 'talent_cost': 0},
        {'name': '真灵根', 'description': '二三行之灵根，虽有驳杂，但已是常人中的佼佼者，宗门遴选之基准。', 'base_multiplier': 1.0, 'talent_cost': 2},
        {'name': '天灵根 (金)', 'description': '单属性灵根，纯粹无暇。纯金之体，锐意无双，修行金属性功法时速度一日千里。', 'base_multiplier': 2.0, 'talent_cost': 5},
        {'name': '天灵根 (木)', 'description': '单属性灵根，纯粹无暇。草木精华所钟，生机绵长，疗伤与培植灵药有奇效。', 'base_multiplier': 2.0, 'talent_cost': 5},
        {'name': '天灵根 (水)', 'description': '单属性灵根，纯粹无暇。与水相合，性情柔韧，法力回复速度远超同侪。', 'base_multiplier': 2.0, 'talent_cost': 5},
        {'name': '天灵根 (火)', 'description': '单属性灵根，纯粹无暇。天生火德之体，御火之术出神入化，攻击霸道绝伦。', 'base_multiplier': 2.0, 'talent_cost': 5},
        {'name': '天灵根 (土)', 'description': '单属性灵根，纯粹无暇。与大地同源，防御稳如山岳，立于不败之地。', 'base_multiplier': 2.0, 'talent_cost': 5},
        {'name': '异灵根 (风)', 'description': '变异灵根，御风而行，身法飘逸无踪，速度天下无双。', 'base_multiplier': 2.5, 'talent_cost': 8},
        {'name': '异灵根 (雷)', 'description': '变异灵根，掌九天神雷，破除一切邪魔，天生便是战斗的宠儿。', 'base_multiplier': 2.5, 'talent_cost': 8},
        {'name': '混沌灵根', 'description': '开天辟地之前的先天之气，万法皆通，万劫不磨，无视瓶颈。', 'base_multiplier': 4.0, 'talent_cost': 15}
    ]

    # 1. 铭刻出身
    if await Origin.all().count() == 0:
        print("--- [Rules] `origins` 为空，开始铭刻... ---")
        await Origin.bulk_create([Origin(**data) for data in core_origins_data])
        print(f"--- [Rules] 成功铭刻 {len(core_origins_data)} 条出身。 ---")

    # 2. 铭刻灵根
    if await SpiritRoot.all().count() == 0:
        print("--- [Rules] `spirit_roots` 为空，开始铭刻... ---")
        await SpiritRoot.bulk_create([SpiritRoot(**data) for data in core_spirit_roots_data])
        print(f"--- [Rules] 成功铭刻 {len(core_spirit_roots_data)} 条灵根。 ---")

    # 3. 铭刻天赋 (核心修复逻辑)
    if await Talent.all().count() == 0:
        print("--- [Rules] `talents` 为空，开始铭刻... ---")
        
        # 首先，获取所有天资等级
        talent_tiers = await TalentTier.all()
        if not talent_tiers:
            print("--- [Rules] 错误: `talent_tiers` 为空，无法关联天赋。请先播种天资等级。 ---")
            return
            
        # 创建一个基于稀有度的查找表
        # 假设 rarity 越小，等级越高
        tiers_map = {tier.name: tier for tier in talent_tiers}
        
        # 简单的稀有度到天资名称的映射 (根据 seed_talent_tiers.py 的新数据)
        def get_tier_by_rarity(rarity: int) -> TalentTier:
            if rarity <= 1:
                return tiers_map.get("逆天")
            elif rarity <= 2:
                return tiers_map.get("妖孽")
            elif rarity <= 3:
                return tiers_map.get("天才")
            elif rarity <= 4:
                return tiers_map.get("优秀")
            elif rarity <= 5:
                return tiers_map.get("普通")
            else: # rarity >= 6
                return tiers_map.get("废柴")

        talents_to_create = []
        for data in core_talents_data:
            tier = get_tier_by_rarity(data.get('rarity', 100))
            if not tier:
                print(f"--- [Rules] 警告: 无法为天赋 '{data['name']}' 找到匹配的天资等级，将跳过。 ---")
                continue
            
            # 确保 effects 字段是 JSON 字符串
            if 'effects' in data and isinstance(data['effects'], (dict, list)):
                data['effects'] = json.dumps(data['effects'])

            talent_instance = Talent(**data, tier=tier)
            talents_to_create.append(talent_instance)

        if talents_to_create:
            await Talent.bulk_create(talents_to_create)
            print(f"--- [Rules] 成功铭刻 {len(talents_to_create)} 条天赋并建立关联。 ---")

    print("--- [Rules] 核心规则播种完毕 (ORM)。 ---")

if __name__ == '__main__':
    import asyncio
    from tortoise import Tortoise
    from server.main import TORTOISE_ORM

    async def run():
        await Tortoise.init(config=TORTOISE_ORM)
        await Tortoise.generate_schemas()
        await seed()
        await Tortoise.close_connections()

    asyncio.run(run())