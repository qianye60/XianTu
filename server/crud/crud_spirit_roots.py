"""灵根体系的增删改查操作 (Tortoise ORM 异步版本)"""
from typing import Optional, List, Tuple
from tortoise.exceptions import IntegrityError
from server.models import SpiritRoot as SpiritRootModel
from server.schemas.schema import SpiritRootCreate, SpiritRootUpdate

async def get_spirit_root_by_name(name: str) -> Optional[SpiritRootModel]:
    """按名称查找灵根"""
    return await SpiritRootModel.get_or_none(name=name)

async def create_spirit_root(spirit_root: SpiritRootCreate) -> Tuple[Optional[SpiritRootModel], str]:
    """创建新灵根"""
    if await get_spirit_root_by_name(spirit_root.name):
        return None, f"名为 '{spirit_root.name}' 的灵根已存在。"
    try:
        spirit_root_obj = await SpiritRootModel.create(**spirit_root.model_dump())
        return spirit_root_obj, "灵根创建成功。"
    except IntegrityError:
        return None, "数据冲突，可能存在同名灵根。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def get_spirit_root(spirit_root_id: int) -> Optional[SpiritRootModel]:
    """根据ID获取灵根"""
    return await SpiritRootModel.get_or_none(id=spirit_root_id)

async def get_spirit_roots() -> List[SpiritRootModel]:
    """获取所有灵根"""
    return await SpiritRootModel.all().order_by('-base_multiplier', 'name')

async def update_spirit_root(spirit_root_id: int, spirit_root_data: SpiritRootUpdate) -> Tuple[Optional[SpiritRootModel], str]:
    """更新灵根"""
    spirit_root = await get_spirit_root(spirit_root_id)
    if not spirit_root:
        return None, "未找到指定的灵根。"

    update_data = spirit_root_data.model_dump(exclude_unset=True)
    if not update_data:
        return spirit_root, "没有提供需要更新的数据。"

    if "name" in update_data and update_data["name"] != spirit_root.name:
        if await get_spirit_root_by_name(update_data["name"]):
            return None, f"名为 '{update_data['name']}' 的灵根已存在。"

    try:
        for key, value in update_data.items():
            setattr(spirit_root, key, value)
        await spirit_root.save()
        return spirit_root, "灵根信息更新成功。"
    except IntegrityError:
        return None, "数据冲突，更新失败。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def delete_spirit_root(spirit_root_id: int) -> bool:
    """删除灵根"""
    spirit_root = await SpiritRootModel.get_or_none(id=spirit_root_id)
    if spirit_root:
        await spirit_root.delete()
        return True
    return False