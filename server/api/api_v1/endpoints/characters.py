import json
from fastapi import APIRouter, HTTPException
from server.schemas import schema
from server.crud import crud_character

router = APIRouter()

@router.post("/characters", response_model=schema.Character, tags=["角色/存档体系"])
def create_new_character(char_data: schema.CharacterCreate):
    """
    为用户在指定世界中缔造一具化身（创建云存档）。
    """
    character_data_json = json.dumps(char_data.character_data, ensure_ascii=False)
    new_char, message = crud_character.create_character(
        user_id=char_data.user_id,
        world_id=char_data.world_id,
        character_name=char_data.character_name,
        character_data_json=character_data_json
    )
    if new_char is None:
        raise HTTPException(status_code=500, detail=f"缔造仙身失败: {message}")
    return new_char