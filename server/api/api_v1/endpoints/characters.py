from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Tuple, Dict, Any

from server.schemas import schema
# from server.crud import crud_character # 不再需要，逻辑已内联
from server.api.api_v1 import deps
from server.models import PlayerAccount, AdminAccount, CharacterBase, GameSave

router = APIRouter()

# --- CRUD Logic (Inlined from crud_character.py) ---

async def _create_character_base(
    player_id: int,
    char_id: str,
    base_info: Dict[str, Any]
) -> Tuple[Optional[CharacterBase], str]:
    player = await PlayerAccount.get_or_none(id=player_id)
    if not player:
        return None, "指定玩家不存在。"

    existing_char = await CharacterBase.get_or_none(char_id=char_id)
    if existing_char:
        return None, f"角色唯一ID '{char_id}' 已存在。"

    try:
        new_game_save = await GameSave.create()
        new_char = await CharacterBase.create(
            player_id=player_id,
            char_id=char_id,
            base_info=base_info,
            game_save=new_game_save
        )
        return new_char, "角色创建成功！"
    except Exception as e:
        return None, f"创建角色失败: {e}"

async def _get_character_bases_by_player(player_id: int) -> List[CharacterBase]:
    return await CharacterBase.filter(
        player_id=player_id, is_deleted=False
    ).prefetch_related('game_save').all()

async def _get_character_base_by_char_id(char_id: str) -> Optional[CharacterBase]:
    character = await CharacterBase.get_or_none(char_id=char_id)
    if character:
        await character.fetch_related('game_save')
    return character

# --- API Endpoints ---

@router.post("/create", response_model=schema.CharacterBase, tags=["V3 - 角色"])
async def create_character(
    character_data: schema.CharacterCreateV3,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """(V3) 创建新角色"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁，无法创建角色")

    new_char, error_msg = await _create_character_base(
        player_id=current_user.id,
        char_id=character_data.char_id,
        base_info=character_data.base_info.model_dump()
    )

    if not new_char:
        raise HTTPException(status_code=400, detail=error_msg)
    return new_char

@router.post("/create_by_admin", response_model=schema.CharacterBase, tags=["V3 - 角色"])
async def create_character_by_admin(
    character_data: schema.CharacterCreateV3,
    current_admin: AdminAccount = Depends(deps.get_super_admin)
):
    """(V3) 管理员创建新角色"""
    if not character_data.player_id:
        raise HTTPException(status_code=400, detail="管理员创建角色必须提供 player_id")

    new_char, error_msg = await _create_character_base(
        player_id=character_data.player_id,
        char_id=character_data.char_id,
        base_info=character_data.base_info.model_dump()
    )

    if not new_char:
        raise HTTPException(status_code=400, detail=error_msg)
    return new_char

@router.get("/my", response_model=List[schema.CharacterProfileResponse], tags=["V3 - 角色"])
async def get_my_characters(
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """(V3) 获取当前用户的所有角色档案"""
    if current_user.is_banned:
        return []
    
    characters = await _get_character_bases_by_player(current_user.id)
    
    response = []
    for char in characters:
        if not char.game_save: continue
        
        profile = schema.CharacterProfileResponse(
            id=char.id,
            char_id=char.char_id,
            player_id=char.player_id,
            base_info=char.base_info,
            game_save=char.game_save,
            created_at=char.created_at,
            is_deleted=char.is_deleted
        )
        response.append(profile)
        
    return response

@router.get("/{char_id}", response_model=schema.CharacterProfileResponse, tags=["V3 - 角色"])
async def get_character(
    char_id: str,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """(V3) 获取指定角色详情"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await _get_character_base_by_char_id(char_id)
    if not character or character.player_id != current_user.id:
        raise HTTPException(status_code=404, detail="角色不存在或无权访问")
    
    if character.is_deleted:
        raise HTTPException(status_code=404, detail="角色已删除")
    
    if not character.game_save:
        raise HTTPException(status_code=404, detail="角色存档数据丢失")

    return schema.CharacterProfileResponse(
        id=character.id,
        char_id=character.char_id,
        player_id=character.player_id,
        base_info=character.base_info,
        game_save=character.game_save,
        created_at=character.created_at,
        is_deleted=character.is_deleted
    )

@router.delete("/{char_id}", tags=["V3 - 角色"])
async def delete_character(
    char_id: str,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """(V3) 删除角色（逻辑删除）"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await _get_character_base_by_char_id(char_id)
    if not character or character.player_id != current_user.id:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    character.is_deleted = True
    await character.save()
    
    return {"message": "角色已标记为删除"}

@router.put("/{char_id}/save", tags=["V3 - 存档"])
async def update_character_save(
    char_id: str,
    save_data: schema.SaveDataUpdate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """(V3) 更新角色存档数据到云端"""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
    
    character = await _get_character_base_by_char_id(char_id)
    if not character or character.player_id != current_user.id:
        raise HTTPException(status_code=404, detail="角色不存在或无权访问")
    
    if not character.game_save:
        raise HTTPException(status_code=404, detail="角色存档数据丢失")
    
    # 更新存档数据
    character.game_save.save_data = save_data.save_data
    character.game_save.world_map = save_data.world_map
    character.game_save.game_time = save_data.game_time
    character.game_save.version += 1
    character.game_save.is_dirty = True
    
    await character.game_save.save()
    
    return {"message": "存档已成功同步到云端", "version": character.game_save.version}
