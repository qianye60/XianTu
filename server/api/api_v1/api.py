from fastapi import APIRouter

from .endpoints import worlds, characters, rules, elements, auth, redemption, admin, talents, spirit_roots, origins, ai

api_router = APIRouter()

# Include each of the endpoint routers
# api_router.include_router(users.router, tags=["用户体系"]) # 已废弃，由 auth 替代
api_router.include_router(worlds.router, tags=["世界体系"])
api_router.include_router(characters.router, tags=["角色/存档体系"])
api_router.include_router(rules.router, tags=["核心规则"])
api_router.include_router(elements.router)
api_router.include_router(auth.router)
api_router.include_router(redemption.router)
api_router.include_router(admin.router)
api_router.include_router(talents.router, prefix="/talents", tags=["天赋体系"])
api_router.include_router(spirit_roots.router, prefix="/spirit_roots", tags=["灵根体系"])
api_router.include_router(origins.router, prefix="/origins", tags=["出身体系"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI服务"])
