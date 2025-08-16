from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from server.models import AdminAccount
from server.schemas import schema
from server.crud import crud_user
from server.api.api_v1 import deps
from server.core import security

router = APIRouter(prefix="/admin", tags=["后台管理"])

@router.get("/", summary="测试管理员路由")
async def get_admin_root():
    """确认管理员路由是否成功加载"""
    return {"message": "仙官府邸可达，灵脉畅通。"}

@router.get("/characters", tags=["仙官管理"])
async def get_all_characters_admin(current_admin: AdminAccount = Depends(deps.get_current_admin)):
    """
    管理员获取所有角色列表（在admin路由器中）
    """
    from server.models import CharacterBase
    
    characters = await CharacterBase.filter().prefetch_related('player', 'world')
    
    # 转换为响应格式，添加玩家名称和世界名称
    character_list = []
    for char in characters:
        char_data = {
            "id": char.id,
            "character_name": char.character_name,
            "player_id": char.player_id,
            "player_name": char.player.user_name,
            "world_id": char.world_id,
            "world_name": char.world.name,
            "is_active": char.is_active,
            "is_deleted": char.is_deleted,
            "is_accessible": not char.player.is_banned and not char.is_deleted,
            "last_played": char.last_played,
            "play_time_minutes": char.play_time_minutes,
            "created_at": char.created_at
        }
        character_list.append(char_data)
    
    return character_list

@router.post("/token", response_model=schema.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    **仙官登录**
    
    用道号和凭证换取访问令牌。
    """
    admin = await crud_user.authenticate_admin(
        user_name=form_data.username, password=form_data.password
    )
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="仙官道号或凭证错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": admin.user_name}
    )
    return {"access_token": access_token, "token_type": "bearer"}

# 注意：兑换码管理功能已移至 redemption.py 以避免重复路由
# 用户权限管理通过 AdminAccount 的 `role` 字段进行控制

@router.get("/accounts", response_model=List[schema.AdminAccount])
async def get_all_admin_accounts(
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """获取所有管理员账号"""
    admins = await AdminAccount.all()
    return admins

@router.get("/accounts/{admin_id}", response_model=schema.AdminAccount)
async def get_admin_account(
    admin_id: int,
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """获取指定管理员账号"""
    admin = await AdminAccount.get_or_none(id=admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="仙官不存在")
    return admin

@router.put("/accounts/{admin_id}", response_model=schema.AdminAccount)
async def update_admin_account(
    admin_id: int,
    updates: dict,
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """更新管理员账号"""
    admin = await AdminAccount.get_or_none(id=admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="仙官不存在")
    
    # 如果是修改自己的账号，需要验证当前密码
    if current_admin.id == admin_id:
        if "current_password" in updates:
            from server.core import security
            if not security.verify_password(updates["current_password"], admin.password):
                raise HTTPException(status_code=400, detail="当前密码不正确")
            del updates["current_password"]  # 移除current_password，不保存到数据库
        elif "password" in updates or "user_name" in updates:
            # 如果要修改密码或用户名但没有提供当前密码，拒绝请求
            raise HTTPException(status_code=400, detail="修改密码或用户名时必须提供当前密码")
    
    # 检查新用户名是否已被使用
    if "user_name" in updates and updates["user_name"] != admin.user_name:
        existing = await AdminAccount.filter(user_name=updates["user_name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="此道号已被使用")
    
    # 处理密码哈希
    if "password" in updates and updates["password"]:
        from server.core import security
        updates["password"] = security.get_password_hash(updates["password"])
    elif "password" in updates:
        del updates["password"]
    
    await admin.update_from_dict(updates)
    await admin.save()
    
    return admin

@router.delete("/accounts/{admin_id}")
async def delete_admin_account(
    admin_id: int,
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """删除管理员账号"""
    if current_admin.id == admin_id:
        raise HTTPException(status_code=400, detail="不能删除自己的账号")
    
    admin = await AdminAccount.get_or_none(id=admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="仙官不存在")
    
    await admin.delete()
    return {"message": "仙官已被免职"}

@router.get("/me", response_model=schema.AdminAccount)
async def get_current_admin(
    current_admin: AdminAccount = Depends(deps.get_admin_or_super_admin)
):
    """获取当前登录管理员信息"""
    return current_admin

@router.post("/create", response_model=schema.AdminAccount, summary="创建新的管理员账号")
async def create_admin_account(
    admin_data: schema.AdminAccountCreate,
    current_admin: AdminAccount = Depends(deps.get_super_admin) # 只有超级管理员能创建
):
    """
    **创建新的管理员账号**

    - 只有 **超级管理员** 才能执行此操作。
    - `role` 字段可选值为: `super_admin`, `admin`, `moderator`
    """
    from server.core import security
    
    # 检查用户名是否已存在
    existing = await AdminAccount.filter(user_name=admin_data.user_name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="此道号已被使用")
    
    # 哈希密码
    hashed_password = security.get_password_hash(admin_data.password)
    
    # 使用 Pydantic 模型的数据创建
    admin = await AdminAccount.create(
        user_name=admin_data.user_name,
        password=hashed_password,
        role=admin_data.role,
        email=admin_data.email,
        is_active=admin_data.is_active
    )
    return admin
