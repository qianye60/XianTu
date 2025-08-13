from typing import List, Dict, Any
from server.models import World, AdminAccount

# 数据部分保持不变
DEFAULT_WORLDS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": '朝天大陆',
        "type": '古典仙侠',
        "description": '此乃万道之始，众生朝天之界。此界的核心法则是森严的境界壁垒，不同生命层次之间宛如天渊之隔。修行初阶，修士尚在凡尘浊世中挣扎，于稀薄灵气中寻觅仙缘，在王朝更迭中见证沧桑；待到道途中段，方能接触真正的元气清都，此处宗门林立，为争夺修行资源而合纵连横；唯有臻至上境，才能触及那传说中的法则天域，一念引动天地异象。修士的毕生所求，便是突破这层层无形的壁垒，跨越仙凡之堑，最终在道之巅峰叩问本源，与天争命。此界道途万千，剑修、佛门、儒道、魔道、艺道百花齐放，共同构成了波澜壮阔的修仙画卷。',
        "author_id": 1
    },
    # ... 其他世界数据 ...
]

async def seed():
    """
    使用 Tortoise-ORM 将预设的世界背景数据填充到数据库中。
    """
    print("--- [Worlds] 开始播种世界数据 (ORM)... ---")
    
    # 确保 super_admin 用户存在，作为作者
    admin_user = await AdminAccount.get_or_none(user_name="super_admin")
    if not admin_user:
        admin_user, _ = await AdminAccount.get_or_create(
            user_name="super_admin",
            defaults={"password": "hashed_password_placeholder", "role": "super_admin"}
        )

    for world_data in DEFAULT_WORLDS:
        existing_world = await World.get_or_none(name=world_data["name"])
        
        if existing_world:
            # 更新描述
            if existing_world.description != world_data["description"]:
                existing_world.description = world_data["description"]
                existing_world.type = world_data["type"]
                await existing_world.save()
                print(f"--- [Worlds] 成功更新世界: '{existing_world.name}' ---")
            else:
                print(f"--- [Worlds] 世界 '{existing_world.name}' 已是最新，无需更新。 ---")
        else:
            # 创建世界
            await World.create(
                name=world_data["name"],
                type=world_data["type"],
                description=world_data["description"],
                creator=admin_user # 修正外键字段名
            )
            print(f"--- [Worlds] 成功创建世界: '{world_data['name']}' ---")

    print("--- [Worlds] 世界数据播种完毕 (ORM)。 ---")

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