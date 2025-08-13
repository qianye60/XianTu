from typing import Optional, Tuple, Dict, Any

from server.models import PlayerAccount, World, Character
from server.schemas import schema

async def create_character(
    user_id: int, 
    world_id: int, 
    character_name: str, 
    character_data: Dict[str, Any]
) -> Tuple[Optional[Character], str]:
    """
    在指定世界为指定用户缔造一具化身（创建云存档）。
    """
    # 验证玩家和世界是否存在
    player = await PlayerAccount.get_or_none(id=user_id)
    if not player:
        return None, "指定玩家不存在。"
    
    world = await World.get_or_none(id=world_id)
    if not world:
        return None, "指定世界不存在。"

    try:
        new_char = await Character.create(
            player=player,
            world=world,
            character_name=character_name,
            character_data=character_data
        )
        return new_char, "仙身缔造成功！"
    except Exception as e:
        # 更通用的异常捕获
        return None, f"未知错误: {e}"