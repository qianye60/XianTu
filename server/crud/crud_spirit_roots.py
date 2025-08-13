"""灵根体系的增删改查操作 (Tortoise ORM 异步版本)"""
from typing import Optional, List
from server.models import SpiritRoot as SpiritRootModel
from server.schemas.schema import SpiritRootCreate, SpiritRoot

async def create_spirit_root(spirit_root: SpiritRootCreate) -> SpiritRootModel:
    """创建新灵根"""
    spirit_root_obj = await SpiritRootModel.create(
        name=spirit_root.name,
        description=spirit_root.description,
        base_multiplier=spirit_root.base_multiplier
    )
    return spirit_root_obj

async def get_spirit_root(spirit_root_id: int) -> Optional[SpiritRootModel]:
    """根据ID获取灵根"""
    return await SpiritRootModel.get_or_none(id=spirit_root_id)

async def get_spirit_roots() -> List[SpiritRootModel]:
    """获取所有灵根"""
    return await SpiritRootModel.all().order_by('-base_multiplier', 'name')

async def update_spirit_root(spirit_root_id: int, spirit_root: SpiritRootCreate) -> Optional[SpiritRootModel]:
    """更新灵根"""
    await SpiritRootModel.filter(id=spirit_root_id).update(
        name=spirit_root.name,
        description=spirit_root.description,
        base_multiplier=spirit_root.base_multiplier
    )
    return await SpiritRootModel.get_or_none(id=spirit_root_id)

async def delete_spirit_root(spirit_root_id: int) -> bool:
    """删除灵根"""
    spirit_root = await SpiritRootModel.get_or_none(id=spirit_root_id)
    if spirit_root:
        await spirit_root.delete()
        return True
    return False