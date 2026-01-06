from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from server.api.api_v1 import deps
from server.core.online_world import ensure_world_instance_for_player
from server.models import Edge, EntityState, MapInstance, PlayerAccount, Poi, TravelSession, WorldInstance, WorldEventLog
from server.schemas import schema

router = APIRouter()


@router.get("/me", response_model=schema.OnlineWorldInstanceSummary)
async def get_my_world(current_user: PlayerAccount = Depends(deps.get_current_active_user)):
    world, _, _ = await ensure_world_instance_for_player(current_user)
    maps = await MapInstance.filter(world_id=world.id).all()
    return {
        "world_instance_id": world.id,
        "owner_player_id": world.owner_id,
        "owner_char_id": world.owner_char_id,
        "visibility_mode": world.visibility_mode,
        "revision": world.revision,
        "maps": [{"map_id": m.id, "map_key": m.map_key, "revision": m.revision} for m in maps],
    }


@router.post("/me/visibility", response_model=schema.OnlineWorldInstanceSummary)
async def update_my_world_visibility(
    data: schema.WorldVisibilityUpdate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    world, _, _ = await ensure_world_instance_for_player(current_user)
    if data.visibility_mode not in ("public", "hidden", "locked"):
        raise HTTPException(status_code=400, detail="visibility_mode 必须为 public/hidden/locked")
    world.visibility_mode = data.visibility_mode
    await world.save()
    maps = await MapInstance.filter(world_id=world.id).all()
    return {
        "world_instance_id": world.id,
        "owner_player_id": world.owner_id,
        "owner_char_id": world.owner_char_id,
        "visibility_mode": world.visibility_mode,
        "revision": world.revision,
        "maps": [{"map_id": m.id, "map_key": m.map_key, "revision": m.revision} for m in maps],
    }


@router.get("/{world_instance_id}/map/{map_id}/graph", response_model=schema.MapGraphResponse)
async def get_map_graph(
    world_instance_id: int,
    map_id: int,
    session_id: int | None = None,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    world = await WorldInstance.get_or_none(id=world_instance_id)
    if not world:
        raise HTTPException(status_code=404, detail="世界不存在")

    map_instance = await MapInstance.get_or_none(id=map_id, world_id=world_instance_id)
    if not map_instance:
        raise HTTPException(status_code=404, detail="地图不存在")

    viewer_entity: EntityState | None = None
    is_owner = world.owner_id == current_user.id

    if session_id is not None:
        session = await TravelSession.get_or_none(id=session_id, visitor_id=current_user.id, target_world_id=world_instance_id)
        if not session or session.state != "active":
            raise HTTPException(status_code=403, detail="无效穿越会话")
        if session.visitor_entity_id:
            viewer_entity = await EntityState.get_or_none(id=session.visitor_entity_id)
    elif is_owner:
        viewer_entity = await EntityState.get_or_none(world_id=world_instance_id, owner_id=current_user.id, entity_type="player_offline")

    if is_owner:
        pois = await Poi.filter(map_id=map_id).all()
        edges = await Edge.filter(map_id=map_id).all()
    else:
        # 访客视野：当前 POI + 相邻 POI
        if not viewer_entity:
            raise HTTPException(status_code=403, detail="访客需要有效会话")
        current_poi_id = viewer_entity.poi_id
        visible_poi_ids = {current_poi_id}
        outgoing = await Edge.filter(map_id=map_id, from_poi_id=current_poi_id).all()
        incoming = await Edge.filter(map_id=map_id, to_poi_id=current_poi_id).all()
        # 去重边（避免 outgoing+incoming 重复）
        by_id = {}
        for e in outgoing + incoming:
            by_id[e.id] = e
        edges = list(by_id.values())
        for e in edges:
            visible_poi_ids.add(e.from_poi_id)
            visible_poi_ids.add(e.to_poi_id)
        pois = await Poi.filter(id__in=list(visible_poi_ids)).all()

    poi_out = [
        schema.PoiOut(
            id=p.id,
            poi_key=p.poi_key,
            x=p.x,
            y=p.y,
            type=p.type,
            tags=p.tags,
            state=p.state,
        )
        for p in pois
    ]
    edge_out = [
        schema.EdgeOut(
            id=e.id,
            from_poi_id=e.from_poi_id,
            to_poi_id=e.to_poi_id,
            edge_type=e.edge_type,
            travel_cost=e.travel_cost,
            risk=e.risk,
            one_way=e.one_way,
        )
        for e in edges
    ]

    return {
        "map_id": map_instance.id,
        "map_key": map_instance.map_key,
        "pois": poi_out,
        "edges": edge_out,
        "viewer_poi_id": viewer_entity.poi_id if viewer_entity else None,
    }


@router.post("/{world_instance_id}/action", response_model=schema.WorldActionResponse)
async def world_action(
    world_instance_id: int,
    data: schema.WorldActionRequest,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    # M1: 仅支持 move
    if data.action_type != "move":
        raise HTTPException(status_code=400, detail="M1 仅支持 action_type=move")

    to_poi_id = data.intent.get("to_poi_id")
    if not isinstance(to_poi_id, int):
        raise HTTPException(status_code=400, detail="缺少 to_poi_id")

    world = await WorldInstance.get_or_none(id=world_instance_id)
    if not world:
        raise HTTPException(status_code=404, detail="世界不存在")

    is_owner = world.owner_id == current_user.id
    viewer_entity: EntityState | None = None
    session: TravelSession | None = None

    if data.session_id is not None:
        session = await TravelSession.get_or_none(
            id=data.session_id,
            visitor_id=current_user.id,
            target_world_id=world_instance_id,
            state="active",
        )
        if not session or not session.visitor_entity_id:
            raise HTTPException(status_code=403, detail="无效穿越会话")
        viewer_entity = await EntityState.get_or_none(id=session.visitor_entity_id)
    elif is_owner:
        viewer_entity = await EntityState.get_or_none(world_id=world_instance_id, owner_id=current_user.id, entity_type="player_offline")

    if not viewer_entity:
        raise HTTPException(status_code=403, detail="无可用实体")

    if viewer_entity.world_id != world_instance_id:
        raise HTTPException(status_code=403, detail="实体不在该世界")

    # 校验边存在（从当前 POI 出发）
    edge = await Edge.get_or_none(map_id=viewer_entity.map_id, from_poi_id=viewer_entity.poi_id, to_poi_id=to_poi_id)
    if not edge:
        raise HTTPException(status_code=400, detail="路径不存在")

    to_poi = await Poi.get_or_none(id=to_poi_id, map_id=viewer_entity.map_id)
    if not to_poi:
        raise HTTPException(status_code=404, detail="目标点位不存在")

    viewer_entity.poi = to_poi
    await viewer_entity.save()

    await WorldEventLog.create(
        world_id=world_instance_id,
        map_id=viewer_entity.map_id,
        poi_id=to_poi.id,
        actor_entity_id=viewer_entity.id,
        event_type="move",
        payload={"to_poi_id": to_poi.id},
        server_verdict={"ok": True, "note": "M1 move"},
    )

    return {
        "success": True,
        "message": "移动成功",
        "new_map_id": viewer_entity.map_id,
        "new_poi_id": viewer_entity.poi_id,
    }
