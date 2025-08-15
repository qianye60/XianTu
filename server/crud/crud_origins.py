"""出身体系的异步增删改查操作"""
from typing import List, Optional
from server.models import Origin
from server.schemas.schema import OriginCreate, OriginUpdate

async def create_origin(origin: OriginCreate) -> Origin:
    """创建新出身"""
    # Tortoise-ORM 的 JSONField 会自动处理字典和JSON字符串的转换
    new_origin = await Origin.create(**origin.model_dump())
    return new_origin

async def get_origin(origin_id: int) -> Optional[Origin]:
    """根据ID获取出身"""
    return await Origin.get_or_none(id=origin_id)

async def get_origins() -> List[Origin]:
    """获取所有出身"""
    return await Origin.all().order_by("name")

async def update_origin(origin_id: int, origin_data: OriginUpdate) -> Optional[Origin]:
    """更新出身"""
    origin = await get_origin(origin_id)
    if not origin:
        return None
    
    update_data = origin_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(origin, key, value)
        
    await origin.save()
    return origin

async def delete_origin(origin_id: int) -> bool:
    """删除出身"""
    deleted_count = await Origin.filter(id=origin_id).delete()
    return deleted_count > 0