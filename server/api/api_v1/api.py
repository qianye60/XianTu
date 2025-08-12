from fastapi import APIRouter

from .endpoints import users, worlds, characters, rules, elements, auth

api_router = APIRouter()

# Include each of the endpoint routers
api_router.include_router(users.router, tags=["用户体系"])
api_router.include_router(worlds.router, tags=["世界体系"])
api_router.include_router(characters.router, tags=["角色/存档体系"])
api_router.include_router(rules.router, tags=["核心规则"])
api_router.include_router(elements.router)
api_router.include_router(auth.router)