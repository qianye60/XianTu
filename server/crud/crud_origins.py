"""出身体系的异步增删改查操作"""
from typing import List, Optional, Tuple
from tortoise.exceptions import IntegrityError
from server.models import Origin
from server.schemas.schema import OriginCreate, OriginUpdate

async def get_origin_by_name(name: str) -> Optional[Origin]:
    """按名称查找出身"""
    return await Origin.get_or_none(name=name)

async def create_origin(origin: OriginCreate) -> Tuple[Optional[Origin], str]:
    """创建新出身"""
    if await get_origin_by_name(origin.name):
        return None, f"名为 '{origin.name}' 的出身已存在。"
    try:
        new_origin = await Origin.create(**origin.model_dump())
        return new_origin, "出身创建成功。"
    except IntegrityError:
        return None, "数据冲突，可能存在同名出身。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def get_origin(origin_id: int) -> Optional[Origin]:
    """根据ID获取出身"""
    return await Origin.get_or_none(id=origin_id)

async def get_origins() -> List[Origin]:
    """获取所有出身"""
    return await Origin.all().order_by("name")

async def update_origin(origin_id: int, origin_data: OriginUpdate) -> Tuple[Optional[Origin], str]:
    """更新出身"""
    origin = await get_origin(origin_id)
    if not origin:
        return None, "未找到指定的出身。"
    
    update_data = origin_data.model_dump(exclude_unset=True)
    if not update_data:
        return origin, "没有提供需要更新的数据。"

    if "name" in update_data and update_data["name"] != origin.name:
        if await get_origin_by_name(update_data["name"]):
            return None, f"名为 '{update_data['name']}' 的出身已存在。"

    try:
        for key, value in update_data.items():
            setattr(origin, key, value)
        await origin.save()
        return origin, "出身信息更新成功。"
    except IntegrityError:
        return None, "数据冲突，更新失败。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def delete_origin(origin_id: int) -> bool:
    """删除出身"""
    deleted_count = await Origin.filter(id=origin_id).delete()
    return deleted_count > 0