from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError

from server.core import security
from server.crud import crud_user
from server.models import PlayerAccount, AdminAccount
from server.schemas import schema

# 注意这里的 tokenUrl 是完整的 API 路径
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/token"
)

admin_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/admin/token"
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


async def get_current_admin(token: str = Depends(admin_oauth2)) -> AdminAccount:
    """
    获取当前管理员用户（从普通用户token中验证）
    """
    try:
        payload = security.decode_access_token(token)
        token_data = schema.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
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