from __future__ import annotations

from datetime import date
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status

from server.api.api_v1 import deps
from server.core.online_world import (
    can_enter_world,
    consume_travel_points,
    ensure_world_instance_for_player,
    get_or_create_travel_profile,
    try_signin_travel_points,
)
from server.models import (
    EntityState,
    PlayerAccount,
    TravelSession,
    WorldEventLog,
    WorldInstance,
    InvasionReport,
)
from server.schemas import schema

router = APIRouter()


@router.post("/signin", response_model=schema.TravelSigninResponse)
async def travel_signin(current_user: PlayerAccount = Depends(deps.get_current_active_user)):
    signed_in, points = await try_signin_travel_points(current_user, points_per_day=1)
    return {
        "travel_points": points,
        "signed_in": signed_in,
        "message": "签到成功，获得 1 穿越点" if signed_in else "今日已签到",
    }


@router.get("/profile", response_model=schema.TravelSigninResponse)
async def travel_profile(current_user: PlayerAccount = Depends(deps.get_current_active_user)):
    profile = await get_or_create_travel_profile(current_user)
    signed_in_today = profile.last_signin_at == date.today()
    return {
        "travel_points": profile.travel_points,
        "signed_in": signed_in_today,
        "message": "ok",
    }


@router.post("/start", response_model=schema.TravelStartResponse)
async def travel_start(
    data: schema.TravelStartRequest,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    target_user = await PlayerAccount.get_or_none(user_name=data.target_username)
    if not target_user:
        raise HTTPException(status_code=404, detail="目标玩家不存在")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能穿越到自己的世界")

    # 确保双方都拥有主世界（M1: 默认创建）
    visitor_world, visitor_map, visitor_safehouse = await ensure_world_instance_for_player(current_user)
    target_world, target_map, target_safehouse = await ensure_world_instance_for_player(target_user)

    ok, msg = can_enter_world(current_user, target_world, data.invite_code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    # TP 消耗（M1: 固定 1）
    success, points_left = await consume_travel_points(current_user, cost=1)
    if not success:
        raise HTTPException(status_code=400, detail=f"穿越点不足（当前：{points_left}）")

    visitor_entity = await EntityState.create(
        world=target_world,
        map=target_map,
        poi=target_safehouse,
        entity_type="player_online",
        owner=current_user,
        owner_char_id=None,
        stats={"hp": 10, "realm": "凡人"},
        state_flags={"state": "visitor"},
    )

    session = await TravelSession.create(
        visitor=current_user,
        target_world=target_world,
        visitor_entity=visitor_entity,
        entry_map=target_map,
        entry_poi=target_safehouse,
        return_anchor={
            "home_world_instance_id": visitor_world.id,
            "home_map_id": visitor_map.id,
            "home_poi_id": visitor_safehouse.id,
        },
        policy={"allow_loot": False, "allow_destroy": False},  # M1: 仅移动与侦查
        state="active",
    )

    await WorldEventLog.create(
        world=target_world,
        map=target_map,
        poi=target_safehouse,
        actor_entity=visitor_entity,
        event_type="travel_start",
        payload={"visitor_player_id": current_user.id},
        server_verdict={"ok": True},
    )

    return {
        "session_id": session.id,
        "target_world_instance_id": target_world.id,
        "entry_map_id": target_map.id,
        "entry_poi_id": target_safehouse.id,
        "return_anchor": session.return_anchor or {},
        "travel_points_left": points_left,
    }


@router.post("/end", response_model=schema.TravelEndResponse)
async def travel_end(
    data: schema.TravelEndRequest,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    session = await TravelSession.get_or_none(id=data.session_id).prefetch_related(
        "target_world", "visitor_entity", "entry_map", "entry_poi"
    )
    if not session or session.visitor_id != current_user.id:
        raise HTTPException(status_code=404, detail="穿越会话不存在")
    if session.state != "active":
        return {"success": True, "message": "会话已结束"}

    session.state = "ended"
    session.ended_at = datetime.utcnow()
    await session.save()

    # 写入事件
    if session.visitor_entity_id:
        await WorldEventLog.create(
            world_id=session.target_world_id,
            map_id=session.entry_map_id,
            poi_id=session.entry_poi_id,
            actor_entity_id=session.visitor_entity_id,
            event_type="travel_end",
            payload={},
            server_verdict={"ok": True},
        )

    # 生成入侵报告（M1：简单汇总 session 期间的事件类型计数与访问 POI）
    target_world = await WorldInstance.get(id=session.target_world_id).prefetch_related("owner")
    logs = await WorldEventLog.filter(
        world_id=session.target_world_id,
        actor_entity_id=session.visitor_entity_id,
        created_at__gte=session.started_at,
    ).order_by("created_at")

    poi_visits = []
    counts = {}
    for log in logs:
        counts[log.event_type] = counts.get(log.event_type, 0) + 1
        if log.poi_id:
            poi_visits.append(log.poi_id)

    summary = {
        "session_id": session.id,
        "visitor_player_id": current_user.id,
        "event_counts": counts,
        "poi_visits": poi_visits[:200],
        "started_at": session.started_at.isoformat(),
        "ended_at": (session.ended_at.isoformat() if session.ended_at else None),
    }

    await InvasionReport.create(
        world_id=session.target_world_id,
        victim_id=target_world.owner_id,
        session=session,
        summary=summary,
        unread=True,
    )

    # 移除 visitor entity（M1：直接删除）
    if session.visitor_entity_id:
        await EntityState.filter(id=session.visitor_entity_id).delete()

    return {"success": True, "message": "已返回原世界"}
