"""天赋相关的API端点"""
from fastapi import APIRouter, HTTPException
from typing import List

from server.schemas import schema
from server.crud import crud_rule

router = APIRouter()

@router.post("/", response_model=schema.Talent, tags=["核心规则"])
async def create_talent_endpoint(talent: schema.TalentCreate):
    """创建新核心天赋"""
    return await crud_rule.create_talent(talent)

@router.get("/", response_model=List[schema.Talent], tags=["核心规则"])
async def get_talents_endpoint():
    """获取所有核心天赋"""
    return await crud_rule.get_talents()

@router.get("/{talent_id}", response_model=schema.Talent, tags=["核心规则"])
async def get_talent_endpoint(talent_id: int):
    """根据ID获取核心天赋"""
    talent = await crud_rule.get_talent(talent_id)
    if not talent:
        raise HTTPException(status_code=404, detail="天赋不存在")
    return talent

@router.put("/{talent_id}", response_model=schema.Talent, tags=["核心规则"])
async def update_talent_endpoint(talent_id: int, talent: schema.TalentCreate):
    """更新核心天赋"""
    updated_talent = await crud_rule.update_talent(talent_id, talent)
    if not updated_talent:
        raise HTTPException(status_code=404, detail="天赋不存在或更新失败")
    return updated_talent

@router.delete("/{talent_id}", response_model=dict, tags=["核心规则"])
async def delete_talent_endpoint(talent_id: int):
    """删除核心天赋"""
    success = await crud_rule.delete_talent(talent_id)
    if not success:
        raise HTTPException(status_code=404, detail="天赋不存在或删除失败")
    return {"message": "天赋删除成功"}