from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from server.core import security
from server.crud import crud_user
from server.schemas import schema
from server.api.api_v1 import deps
from server.models import PlayerAccount

router = APIRouter()

@router.get("/test_no_deps", tags=["测试"])
async def test_no_dependencies():
    """
    测试没有依赖项的端点
    """
    return {"message": "在auth router中，没有依赖项", "status": "ok"}

@router.post("/token", response_model=schema.Token)
async def login_for_access_token(request: Request, login_data: schema.LoginRequest):
    """
    **修者登录**
    
    用道号和凭证换取访问令牌。
    """
    player = await crud_user.authenticate_player(
        user_name=login_data.username, password=login_data.password
    )
    if not player:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="道号或凭证错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": player.user_name}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schema.PlayerAccount)
async def register_player(request: Request, player_in: schema.PlayerAccountCreateWithTurnstile):
    """
    **接引新修者**
    
    创建新的修者账号。
    """
    player_create_data = schema.PlayerAccountCreate(
        user_name=player_in.user_name,
        password=player_in.password
    )
    
    new_player, message = await crud_user.create_player(player_data=player_create_data)
    if not new_player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    return new_player

@router.get("/me", response_model=schema.PlayerAccount)
async def read_current_user(
    current_user: PlayerAccount = Depends(deps.get_current_user),
):
    """
    **获取当前修者信息**
    
    需要有效的访问令牌。
    """
    return current_user
