from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from server.core import security
from server.crud import crud_user
from server.schemas import schema
from server.api.api_v1 import deps
from server.models import AdminAccount

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = security.ACCESS_TOKEN_EXPIRE_MINUTES

@router.post("/register", response_model=schema.PlayerAccount)
async def register_player(player_in: schema.PlayerAccountCreate):
    """
    修者注册新账号 (道号)
    """
    player = await crud_user.get_player_by_username(user_name=player_in.user_name)
    if player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此道号已被他人占用，请另择佳名。",
        )
    
    # 使用 security 模块中的函数来哈希密码
    hashed_password = security.get_password_hash(player_in.password)
    
    # 将 Pydantic 模型转换为字典，并替换密码
    player_create_data = player_in.model_dump()
    player_create_data["password"] = hashed_password
    
    # 重新创建一个 Pydantic 模型实例用于创建
    player_to_create = schema.PlayerAccountCreate(**player_create_data)

    new_player = await crud_user.create_player(player_data=player_to_create)
    return new_player

@router.post("/token", response_model=schema.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    修者登录，获取访问令牌
    """
    player = await crud_user.authenticate_player(
        user_name=form_data.username, password=form_data.password
    )
    if not player:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="道号或凭证错误，无法通行。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": player.user_name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users", response_model=List[schema.PlayerAccount])
async def get_all_users():
    """
    获取所有用户列表 (管理员使用)
    """
    users = await crud_user.get_all_players()
    return users

@router.get("/users/{user_id}", response_model=schema.PlayerAccount)
async def get_user_by_id(user_id: int):
    """
    根据用户ID获取用户信息
    """
    user = await crud_user.get_player_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user

@router.put("/users/{user_id}", response_model=schema.PlayerAccount)
async def update_user(user_id: int, user_data: schema.PlayerAccountUpdate):
    """
    更新用户信息
    """
    user = await crud_user.get_player_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    updated_user = await crud_user.update_player(user_id, user_data)
    return updated_user

@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """
    删除用户
    """
    user = await crud_user.get_player_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    await crud_user.delete_player(user_id)
    return {"message": "用户删除成功"}

@router.post("/change-password")
async def change_password(
    password_data: schema.PasswordChange,
    current_user: schema.PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    用户修改自己的密码
    """
    # 验证旧密码
    if not security.verify_password(password_data.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="旧密码错误")
    
    # 更新密码
    success = await crud_user.change_password(current_user.id, password_data.new_password)
    if not success:
        raise HTTPException(status_code=500, detail="密码修改失败")
    
    return {"message": "密码修改成功"}

@router.post("/admin/change-user-password")
async def admin_change_user_password(
    user_id: int,
    password_data: schema.AdminPasswordChange,
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """
    管理员修改用户密码
    """
    user = await crud_user.get_player_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    success = await crud_user.change_password(user_id, password_data.new_password)
    if not success:
        raise HTTPException(status_code=500, detail="密码修改失败")
    
    return {"message": f"已成功为用户 {user.user_name} 修改密码"}

@router.post("/admin/login", response_model=schema.Token)
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    管理员登录，获取访问令牌
    """
    admin = await crud_user.authenticate_admin(
        user_name=form_data.username, password=form_data.password
    )
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="仙官道号或凭证错误，无法通行。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": admin.user_name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}