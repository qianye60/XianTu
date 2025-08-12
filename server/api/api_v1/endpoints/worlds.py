from fastapi import APIRouter, HTTPException
from server.schemas import schema
from server.crud import crud_world

router = APIRouter()

@router.get("/worlds", response_model=list[schema.World], tags=["世界体系"])
def list_worlds():
    """
    获取所有已创建的世界列表。
    """
    worlds, message = crud_world.get_worlds()
    if worlds is None:
        raise HTTPException(status_code=500, detail=f"获取世界列表失败: {message}")
    return worlds

@router.post("/worlds", response_model=schema.World, tags=["世界体系"])
def create_new_world(world_data: schema.WorldCreate):
    """
    开辟一个新世界。
    """
    new_world, message = crud_world.create_world(
        name=world_data.name,
        world_type=world_data.type,
        description=world_data.description,
        author_id=world_data.author_id
    )
    if new_world is None:
        raise HTTPException(status_code=500, detail=f"开辟世界失败: {message}")
    return new_world