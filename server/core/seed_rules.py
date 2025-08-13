import json
from server.models import Origin, Talent, SpiritRoot

async def seed():
    """
    使用 Tortoise-ORM 为核心规则表注入初始数据。
    """
    print("--- [Rules] 开始播种核心规则 (ORM)... ---")

    # --- 初始道法定义 ---
    core_origins_data = [
        {'name': '孤儿', 'description': '天地为父母，四海为家。你的童年充满了艰辛，但也磨练了你坚韧不拔的意志。', 'attribute_modifiers': {'CON': 2, 'LUK': 1}},
        {'name': '书香门第', 'description': '你的家族世代为官，书香传家。你自幼饱读诗书，对天地至理有自己独到的见解。', 'attribute_modifiers': {'INT': 2, 'CHA': 1}},
        {'name': '商贾之家', 'description': '你的家族富甲一方，善于经商。你从小耳濡目染，精于计算，深谙人情世故。', 'attribute_modifiers': {'BKG': 2, 'SPI': 1}},
        {'name': '将门之后', 'description': '你的先祖曾是叱咤风云的将军。你继承了先祖的勇武，体魄强健，杀伐果断。', 'attribute_modifiers': {'CON': 2, 'SPI': 1}},
    ]

    core_talents_data = [
        {'name': '天生道体', 'description': '你天生亲近大道，修行速度远超常人。', 'effects': {'training_speed_multiplier': 1.2}},
        {'name': '丹道宗师', 'description': '你对药理有超凡的领悟力，炼丹时成功率更高，丹药品质也更好。', 'effects': {'alchemy_success_rate': 1.1, 'alchemy_quality_bonus': 1}},
        {'name': '剑心通明', 'description': '你的剑道天赋无人能及，学习任何剑法都能迅速掌握其精髓。', 'effects': {'sword_art_mastery_speed': 1.5}},
        {'name': '气运之子', 'description': '你仿佛被天地所眷顾，时常能遇到意想不到的机缘。', 'effects': {'random_event_luck_bonus': 5}},
    ]

    core_spirit_roots_data = [
        {'name': '废品灵根', 'description': '五行杂乱，灵气难以入体，修行之路崎岖坎坷。', 'base_multiplier': 0.5},
        {'name': '五行灵根', 'description': '五行俱全，虽无专精，但胜在平和，可修行任何属性的功法。', 'base_multiplier': 1.0},
        {'name': '天品单灵根', 'description': '五行之中专精其一，修行该属性功法时，速度一日千里。', 'base_multiplier': 2.0},
    ]

    # 1. 铭刻出身
    if await Origin.all().count() == 0:
        print("--- [Rules] `core_origins` 为空，开始铭刻... ---")
        await Origin.bulk_create([Origin(**data) for data in core_origins_data])
        print(f"--- [Rules] 成功铭刻 {len(core_origins_data)} 条出身。 ---")

    # 2. 铭刻天赋
    if await Talent.all().count() == 0:
        print("--- [Rules] `core_talents` 为空，开始铭刻... ---")
        await Talent.bulk_create([Talent(**data) for data in core_talents_data])
        print(f"--- [Rules] 成功铭刻 {len(core_talents_data)} 条天赋。 ---")

    # 3. 铭刻灵根
    if await SpiritRoot.all().count() == 0:
        print("--- [Rules] `core_spirit_roots` 为空，开始铭刻... ---")
        await SpiritRoot.bulk_create([SpiritRoot(**data) for data in core_spirit_roots_data])
        print(f"--- [Rules] 成功铭刻 {len(core_spirit_roots_data)} 条灵根。 ---")
    
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