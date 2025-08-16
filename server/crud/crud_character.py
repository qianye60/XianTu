from typing import Optional, Tuple, Dict, Any, List

from server.models import PlayerAccount, World, CharacterBase, TalentTier, Origin, SpiritRoot, Talent
from server.schemas import schema

async def create_character_base(
    player_id: int,
    world_id: int,
    talent_tier_id: int,
    character_name: str,
    # 先天六司属性
    root_bone: int,
    spirituality: int,
    comprehension: int,
    fortune: int,
    charm: int,
    temperament: int,
    # 选择的内容
    origin_id: Optional[int] = None,
    spirit_root_id: Optional[int] = None,
    selected_talent_ids: Optional[List[int]] = None
) -> Tuple[Optional[CharacterBase], str]:
    """
    创建角色基础信息
    """
    # 验证玩家和世界是否存在
    player = await PlayerAccount.get_or_none(id=player_id)
    if not player:
        return None, "指定玩家不存在。"
    
    world = await World.get_or_none(id=world_id)
    if not world:
        return None, "指定世界不存在。"
    
    talent_tier = await TalentTier.get_or_none(id=talent_tier_id)
    if not talent_tier:
        return None, "天资等级不存在。"
    
    # 验证属性分配是否合理
    # NOTE: 详细的验证（包括出身、灵根、天赋）已在API层完成，此处不再重复验证，避免逻辑冲突。
    # total_allocated = root_bone + spirituality + comprehension + fortune + charm + temperament
    # if total_allocated > talent_tier.total_points:
    #     return None, f"属性点分配超出上限，最多可分配 {talent_tier.total_points} 点，实际分配 {total_allocated} 点。"

    try:
        new_char = await CharacterBase.create(
            player_id=player_id,
            world_id=world_id,
            talent_tier_id=talent_tier_id,
            character_name=character_name,
            root_bone=root_bone,
            spirituality=spirituality,
            comprehension=comprehension,
            fortune=fortune,
            charm=charm,
            temperament=temperament,
            origin_id=origin_id,
            spirit_root_id=spirit_root_id,
            selected_talents=selected_talent_ids or []
        )
        return new_char, "角色创建成功！"
    except Exception as e:
        return None, f"创建角色失败: {e}"

async def get_character_bases_by_player(player_id: int) -> List[CharacterBase]:
    """获取玩家的所有角色"""
    return await CharacterBase.filter(player_id=player_id).all()

async def get_character_base_by_id(character_id: int) -> Optional[CharacterBase]:
    """根据ID获取角色"""
    return await CharacterBase.get_or_none(id=character_id)