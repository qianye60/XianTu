from fastapi import APIRouter

from .endpoints import (
    worlds,
    characters,
    rules,
    auth,
    redemption,
    admin,
    talents,
    spirit_roots,
    origins,
    ai,
    talent_tiers,
    users,
    ban_management,
    system,
    workshop,
    travel,
    online_world,
    invasion,
)

api_router = APIRouter()

# Include each of the endpoint routers
api_router.include_router(system.router, tags=["系统"]) # System endpoints like version
api_router.include_router(travel.router, prefix="/travel", tags=["穿越/联机"])
api_router.include_router(online_world.router, prefix="/worlds/instance", tags=["联机世界"])
api_router.include_router(invasion.router, prefix="/invasion", tags=["入侵报告"])
api_router.include_router(users.router, prefix="/users", tags=["用户体系"])
api_router.include_router(worlds.router, prefix="/worlds", tags=["世界体系"])
api_router.include_router(characters.router, prefix="/characters", tags=["角色/存档体系"])
api_router.include_router(rules.router, prefix="/rules", tags=["核心规则"])
api_router.include_router(auth.router, prefix="/auth", tags=["认证体系"])
api_router.include_router(redemption.router, prefix="/redemption", tags=["兑换码"])
api_router.include_router(admin.router) # admin.py has its own prefix, so no prefix here
api_router.include_router(talents.router, prefix="/talents", tags=["天赋体系"])
api_router.include_router(spirit_roots.router, prefix="/spirit_roots", tags=["灵根体系"])
api_router.include_router(origins.router, prefix="/origins", tags=["出身体系"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI服务"])
api_router.include_router(talent_tiers.router, prefix="/talent_tiers", tags=["天资等级"])
api_router.include_router(ban_management.router, prefix="/ban", tags=["封号管理"])
api_router.include_router(workshop.router, prefix="/workshop", tags=["创意工坊"])
