"""天赋体系的增删改查操作 (Tortoise ORM 异步版本)"""
from typing import Optional, List, Tuple
from tortoise.exceptions import IntegrityError
from server.models import Talent as TalentModel
from server.schemas.schema import TalentCreate, TalentUpdate

async def get_talent_by_name(name: str) -> Optional[TalentModel]:
    """按名称查找天赋"""
    return await TalentModel.get_or_none(name=name)

async def create_talent(talent: TalentCreate) -> Tuple[Optional[TalentModel], str]:
    """创建新天赋"""
    if await get_talent_by_name(talent.name):
        return None, f"名为 '{talent.name}' 的天赋已存在。"
    try:
        talent_obj = await TalentModel.create(**talent.model_dump())
        return talent_obj, "天赋创建成功。"
    except IntegrityError:
        return None, "数据冲突，可能存在同名天赋。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def get_talent(talent_id: int) -> Optional[TalentModel]:
    """根据ID获取天赋"""
    return await TalentModel.get_or_none(id=talent_id)

async def get_talents() -> List[TalentModel]:
    """获取所有天赋"""
    return await TalentModel.all().order_by('name')

async def update_talent(talent_id: int, talent_data: TalentUpdate) -> Tuple[Optional[TalentModel], str]:
    """更新天赋"""
    talent = await get_talent(talent_id)
    if not talent:
        return None, "未找到指定的天赋。"

    update_data = talent_data.model_dump(exclude_unset=True)
    if not update_data:
        return talent, "没有提供需要更新的数据。"

    if "name" in update_data and update_data["name"] != talent.name:
        if await get_talent_by_name(update_data["name"]):
            return None, f"名为 '{update_data['name']}' 的天赋已存在。"

    try:
        for key, value in update_data.items():
            setattr(talent, key, value)
        await talent.save()
        return talent, "天赋信息更新成功。"
    except IntegrityError:
        return None, "数据冲突，更新失败。"
    except Exception as e:
        return None, f"数据库错误: {e}"

async def delete_talent(talent_id: int) -> bool:
    """删除天赋"""
    talent = await TalentModel.get_or_none(id=talent_id)
    if talent:
        await talent.delete()
        return True
    return False