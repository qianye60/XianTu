from fastapi import APIRouter, HTTPException
from typing import List

from server.schemas import schema
from server.crud import crud_world

router = APIRouter()

@router.get("/worlds", response_model=List[schema.World], tags=["世界体系"])
async def list_worlds():
    """
    获取所有已创建的世界列表。
    """
    worlds = await crud_world.get_worlds()
    return worlds

@router.post("/worlds", response_model=schema.World, tags=["世界体系"])
async def create_new_world(world_data: schema.WorldCreate):
    """
    开辟一个新世界。
    """
    new_world, message = await crud_world.create_world(world=world_data)
    if not new_world:
        # 根据 crud 函数返回的消息提供更详细的错误
        raise HTTPException(status_code=500, detail=f"开辟世界失败: {message}")
    return new_world

@router.get("/worlds/{world_id}", response_model=schema.World, tags=["世界体系"])
async def get_world(world_id: int):
    """
    获取指定世界的详细信息。
    """
    world = await crud_world.get_world_by_id(world_id)
    if not world:
        raise HTTPException(status_code=404, detail="世界不存在")
    return world

@router.put("/worlds/{world_id}", response_model=schema.World, tags=["世界体系"])
async def update_world(world_id: int, world_data: schema.WorldUpdate):
    """
    更新世界信息。
    """
    updated_world, message = await crud_world.update_world(world_id, world_data)
    if not updated_world:
        raise HTTPException(status_code=404, detail="世界不存在")
    return updated_world

@router.delete("/worlds/{world_id}", tags=["世界体系"])
async def delete_world(world_id: int):
    """
    删除世界。
    """
    success = await crud_world.delete_world(world_id)
    if not success:
        raise HTTPException(status_code=404, detail="世界不存在")
    return {"message": "世界删除成功"}