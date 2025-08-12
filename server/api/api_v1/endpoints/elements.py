from fastapi import APIRouter, HTTPException
from typing import List
from server.schemas import schema
from server.crud import crud_elements

router = APIRouter()

# --- 境界 (Realms) ---
@router.post("/elements/realms", response_model=schema.Realm, tags=["通用修仙元素"])
def create_new_realm(realm: schema.RealmCreate):
    """
    向藏经阁中录入一条新的境界法理。
    """
    new_realm, message = crud_elements.create_realm(realm)
    if not new_realm:
        raise HTTPException(status_code=500, detail=message)
    return new_realm

@router.get("/elements/realms", response_model=List[schema.Realm], tags=["通用修仙元素"])
def read_realms():
    """
    从藏经阁中查阅所有境界法理。
    """
    realms, message = crud_elements.get_realms()
    if realms is None:
        raise HTTPException(status_code=500, detail=message)
    return realms

# --- 道途 (Cultivation Paths) ---
@router.post("/elements/cultivation-paths", response_model=schema.CultivationPath, tags=["通用修仙元素"])
def create_new_cultivation_path(path_data: schema.CultivationPathCreate):
    """
    向藏经阁中录入一条新的道途法理。
    """
    new_path, message = crud_elements.create_cultivation_path(path_data)
    if not new_path:
        raise HTTPException(status_code=500, detail=message)
    return new_path

@router.get("/elements/cultivation-paths", response_model=List[schema.CultivationPath], tags=["通用修仙元素"])
def read_cultivation_paths():
    """
    从藏经阁中查阅所有道途法理。
    """
    paths, message = crud_elements.get_cultivation_paths()
    if paths is None:
        raise HTTPException(status_code=500, detail=message)
    return paths

# --- 百艺 (Cultivation Arts) ---
@router.post("/elements/cultivation-arts", response_model=schema.CultivationArt, tags=["通用修仙元素"])
def create_new_cultivation_art(art_data: schema.CultivationArtCreate):
    """
    向藏经阁中录入一条新的百艺法理。
    """
    new_art, message = crud_elements.create_cultivation_art(art_data)
    if not new_art:
        raise HTTPException(status_code=500, detail=message)
    return new_art

@router.get("/elements/cultivation-arts", response_model=List[schema.CultivationArt], tags=["通用修仙元素"])
def read_cultivation_arts():
    """
    从藏经阁中查阅所有百艺法理。
    """
    arts, message = crud_elements.get_cultivation_arts()
    if arts is None:
        raise HTTPException(status_code=500, detail=message)
    return arts