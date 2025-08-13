from typing import List, Dict, Any, Optional, Tuple

from server.models import Origin, Talent, SpiritRoot
from server.schemas import schema

# --- Origins ---

async def get_origins() -> List[Origin]:
    """获取所有出身"""
    return await Origin.all()

async def create_origin(origin: schema.OriginCreate) -> Origin:
    """创建新出身"""
    return await Origin.create(**origin.model_dump())

# --- Talents ---

async def get_talents() -> List[Talent]:
    """获取所有天赋"""
    return await Talent.all()

async def get_talent(talent_id: int) -> Optional[Talent]:
    """获取单个天赋"""
    return await Talent.get_or_none(id=talent_id)

async def create_talent(talent: schema.TalentCreate) -> Talent:
    """创建新天赋"""
    return await Talent.create(**talent.model_dump())

async def update_talent(talent_id: int, talent_update: schema.TalentCreate) -> Optional[Talent]:
    """更新天赋"""
    talent = await Talent.get_or_none(id=talent_id)
    if talent:
        talent.name = talent_update.name
        talent.description = talent_update.description
        talent.effects = talent_update.effects
        await talent.save()
    return talent

async def delete_talent(talent_id: int) -> bool:
    """删除天赋"""
    talent = await Talent.get_or_none(id=talent_id)
    if talent:
        await talent.delete()
        return True
    return False

# --- Spirit Roots ---

async def get_spirit_roots() -> List[SpiritRoot]:
    """获取所有灵根"""
    return await SpiritRoot.all()

async def get_spirit_root(spirit_root_id: int) -> Optional[SpiritRoot]:
    """获取单个灵根"""
    return await SpiritRoot.get_or_none(id=spirit_root_id)

async def create_spirit_root(spirit_root: schema.SpiritRootCreate) -> SpiritRoot:
    """创建新灵根"""
    return await SpiritRoot.create(**spirit_root.model_dump())

async def update_spirit_root(spirit_root_id: int, spirit_root_update: schema.SpiritRootCreate) -> Optional[SpiritRoot]:
    """更新灵根"""
    spirit_root = await SpiritRoot.get_or_none(id=spirit_root_id)
    if spirit_root:
        spirit_root.name = spirit_root_update.name
        spirit_root.description = spirit_root_update.description
        spirit_root.base_multiplier = spirit_root_update.base_multiplier
        await spirit_root.save()
    return spirit_root

async def delete_spirit_root(spirit_root_id: int) -> bool:
    """删除灵根"""
    spirit_root = await SpiritRoot.get_or_none(id=spirit_root_id)
    if spirit_root:
        await spirit_root.delete()
        return True
    return False


# --- Core Settings (Not from DB) ---

async def get_core_settings() -> Dict[str, Any]:
    """获取核心游戏设定"""
    settings = {
        "attributes": {
            "CON": "根骨 - 影响生命值和防御力",
            "INT": "悟性 - 影响学习速度和技能效果",
            "SPI": "神识 - 影响法术强度和感知能力",
            "LUK": "气运 - 影响幸运事件的发生概率",
            "CHA": "仪容 - 影响社交互动和他人反应",
            "BKG": "家世 - 影响初始资源和背景关系"
        },
        "cultivation_elements": [
            "金、木、水、火、土五行",
            "阴阳",
            "风、雷、冰等变异灵根",
            "剑道、丹道、器道等修炼方向"
        ]
    }
    return settings