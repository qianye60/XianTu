from __future__ import annotations

from datetime import date
from typing import Any, Dict, Tuple

from server.models import (
    Edge,
    EntityState,
    MapInstance,
    PlayerAccount,
    PlayerTravelProfile,
    Poi,
    WorldInstance,
)


DEFAULT_MAP_KEY = "mainland"


async def get_or_create_travel_profile(player: PlayerAccount) -> PlayerTravelProfile:
    profile = await PlayerTravelProfile.get_or_none(player_id=player.id)
    if profile:
        return profile
    return await PlayerTravelProfile.create(player=player, travel_points=0)


async def ensure_world_instance_for_player(
    player: PlayerAccount,
    owner_char_id: str | None = None,
) -> Tuple[WorldInstance, MapInstance, Poi]:
    """
    确保玩家有一个主世界实例与默认地图/安全点 POI（M1 引导用）。
    """
    world = await WorldInstance.get_or_none(owner_id=player.id)
    if not world:
        world = await WorldInstance.create(
            owner=player,
            owner_char_id=owner_char_id,
            visibility_mode="public",
            world_state={"alert_level": 0, "background_version": "v1"},
            revision=1,
        )

    default_map = await MapInstance.get_or_none(world_id=world.id, map_key=DEFAULT_MAP_KEY)
    if not default_map:
        default_map = await MapInstance.create(world=world, map_key=DEFAULT_MAP_KEY, map_state={"version": 1}, revision=1)

    safehouse = await Poi.get_or_none(map_id=default_map.id, poi_key="safehouse")
    market = await Poi.get_or_none(map_id=default_map.id, poi_key="market")
    wild = await Poi.get_or_none(map_id=default_map.id, poi_key="wild")

    if not safehouse:
        safehouse = await Poi.create(
            map=default_map,
            poi_key="safehouse",
            x=120,
            y=220,
            type="safehouse",
            tags=["safe", "core"],
            state={"door_level": 1, "durability": 100},
            visibility_policy="public",
        )
    if not market:
        market = await Poi.create(
            map=default_map,
            poi_key="market",
            x=420,
            y=200,
            type="town",
            tags=["public"],
            state={"shops": 3},
            visibility_policy="public",
        )
    if not wild:
        wild = await Poi.create(
            map=default_map,
            poi_key="wild",
            x=320,
            y=420,
            type="wild",
            tags=["danger"],
            state={"resource_level": 1},
            visibility_policy="default",
        )

    await _ensure_bidirectional_edge(default_map, safehouse, market, edge_type="road", travel_cost=1)
    await _ensure_bidirectional_edge(default_map, market, wild, edge_type="trail", travel_cost=1)
    await _ensure_bidirectional_edge(default_map, safehouse, wild, edge_type="trail", travel_cost=2)

    await ensure_offline_entity_exists(world=world, map_instance=default_map, poi=safehouse, player=player)
    return world, default_map, safehouse


async def ensure_offline_entity_exists(
    *,
    world: WorldInstance,
    map_instance: MapInstance,
    poi: Poi,
    player: PlayerAccount,
) -> EntityState:
    """
    确保该世界存在一个 player_offline 实体（M1: 用于入侵与报告）。
    """
    entity = await EntityState.get_or_none(world_id=world.id, owner_id=player.id, entity_type="player_offline")
    if entity:
        if entity.poi_id != poi.id:
            entity.map = map_instance
            entity.poi = poi
            await entity.save()
        return entity

    return await EntityState.create(
        world=world,
        map=map_instance,
        poi=poi,
        entity_type="player_offline",
        owner=player,
        owner_char_id=world.owner_char_id,
        stats={"hp": 10, "realm": "凡人"},
        ai_memory={"alert": 0, "intel": []},
        state_flags={"state": "idle"},
    )


async def _ensure_bidirectional_edge(
    map_instance: MapInstance,
    a: Poi,
    b: Poi,
    *,
    edge_type: str,
    travel_cost: int,
) -> None:
    await _ensure_edge(map_instance, a, b, edge_type=edge_type, travel_cost=travel_cost, one_way=False)
    await _ensure_edge(map_instance, b, a, edge_type=edge_type, travel_cost=travel_cost, one_way=False)


async def _ensure_edge(
    map_instance: MapInstance,
    from_poi: Poi,
    to_poi: Poi,
    *,
    edge_type: str,
    travel_cost: int,
    one_way: bool,
) -> Edge:
    edge = await Edge.get_or_none(map_id=map_instance.id, from_poi_id=from_poi.id, to_poi_id=to_poi.id)
    if edge:
        return edge
    return await Edge.create(
        map=map_instance,
        from_poi=from_poi,
        to_poi=to_poi,
        edge_type=edge_type,
        travel_cost=travel_cost,
        risk=0,
        requirements=None,
        one_way=one_way,
    )


def can_enter_world(visitor: PlayerAccount, target: WorldInstance, invite_code: str | None) -> Tuple[bool, str]:
    if target.visibility_mode == "public":
        return True, "ok"
    if target.visibility_mode == "hidden":
        if invite_code:
            return True, "ok"
        return False, "该世界不可被公开访问（需要邀请码）。"
    if target.visibility_mode == "locked":
        if invite_code:
            return True, "ok"
        return False, "该世界已上锁（需要邀请码/白名单）。"
    return False, "世界访问策略无效。"


async def try_signin_travel_points(player: PlayerAccount, points_per_day: int = 1) -> Tuple[bool, int]:
    profile = await get_or_create_travel_profile(player)
    today = date.today()
    if profile.last_signin_at == today:
        return False, profile.travel_points

    profile.last_signin_at = today
    profile.travel_points += points_per_day
    await profile.save()
    return True, profile.travel_points


async def consume_travel_points(player: PlayerAccount, cost: int) -> Tuple[bool, int]:
    profile = await get_or_create_travel_profile(player)
    if profile.travel_points < cost:
        return False, profile.travel_points
    profile.travel_points -= cost
    await profile.save()
    return True, profile.travel_points

