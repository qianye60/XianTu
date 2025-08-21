import logging
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from typing import Optional

from server.core import security
from server.crud import crud_user
from server.models import PlayerAccount, AdminAccount
from server.schemas import schema

# --- 强制认证实例 ---
# 注意这里的 tokenUrl 是完整的 API 路径
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token"
)

admin_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/admin/token"
)

# --- 可选认证实例 ---
# auto_error=False 是关键，当token不存在时，依赖会返回None而不是抛出异常
reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    auto_error=False
)

admin_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/admin/token",
    auto_error=False
)


async def get_current_user(token: str = Depends(reusable_oauth2)) -> PlayerAccount:
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="凭证无法验证，请重新登录。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await crud_user.get_player_by_username(user_name=token_data.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到此修者。")
    return user


def get_current_active_user(current_user: PlayerAccount = Depends(get_current_user)) -> PlayerAccount:
    # 在这里可以添加检查用户是否被禁用的逻辑
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_direct(authorization: Optional[str] = Header(None)) -> AdminAccount:
    """
    直接从Authorization头部验证管理员（绕过OAuth2PasswordBearer的混乱）
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要管理员授权"
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="仙官凭证无法验证，请重新登录。"
        )
    
    admin = await crud_user.get_admin_by_username(user_name=token_data.sub)
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到此仙官。")
    return admin

async def get_current_admin(token: str = Depends(admin_oauth2)) -> AdminAccount:
    """
    获取当前管理员用户（从管理员token中验证）
    """
    logging.debug(f"接收到管理员Token: {token[:30]}...") # 打印部分token用于调试
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        logging.error(f"管理员Token验证失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="仙官凭证无法验证，请重新登录。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    admin = await crud_user.get_admin_by_username(user_name=token_data.sub)
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到此仙官。")
    return admin


def get_current_active_admin_user(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    获取当前活跃的管理员用户
    """
    return current_admin


def get_super_admin_user(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    仅允许超级管理员访问
    """
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此操作需要超级管理员权柄。"
        )
    return current_admin


def get_admin_or_super_admin(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    允许管理员或超级管理员访问
    """
    if current_admin.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此操作需要管理员或超级管理员权柄。"
        )
    return current_admin

def get_super_admin(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    仅允许超级管理员访问
    """
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此操作需要超级管理员权柄。"
        )
    return current_admin


async def get_current_active_user_optional(token: Optional[str] = Depends(reusable_oauth2_optional)) -> Optional[PlayerAccount]:
    """
    获取当前活跃用户，如果token无效或不存在则返回None
    """
    if not token:
        return None
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
        user = await crud_user.get_player_by_username(user_name=token_data.sub)
        return user
    except (jwt.JWTError, ValidationError):
        return None

async def get_current_super_admin_optional(token: Optional[str] = Depends(admin_oauth2_optional)) -> Optional[AdminAccount]:
    """
    获取当前超级管理员，如果token无效、不存在或权限不足则返回None
    """
    if not token:
        return None
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
        admin = await crud_user.get_admin_by_username(user_name=token_data.sub)
        if admin and admin.role == "super_admin":
            return admin
        return None
    except (jwt.JWTError, ValidationError):
        return None