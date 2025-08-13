import asyncio
from tortoise import Tortoise, run_async

from aerich_config import TORTOISE_ORM

async def run():
    """
    此法门将连接灵脉，获取所有已在天道（Tortoise ORM）中注册的法身（模型），
    并施展“万法归虚”之术，将它们在数据库中的形体（数据表）彻底抹去。
    """
    print("正在连接灵脉...")
    await Tortoise.init(config=TORTOISE_ORM)
    
    print("准备施展“万法归虚”...")
    # 获取默认连接
    conn = Tortoise.get_connection("default")
    
    # 获取所有已注册的模型
    models = Tortoise.apps.get("models").values()
    
    # 为了避免外键约束导致删除失败，我们先禁用外键检查
    await conn.execute_script("SET FOREIGN_KEY_CHECKS = 0;")
    print("已禁用外键约束...")

    for model in models:
        table_name = model._meta.db_table
        print(f"正在抹去 -> {table_name}")
        await conn.execute_query_dict(f"DROP TABLE IF EXISTS `{table_name}`")
    
    # 别忘了还有 aerich 自己创建的表
    print("正在抹去 -> aerich")
    await conn.execute_query_dict("DROP TABLE IF EXISTS `aerich`")

    # 重新启用外键检查
    await conn.execute_script("SET FOREIGN_KEY_CHECKS = 1;")
    print("已恢复外键约束...")

    print("“万法归虚”已完成，天地重归混沌。")


if __name__ == "__main__":
    run_async(run())