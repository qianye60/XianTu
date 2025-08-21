"""天赋相关的API端点"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from server.schemas import schema
from server.utils.db_retry import db_retry
from server.crud import crud_talents
from server.api.api_v1 import deps
from server.models import AdminAccount

router = APIRouter()

@router.post("/", response_model=schema.Talent, tags=["核心规则"])
async def create_talent_endpoint(
    talent: schema.TalentCreate,
    current_admin: AdminAccount = Depends(deps.get_super_admin_user)
):
    """创建新核心天赋（仅超级管理员）"""
    new_talent, message = await crud_talents.create_talent(talent)
    if not new_talent:
        raise HTTPException(status_code=409, detail=message)
    return new_talent

@router.get("/", response_model=List[schema.Talent], tags=["核心规则"])
@db_retry(max_retries=3, delay=1.0)
async def get_talents_endpoint():
    """获取所有核心天赋"""
    return await crud_talents.get_talents()

@router.get("/{talent_id}", response_model=schema.Talent, tags=["核心规则"])
@db_retry(max_retries=3, delay=1.0)
async def get_talent_endpoint(talent_id: int):
    """根据ID获取核心天赋"""
    talent = await crud_talents.get_talent(talent_id)
    if not talent:
        raise HTTPException(status_code=404, detail="天赋不存在")
    return talent

@router.put("/{talent_id}", response_model=schema.Talent, tags=["核心规则"])
async def update_talent_endpoint(
    talent_id: int,
    talent_data: schema.TalentUpdate,
    current_admin: AdminAccount = Depends(deps.get_super_admin_user)
):
    """更新核心天赋（仅超级管理员）"""
    updated_talent, message = await crud_talents.update_talent(talent_id, talent_data)
    if not updated_talent:
        status_code = 404 if "未找到" in message else 409
        raise HTTPException(status_code=status_code, detail=message)
    return updated_talent

@router.delete("/{talent_id}", response_model=dict, tags=["核心规则"])
async def delete_talent_endpoint(
    talent_id: int,
    current_admin: AdminAccount = Depends(deps.get_super_admin_user)
):
    """删除核心天赋（仅超级管理员）"""
    success = await crud_talents.delete_talent(talent_id)
    if not success:
        raise HTTPException(status_code=404, detail="天赋不存在或删除失败")
    return {"message": "天赋删除成功"}