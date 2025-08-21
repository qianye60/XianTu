# -*- coding: utf-8 -*-
from . import seed_worlds, seed_rules, seed_talent_tiers

async def initialize_database():
    """
    初始化数据库所有核心数据的主入口。
    """
    print("---==[ 天道演化开始：检查并铭刻核心法则 (ORM) ]==---")
    
    # 必须先铭刻天资等级，因为天赋依赖它
    await seed_talent_tiers.seed_talent_tiers()
    await seed_worlds.seed()
    await seed_rules.seed()

    print("---==[ 天道演化完毕 (ORM) ]==---")

if __name__ == '__main__':
    import asyncio
    from tortoise import Tortoise
    from server.main import TORTOISE_ORM

    async def run():
        await Tortoise.init(config=TORTOISE_ORM)
        await Tortoise.generate_schemas()
        await initialize_database()
        await Tortoise.close_connections()

    asyncio.run(run())