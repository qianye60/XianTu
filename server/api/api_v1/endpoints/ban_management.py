from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta

from server.schemas import schema
from server.api.api_v1 import deps
from server.models import AdminAccount, PlayerAccount, PlayerBanRecord, CharacterBase

router = APIRouter()

@router.post("/ban_player", response_model=schema.PlayerBanRecord, tags=["封号管理"])
async def ban_player(
    ban_data: schema.PlayerBanCreate,
    current_admin: AdminAccount = Depends(deps.get_super_admin_user)
):
    """
    封禁玩家账号
    """
    # 检查玩家是否存在
    player = await PlayerAccount.get_or_none(id=ban_data.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="玩家不存在")
    
    # 检查是否已经被封禁
    if player.is_banned:
        raise HTTPException(status_code=400, detail="玩家已被封禁")
    
    # 验证封号类型和结束时间
    if ban_data.ban_type == "temporary" and not ban_data.ban_end_time:
        raise HTTPException(status_code=400, detail="临时封号必须设置结束时间")
    
    if ban_data.ban_type == "permanent" and ban_data.ban_end_time:
        ban_data.ban_end_time = None  # 永久封号不需要结束时间
    
    # 创建封号记录
    ban_record = await PlayerBanRecord.create(
        player_id=ban_data.player_id,
        admin_id=current_admin.id,
        ban_type=ban_data.ban_type,
        reason=ban_data.reason,
        ban_end_time=ban_data.ban_end_time
    )
    
    # 更新玩家封禁状态
    player.is_banned = True
    await player.save()
    
    # 将该玩家的所有角色设为非激活状态
    await CharacterBase.filter(player_id=ban_data.player_id).update(is_active=False)
    
    return ban_record

@router.post("/unban_player/{player_id}", tags=["封号管理"])
async def unban_player(
    player_id: int,
    current_admin: AdminAccount = Depends(deps.get_super_admin_user)
):
    """
    解封玩家账号
    """
    player = await PlayerAccount.get_or_none(id=player_id)
    if not player:
        raise HTTPException(status_code=404, detail="玩家不存在")
    
    if not player.is_banned:
        raise HTTPException(status_code=400, detail="玩家未被封禁")
    
    # 将所有生效的封号记录设为无效
    await PlayerBanRecord.filter(player_id=player_id, is_active=True).update(is_active=False)
    
    # 更新玩家状态
    player.is_banned = False
    await player.save()
    
    return {"message": f"玩家 {player.user_name} 已解封"}

@router.get("/ban_records", response_model=List[schema.PlayerBanRecord], tags=["封号管理"])
async def get_ban_records(
    player_id: Optional[int] = Query(None, description="玩家ID，为空则获取所有记录"),
    is_active: Optional[bool] = Query(None, description="是否只获取生效中的封号"),
    limit: int = Query(50, description="返回记录数量限制"),
    offset: int = Query(0, description="偏移量"),
    current_admin: AdminAccount = Depends(deps.get_current_admin)
):
    """
    获取封号记录
    """
    query = PlayerBanRecord.all()
    
    if player_id:
        query = query.filter(player_id=player_id)
    
    if is_active is not None:
        query = query.filter(is_active=is_active)
    
    records = await query.order_by("-ban_start_time").offset(offset).limit(limit)
    return records

@router.post("/appeal", response_model=schema.PlayerBanRecord, tags=["申诉系统"])
async def submit_appeal(
    appeal_data: schema.AppealCreate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    提交申诉
    """
    # 检查封号记录是否存在且属于当前用户
    ban_record = await PlayerBanRecord.get_or_none(
        id=appeal_data.ban_record_id, 
        player_id=current_user.id,
        is_active=True
    )
    if not ban_record:
        raise HTTPException(status_code=404, detail="封号记录不存在或不属于您")
    
    # 检查是否已经申诉过
    if ban_record.appeal_status != "none":
        raise HTTPException(status_code=400, detail="该封号记录已申诉过")
    
    # 更新申诉信息
    ban_record.appeal_reason = appeal_data.appeal_reason
    ban_record.appeal_time = datetime.utcnow()
    ban_record.appeal_status = "pending"
    await ban_record.save()
    
    return ban_record

@router.post("/handle_appeal/{ban_record_id}", tags=["申诉系统"])
async def handle_appeal(
    ban_record_id: int,
    approve: bool = Query(..., description="是否批准申诉"),
    current_admin: AdminAccount = Depends(deps.get_current_admin)
):
    """
    处理申诉
    """
    ban_record = await PlayerBanRecord.get_or_none(id=ban_record_id)
    if not ban_record:
        raise HTTPException(status_code=404, detail="封号记录不存在")
    
    if ban_record.appeal_status != "pending":
        raise HTTPException(status_code=400, detail="该申诉不是待处理状态")
    
    if approve:
        # 批准申诉 - 解封
        ban_record.appeal_status = "approved"
        ban_record.is_active = False
        ban_record.appeal_handler_id = current_admin.id
        
        # 检查该玩家是否还有其他生效的封号
        other_active_bans = await PlayerBanRecord.filter(
            player_id=ban_record.player_id, 
            is_active=True,
            id__not=ban_record_id
        ).count()
        
        if other_active_bans == 0:
            # 没有其他生效封号，解封玩家
            player = await PlayerAccount.get(id=ban_record.player_id)
            player.is_banned = False
            await player.save()
        
        message = "申诉已批准，玩家已解封"
    else:
        # 拒绝申诉
        ban_record.appeal_status = "rejected"
        ban_record.appeal_handler_id = current_admin.id
        message = "申诉已拒绝"
    
    await ban_record.save()
    
    return {"message": message, "ban_record": ban_record}

@router.get("/check_ban_status", tags=["封号检查"])
async def check_ban_status(
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    检查当前用户的封号状态
    """
    if not current_user.is_banned:
        return {"is_banned": False, "message": "账号状态正常"}
    
    # 获取生效的封号记录
    active_ban = await PlayerBanRecord.get_or_none(
        player_id=current_user.id, 
        is_active=True
    )
    
    if not active_ban:
        # 数据不一致，更新用户状态
        current_user.is_banned = False
        await current_user.save()
        return {"is_banned": False, "message": "账号状态正常"}
    
    # 检查临时封号是否已过期
    if active_ban.ban_type == "temporary" and active_ban.ban_end_time:
        if datetime.utcnow() >= active_ban.ban_end_time:
            # 封号已过期，自动解封
            active_ban.is_active = False
            await active_ban.save()
            
            current_user.is_banned = False
            await current_user.save()
            
            return {"is_banned": False, "message": "临时封号已到期，账号已自动解封"}
    
    ban_info = {
        "is_banned": True,
        "ban_type": active_ban.ban_type,
        "reason": active_ban.reason,
        "ban_start_time": active_ban.ban_start_time,
        "ban_end_time": active_ban.ban_end_time,
        "can_appeal": active_ban.appeal_status == "none"
    }
    
    return ban_info