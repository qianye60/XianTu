"""灵根相关的API端点"""
from fastapi import APIRouter, HTTPException
from typing import List

from server.schemas import schema
from server.utils.db_retry import db_retry
from server.crud import crud_spirit_roots

router = APIRouter()

@router.post("/", response_model=schema.SpiritRoot, tags=["核心规则"])
async def create_spirit_root_endpoint(spirit_root: schema.SpiritRootCreate):
    """创建新核心灵根"""
    new_spirit_root, message = await crud_spirit_roots.create_spirit_root(spirit_root)
    if not new_spirit_root:
        raise HTTPException(status_code=409, detail=message)
    return new_spirit_root

@router.get("/", response_model=List[schema.SpiritRoot], tags=["核心规则"])
@db_retry(max_retries=3, delay=1.0)
async def get_spirit_roots_endpoint():
    """获取所有核心灵根"""
    return await crud_spirit_roots.get_spirit_roots()

@router.get("/{spirit_root_id}", response_model=schema.SpiritRoot, tags=["核心规则"])
@db_retry(max_retries=3, delay=1.0)
async def get_spirit_root_endpoint(spirit_root_id: int):
    """根据ID获取核心灵根"""
    spirit_root = await crud_spirit_roots.get_spirit_root(spirit_root_id)
    if not spirit_root:
        raise HTTPException(status_code=404, detail="灵根不存在")
    return spirit_root

@router.put("/{spirit_root_id}", response_model=schema.SpiritRoot, tags=["核心规则"])
async def update_spirit_root_endpoint(spirit_root_id: int, spirit_root: schema.SpiritRootUpdate):
    """更新核心灵根"""
    updated_spirit_root, message = await crud_spirit_roots.update_spirit_root(spirit_root_id, spirit_root)
    if not updated_spirit_root:
        status_code = 404 if "未找到" in message else 409
        raise HTTPException(status_code=status_code, detail=message)
    return updated_spirit_root

@router.delete("/{spirit_root_id}", response_model=dict, tags=["核心规则"])
async def delete_spirit_root_endpoint(spirit_root_id: int):
    """删除核心灵根"""
    success = await crud_spirit_roots.delete_spirit_root(spirit_root_id)
    if not success:
        raise HTTPException(status_code=404, detail="灵根不存在或删除失败")
    return {"message": "灵根删除成功"}