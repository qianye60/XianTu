from typing import List, Optional, Tuple

from server.models import World, AdminAccount
from server.schemas import schema

async def get_world_by_name(name: str) -> Optional[World]:
    """
    按名称查找世界。
    """
    return await World.get_or_none(name=name)

async def get_world_by_id(world_id: int) -> Optional[World]:
    """
    按ID查找世界。
    """
    return await World.get_or_none(id=world_id)

async def get_worlds() -> List[World]:
    """
    获取所有已创建的世界列表。
    """
    return await World.all().prefetch_related("creator")

async def create_world(world: schema.WorldCreate) -> Tuple[Optional[World], str]:
    """
    开辟一个新的世界。
    """
    # 验证创建者是否存在
    creator = await AdminAccount.get_or_none(id=world.creator_id)
    if not creator:
        return None, "指定的创世仙官不存在。"
        
    try:
        # 注意：我们将 creator 对象直接传递给外键字段
        new_world = await World.create(
            name=world.name,
            description=world.description,
            era=world.era,
            core_rules=world.core_rules,
            creator=creator
        )
        return new_world, "新世界开辟成功！"
    except Exception as e:
        # 更通用的异常捕获
        return None, f"未知错误: {e}"

async def update_world(world_id: int, world_update: schema.WorldUpdate) -> Tuple[Optional[World], str]:
    """
    更新一个已存在的世界的信息。
    """
    world = await World.get_or_none(id=world_id)
    if not world:
        return None, "未找到指定的世界。"

    update_data = world_update.model_dump(exclude_unset=True)
    if not update_data:
        return world, "没有提供需要更新的数据。"

    for key, value in update_data.items():
        setattr(world, key, value)
    
    await world.save()
    return world, "世界信息更新成功。"

async def delete_world(world_id: int) -> bool:
    """
    删除一个世界。
    """
    world = await World.get_or_none(id=world_id)
    if world:
        await world.delete()
        return True
    return False
