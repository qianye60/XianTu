from fastapi import APIRouter, HTTPException, Query, Depends, Request
from typing import Dict, Any, List
from datetime import datetime, timedelta

from server.schemas import schema
from server.crud import crud_character, crud_origins, crud_spirit_roots, crud_talents, crud_user
from server.api.api_v1 import deps
from server.models import PlayerAccount, CharacterBase, CharacterGameState, PlayerBanRecord, AdminAccount
from server.core import security
from jose import jwt
from pydantic import ValidationError

router = APIRouter()

@router.get("/creation_data", response_model=schema.CreationDataResponse, tags=["角色/存档体系"])
async def get_creation_data(world_id: int = Query(..., description="世界ID")):
    """
    获取角色创建所需的基础数据（出身、灵根、天赋等）
    """
    try:
        origins = await crud_origins.get_origins()
        spirit_roots = await crud_spirit_roots.get_spirit_roots()
        talents = await crud_talents.get_talents()
        
        # 转换为前端需要的格式
        origins_data = []
        for o in origins:
            attribute_modifiers = {
                "root_bone": o.root_bone_modifier,
                "spirituality": o.spirituality_modifier,  
                "comprehension": o.comprehension_modifier,
                "fortune": o.fortune_modifier,
                "charm": o.charm_modifier,
                "temperament": o.temperament_modifier
            }
            origins_data.append({
                "id": o.id, 
                "name": o.name, 
                "description": o.description,
                "attribute_modifiers": attribute_modifiers, 
                "rarity": o.rarity,
                "talent_cost": o.talent_cost
            })
        spirit_roots_data = [{"id": sr.id, "name": sr.name, "description": sr.description, 
                            "base_multiplier": sr.base_multiplier, "talent_cost": sr.talent_cost} for sr in spirit_roots]
        talents_data = [{"id": t.id, "name": t.name, "description": t.description, 
                        "effects": t.effects, "rarity": t.rarity, "talent_cost": t.talent_cost, "max_uses": t.max_uses} for t in talents]
        
        return schema.CreationDataResponse(
            origins=origins_data,
            spirit_roots=spirit_roots_data,
            talents=talents_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取创建数据失败: {str(e)}")

@router.post("/create", response_model=schema.CharacterBase)
async def create_character_base(
    character_data: schema.CharacterBaseCreate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    创建新角色基础信息
    """
    # 检查账号是否被封
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁，无法创建角色")
    
    # 检查是否达到角色数量上限
    existing_chars = await CharacterBase.filter(player_id=current_user.id, is_deleted=False).count()
    if existing_chars >= 5:  # 最多5个角色
        raise HTTPException(status_code=400, detail="角色数量已达上限(5个)")
    
    # 验证基础六命不超过10点
    attributes = [
        ("根骨", character_data.root_bone),
        ("灵性", character_data.spirituality), 
        ("悟性", character_data.comprehension),
        ("气运", character_data.fortune),
        ("魅力", character_data.charm),
        ("心性", character_data.temperament)
    ]
    for attr_name, attr_value in attributes:
        if attr_value < 0:
            raise HTTPException(status_code=400, detail=f"{attr_name}不能为负数")
        if attr_value > 10:
            raise HTTPException(status_code=400, detail=f"{attr_name}不能超过10点")
    
    # 验证世界是否存在
    from server.models import World
    world = await World.get_or_none(id=character_data.world_id)
    if not world:
        raise HTTPException(status_code=404, detail="指定的世界不存在")
    
    # 验证天资等级是否存在
    from server.models import TalentTier
    talent_tier = await TalentTier.get_or_none(id=character_data.talent_tier_id)
    if not talent_tier:
        raise HTTPException(status_code=404, detail="指定的天资等级不存在")
    
    # 验证天赋点数消耗
    total_cost = 0
    
    # 计算基础六命消耗 
    attribute_cost = sum(attr_value for _, attr_value in attributes)
    total_cost += attribute_cost
    
    # 计算出身消耗
    if character_data.origin_id:
        origin = await crud_origins.get_origin(character_data.origin_id)
        if not origin:
            raise HTTPException(status_code=404, detail="出身不存在")
        total_cost += origin.talent_cost
    
    # 计算灵根消耗
    if character_data.spirit_root_id:
        spirit_root = await crud_spirit_roots.get_spirit_root(character_data.spirit_root_id)
        if not spirit_root:
            raise HTTPException(status_code=404, detail="灵根不存在")
        total_cost += spirit_root.talent_cost
    
    # 计算天赋消耗
    if character_data.selected_talent_ids:
        for talent_id in character_data.selected_talent_ids:
            talent = await crud_talents.get_talent(talent_id)
            if not talent:
                raise HTTPException(status_code=404, detail=f"天赋ID {talent_id} 不存在")
            total_cost += talent.talent_cost
    
    # 验证总点数不超过天资等级限制
    if total_cost > talent_tier.total_points:
        raise HTTPException(
            status_code=400, 
            detail=f"总点数消耗 {total_cost} 超过天资等级 '{talent_tier.name}' 的限制 {talent_tier.total_points}"
        )
    
    new_character, error_msg = await crud_character.create_character_base(
        player_id=current_user.id,  # 使用当前登录用户的ID
        world_id=character_data.world_id,
        talent_tier_id=character_data.talent_tier_id,
        character_name=character_data.character_name,
        root_bone=character_data.root_bone,
        spirituality=character_data.spirituality,
        comprehension=character_data.comprehension,
        fortune=character_data.fortune,
        charm=character_data.charm,
        temperament=character_data.temperament,
        origin_id=character_data.origin_id,
        spirit_root_id=character_data.spirit_root_id,
        selected_talent_ids=character_data.selected_talent_ids
    )
    
    if not new_character:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # 根据先天六司计算核心属性
    from server.core.character_calculation import calculate_core_attributes
    core_attrs = calculate_core_attributes(
        root_bone=character_data.root_bone,
        spirituality=character_data.spirituality,
        comprehension=character_data.comprehension,
        fortune=character_data.fortune,
        charm=character_data.charm,
        temperament=character_data.temperament,
        birth_age=character_data.birth_age
    )
    
    # 创建角色游戏状态
    # core_attrs 已经包含了初始化的背包和装备
    game_state = await CharacterGameState.create(
        character_id=new_character.id,
        **core_attrs
    )
    
    # 返回角色信息和游戏状态
    character_dict = {
        "id": new_character.id,
        "character_name": new_character.character_name,
        "player_id": new_character.player_id,
        "world_id": new_character.world_id,
        "talent_tier_id": new_character.talent_tier_id,
        "root_bone": new_character.root_bone,
        "spirituality": new_character.spirituality,
        "comprehension": new_character.comprehension,
        "fortune": new_character.fortune,
        "charm": new_character.charm,
        "temperament": new_character.temperament,
        "origin_id": new_character.origin_id,
        "spirit_root_id": new_character.spirit_root_id,
        "selected_talents": new_character.selected_talents,
        "is_active": new_character.is_active,
        "is_deleted": new_character.is_deleted,
        "created_at": new_character.created_at,
        "game_state": {
            "health_points": game_state.health_points,
            "max_health_points": game_state.max_health_points,
            "spiritual_power": game_state.spiritual_power,
            "max_spiritual_power": game_state.max_spiritual_power,
            "spirit_sense": game_state.spirit_sense,
            "max_spirit_sense": game_state.max_spirit_sense,
            "current_age": game_state.current_age,
            "max_lifespan": game_state.max_lifespan,
            "spiritual_stones": game_state.spiritual_stones,
            "current_realm_id": game_state.current_realm_id,
            "cultivation_progress": game_state.cultivation_progress
        }
    }
    
    return character_dict

@router.post("/create_by_admin", response_model=schema.CharacterBase, tags=["角色/存档体系"])
async def admin_create_character(
    character_data: schema.CharacterBaseCreate,
    current_admin: AdminAccount = Depends(deps.get_current_admin_direct)
):
    """
    管理员创建角色（超级管理员专用）
    """
    # 检查管理员权限
    if current_admin.role != 'super_admin':
        raise HTTPException(status_code=403, detail="权限不足，仅超级管理员可创建角色")
    
    # 验证目标玩家是否存在
    from server.models import PlayerAccount
    target_player = await PlayerAccount.get_or_none(id=character_data.player_id)
    if not target_player:
        raise HTTPException(status_code=404, detail="目标玩家不存在")
    
    # 检查目标玩家是否被封
    if target_player.is_banned:
        raise HTTPException(status_code=400, detail="目标玩家已被封禁，无法创建角色")
    
    # 检查角色数量上限
    existing_chars = await CharacterBase.filter(player_id=character_data.player_id, is_deleted=False).count()
    if existing_chars >= 5:  # 最多5个角色
        raise HTTPException(status_code=400, detail="目标玩家角色数量已达上限(5个)")
    
    # 验证基础六命不超过10点
    attributes = [
        ("根骨", character_data.root_bone),
        ("灵性", character_data.spirituality), 
        ("悟性", character_data.comprehension),
        ("气运", character_data.fortune),
        ("魅力", character_data.charm),
        ("心性", character_data.temperament)
    ]
    for attr_name, attr_value in attributes:
        if attr_value < 0:
            raise HTTPException(status_code=400, detail=f"{attr_name}不能为负数")
        if attr_value > 10:
            raise HTTPException(status_code=400, detail=f"{attr_name}不能超过10点")
    
    # 验证世界是否存在
    from server.models import World
    world = await World.get_or_none(id=character_data.world_id)
    if not world:
        raise HTTPException(status_code=404, detail="指定的世界不存在")
    
    # 验证天资等级是否存在
    from server.models import TalentTier
    talent_tier = await TalentTier.get_or_none(id=character_data.talent_tier_id)
    if not talent_tier:
        raise HTTPException(status_code=404, detail="指定的天资等级不存在")
    
    # 验证天赋点数消耗
    total_cost = 0
    
    # 计算基础六命消耗 
    attribute_cost = sum(attr_value for _, attr_value in attributes)
    total_cost += attribute_cost
    
    # 计算出身消耗
    if character_data.origin_id:
        origin = await crud_origins.get_origin(character_data.origin_id)
        if not origin:
            raise HTTPException(status_code=404, detail="出身不存在")
        total_cost += origin.talent_cost
    
    # 计算灵根消耗
    if character_data.spirit_root_id:
        spirit_root = await crud_spirit_roots.get_spirit_root(character_data.spirit_root_id)
        if not spirit_root:
            raise HTTPException(status_code=404, detail="灵根不存在")
        total_cost += spirit_root.talent_cost
    
    # 计算天赋消耗
    if character_data.selected_talent_ids:
        for talent_id in character_data.selected_talent_ids:
            talent = await crud_talents.get_talent(talent_id)
            if not talent:
                raise HTTPException(status_code=404, detail=f"天赋ID {talent_id} 不存在")
            total_cost += talent.talent_cost
    
    # 验证总点数不超过天资等级限制
    if total_cost > talent_tier.total_points:
        raise HTTPException(
            status_code=400, 
            detail=f"总点数消耗 {total_cost} 超过天资等级 '{talent_tier.name}' 的限制 {talent_tier.total_points}"
        )
    
    new_character, error_msg = await crud_character.create_character_base(
        player_id=character_data.player_id,
        world_id=character_data.world_id,
        talent_tier_id=character_data.talent_tier_id,
        character_name=character_data.character_name,
        root_bone=character_data.root_bone,
        spirituality=character_data.spirituality,
        comprehension=character_data.comprehension,
        fortune=character_data.fortune,
        charm=character_data.charm,
        temperament=character_data.temperament,
        origin_id=character_data.origin_id,
        spirit_root_id=character_data.spirit_root_id,
        selected_talent_ids=character_data.selected_talent_ids
    )
    
    if not new_character:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # 根据先天六司计算核心属性
    from server.core.character_calculation import calculate_core_attributes
    core_attrs = calculate_core_attributes(
        root_bone=character_data.root_bone,
        spirituality=character_data.spirituality,
        comprehension=character_data.comprehension,
        fortune=character_data.fortune,
        charm=character_data.charm,
        temperament=character_data.temperament,
        birth_age=character_data.birth_age
    )
    
    # 创建角色游戏状态
    # core_attrs 已经包含了初始化的背包和装备
    game_state = await CharacterGameState.create(
        character_id=new_character.id,
        **core_attrs
    )
    
    # 返回角色信息和游戏状态
    character_dict = {
        "id": new_character.id,
        "character_name": new_character.character_name,
        "player_id": new_character.player_id,
        "world_id": new_character.world_id,
        "talent_tier_id": new_character.talent_tier_id,
        "root_bone": new_character.root_bone,
        "spirituality": new_character.spirituality,
        "comprehension": new_character.comprehension,
        "fortune": new_character.fortune,
        "charm": new_character.charm,
        "temperament": new_character.temperament,
        "origin_id": new_character.origin_id,
        "spirit_root_id": new_character.spirit_root_id,
        "selected_talents": new_character.selected_talents,
        "is_active": new_character.is_active,
        "is_deleted": new_character.is_deleted,
        "created_at": new_character.created_at,
        "game_state": {
            "health_points": game_state.health_points,
            "max_health_points": game_state.max_health_points,
            "spiritual_power": game_state.spiritual_power,
            "max_spiritual_power": game_state.max_spiritual_power,
            "spirit_sense": game_state.spirit_sense,
            "max_spirit_sense": game_state.max_spirit_sense,
            "current_age": game_state.current_age,
            "max_lifespan": game_state.max_lifespan,
            "spiritual_stones": game_state.spiritual_stones,
            "current_realm_id": game_state.current_realm_id,
            "cultivation_progress": game_state.cultivation_progress
        }
    }
    
    return character_dict

@router.get("/my", response_model=List[schema.CharacterBase])
async def get_my_characters(
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    获取当前用户的所有角色
    """
    # 如果账号被封，返回空列表
    if current_user.is_banned:
        return []
    
    characters = await crud_character.get_character_bases_by_player(current_user.id)
    # 只返回未删除的角色
    accessible_chars = []
    for char in characters:
        if not char.is_deleted:
            # 设置is_accessible属性
            char_dict = char.__dict__.copy()
            char_dict['is_accessible'] = not current_user.is_banned and not char.is_deleted
            accessible_chars.append(schema.CharacterBase(**char_dict))
    
    return accessible_chars

@router.post("/{character_id}/activate", response_model=schema.CharacterBase)
async def activate_character(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    激活指定角色（设为当前游戏角色）
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
    
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在或已删除")
    
    # 先将该玩家的所有角色设为非激活状态
    await CharacterBase.filter(player_id=current_user.id).update(is_active=False)
    
    # 激活指定角色并更新最后游戏时间
    character.is_active = True
    character.last_played = datetime.utcnow()
    await character.save()
    
    return character

@router.get("/all", response_model=List[dict], tags=["角色/存档体系"])
async def get_all_characters(request: Request):
    """
    获取所有角色列表（管理员专用）
    """
    # 手动验证管理员权限
    current_admin = await verify_admin_token(request)
    
    characters = await CharacterBase.filter().prefetch_related('player', 'world')
    
    # 转换为响应格式，添加玩家名称和世界名称
    character_list = []
    for char in characters:
        char_data = {
            "id": char.id,
            "character_name": char.character_name,
            "player_id": char.player_id,
            "player_name": char.player.user_name,
            "world_id": char.world_id,
            "world_name": char.world.name,
            "is_active": char.is_active,
            "is_deleted": char.is_deleted,
            "is_accessible": not char.player.is_banned and not char.is_deleted,
            "last_played": char.last_played,
            "play_time_minutes": char.play_time_minutes,
            "created_at": char.created_at
        }
        character_list.append(char_data)
    
    return character_list

@router.get("/{character_id}", response_model=schema.CharacterBase)
async def get_character(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    获取指定角色详情
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await crud_character.get_character_base_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 验证角色属于当前用户
    if character.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此角色")
    
    if character.is_deleted:
        raise HTTPException(status_code=404, detail="角色已删除")
    
    return character

@router.delete("/{character_id}")
async def delete_character(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    删除角色（硬删除）
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 硬删除，由于 on_delete=CASCADE，关联的 CharacterGameState 也会被删除
    await character.delete()
    
    return {"message": "角色已彻底删除"}

@router.get("/{character_id}/game_state", response_model=schema.CharacterGameState)
async def get_character_game_state(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    获取角色游戏状态
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    game_state = await CharacterGameState.get_or_none(character_id=character_id)
    if not game_state:
        # 如果不存在游戏状态，创建一个默认的
        game_state = await CharacterGameState.create(character_id=character_id)
    
    return game_state

@router.put("/{character_id}/game_state", response_model=schema.CharacterGameState)
async def update_character_game_state(
    character_id: int,
    state_update: schema.CharacterGameStateUpdate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    更新角色游戏状态
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    game_state = await CharacterGameState.get_or_none(character_id=character_id)
    if not game_state:
        raise HTTPException(status_code=404, detail="角色游戏状态不存在")
    
    # 更新提供的字段
    update_data = state_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(game_state, field, value)
    
    # 更新版本号和标记为需要同步
    game_state.version += 1
    game_state.is_dirty = True
    
    # 更新角色的游戏时间
    if character.is_active:
        character.last_played = datetime.utcnow()
        await character.save()
    
    await game_state.save()
    
    return game_state

@router.post("/{character_id}/sync", tags=["游戏状态同步"])
async def sync_character_state(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    手动同步角色状态到云端
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    game_state = await CharacterGameState.get_or_none(character_id=character_id)
    if not game_state:
        raise HTTPException(status_code=404, detail="角色游戏状态不存在")
    
    # 标记为已同步
    game_state.is_dirty = False
    game_state.last_sync_time = datetime.utcnow()
    await game_state.save()
    
    # 更新角色游戏时间
    character.last_played = datetime.utcnow()
    await character.save()
    
    return {"message": "角色状态同步成功", "sync_time": game_state.last_sync_time}

@router.post("/{character_id}/auto_save", tags=["游戏状态同步"])
async def auto_save_character_state(
    character_id: int,
    play_time_increment: int = Query(0, description="本次游戏时间增量(分钟)"),
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    自动保存角色状态（游戏客户端定期调用）
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    # 更新游戏时间和最后游戏时间
    character.play_time_minutes += play_time_increment
    character.last_played = datetime.utcnow()
    await character.save()
    
    # 获取游戏状态并标记为已同步
    game_state = await CharacterGameState.get_or_none(character_id=character_id)
    if game_state:
        game_state.is_dirty = False
        game_state.last_sync_time = datetime.utcnow()
        await game_state.save()
    
    return {
        "message": "自动保存成功", 
        "total_play_time": character.play_time_minutes,
        "last_sync": game_state.last_sync_time if game_state else None
    }

@router.get("/{character_id}/sync_status", tags=["游戏状态同步"])
async def get_sync_status(
    character_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    获取角色同步状态
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
        
    character = await CharacterBase.get_or_none(id=character_id, player_id=current_user.id, is_deleted=False)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    game_state = await CharacterGameState.get_or_none(character_id=character_id)
    if not game_state:
        return {
            "has_unsaved_data": False,
            "last_sync_time": None,
            "version": 0
        }
    
    return {
        "has_unsaved_data": game_state.is_dirty,
        "last_sync_time": game_state.last_sync_time,
        "version": game_state.version,
        "character_last_played": character.last_played
    }

@router.post("/batch_sync", tags=["游戏状态同步"])
async def batch_sync_characters(
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    批量同步用户所有角色状态
    """
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")
    
    characters = await CharacterBase.filter(player_id=current_user.id, is_deleted=False)
    sync_results = []
    
    for character in characters:
        game_state = await CharacterGameState.get_or_none(character_id=character.id)
        if game_state and game_state.is_dirty:
            game_state.is_dirty = False
            game_state.last_sync_time = datetime.utcnow()
            await game_state.save()
            
            sync_results.append({
                "character_id": character.id,
                "character_name": character.character_name,
                "synced": True,
                "sync_time": game_state.last_sync_time
            })
        else:
            sync_results.append({
                "character_id": character.id,
                "character_name": character.character_name,
                "synced": False,
                "reason": "no_unsaved_data"
            })
    
    return {
        "message": f"批量同步完成，共处理 {len(characters)} 个角色",
        "results": sync_results
    }

@router.get("/test_admin", tags=["测试"])
async def test_admin_auth(
    current_admin: AdminAccount = Depends(deps.get_current_admin_direct)
):
    """
    测试管理员认证
    """
    return {"message": f"管理员 {current_admin.user_name} 认证成功", "role": current_admin.role}

@router.get("/debug_no_auth", tags=["测试"])
async def debug_no_auth():
    """
    完全没有认证的测试端点
    """
    return {"message": "这个端点没有任何认证", "timestamp": "2025-08-16"}

async def verify_admin_token(request: Request) -> AdminAccount:
    """
    直接验证管理员token，完全绕过OAuth2依赖系统
    """
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="需要管理员授权")
    
    token = authorization.split(" ")[1]
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(status_code=401, detail="无效的管理员令牌")
    
    admin = await crud_user.get_admin_by_username(user_name=token_data.sub)
    if not admin:
        raise HTTPException(status_code=404, detail="未找到此管理员")
    
    return admin

@router.get("/all_for_admin", tags=["角色/存档体系"])
async def get_all_characters_for_admin():
    """
    获取所有角色列表（临时无认证版本，用于管理后台）
    """
    try:
        characters = await CharacterBase.filter().prefetch_related('player', 'world')
        
        # 转换为响应格式，添加玩家名称和世界名称
        character_list = []
        for char in characters:
            char_data = {
                "id": char.id,
                "character_name": char.character_name,
                "player_id": char.player_id,
                "player_name": char.player.user_name,
                "world_id": char.world_id,
                "world_name": char.world.name,
                "is_active": char.is_active,
                "is_deleted": char.is_deleted,
                "is_accessible": not char.player.is_banned and not char.is_deleted,
                "last_played": char.last_played,
                "play_time_minutes": char.play_time_minutes,
                "created_at": char.created_at
            }
            character_list.append(char_data)
        
        return character_list
    except Exception as e:
        return {"error": f"获取角色列表失败: {str(e)}"}

