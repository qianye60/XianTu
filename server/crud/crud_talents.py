"""天赋体系的增删改查操作 (Tortoise ORM 异步版本)"""
from typing import Optional, List
from server.models import Talent as TalentModel
from server.schemas.schema import TalentCreate, Talent

async def create_talent(talent: TalentCreate) -> TalentModel:
    """创建新天赋"""
    talent_obj = await TalentModel.create(
        name=talent.name,
        description=talent.description,
        effects=talent.effects
    )
    return talent_obj

async def get_talent(talent_id: int) -> Optional[TalentModel]:
    """根据ID获取天赋"""
    return await TalentModel.get_or_none(id=talent_id)

async def get_talents() -> List[TalentModel]:
    """获取所有天赋"""
    return await TalentModel.all().order_by('name')

async def update_talent(talent_id: int, talent: TalentCreate) -> Optional[TalentModel]:
    """更新天赋"""
    await TalentModel.filter(id=talent_id).update(
        name=talent.name,
        description=talent.description,
        effects=talent.effects
    )
    return await TalentModel.get_or_none(id=talent_id)

async def delete_talent(talent_id: int) -> bool:
    """删除天赋"""
    talent = await TalentModel.get_or_none(id=talent_id)
    if talent:
        await talent.delete()
        return True
    return False