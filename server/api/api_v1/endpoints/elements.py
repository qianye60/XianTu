from fastapi import APIRouter, HTTPException
from typing import List

from server.schemas import schema
from server.crud import crud_elements

router = APIRouter()

# --- 境界 (Realms) ---
@router.post("/elements/realms", response_model=schema.Realm, tags=["通用修仙元素"])
async def create_new_realm(realm: schema.RealmCreate):
    """
    向藏经阁中录入一条新的境界法理。
    """
    new_realm, message = await crud_elements.create_realm(realm)
    if not new_realm:
        raise HTTPException(status_code=500, detail=message)
    return new_realm

@router.get("/elements/realms", response_model=List[schema.Realm], tags=["通用修仙元素"])
async def read_realms():
    """
    从藏经阁中查阅所有境界法理。
    """
    return await crud_elements.get_realms()

# --- 道途 (Cultivation Paths) ---
@router.post("/elements/cultivation-paths", response_model=schema.CultivationPath, tags=["通用修仙元素"])
async def create_new_cultivation_path(path_data: schema.CultivationPathCreate):
    """
    向藏经阁中录入一条新的道途法理。
    """
    new_path, message = await crud_elements.create_cultivation_path(path_data)
    if not new_path:
        raise HTTPException(status_code=500, detail=message)
    return new_path

@router.get("/elements/cultivation-paths", response_model=List[schema.CultivationPath], tags=["通用修仙元素"])
async def read_cultivation_paths():
    """
    从藏经阁中查阅所有道途法理。
    """
    return await crud_elements.get_cultivation_paths()

# --- 百艺 (Cultivation Arts) ---
@router.post("/elements/cultivation-arts", response_model=schema.CultivationArt, tags=["通用修仙元素"])
async def create_new_cultivation_art(art_data: schema.CultivationArtCreate):
    """
    向藏经阁中录入一条新的百艺法理。
    """
    new_art, message = await crud_elements.create_cultivation_art(art_data)
    if not new_art:
        raise HTTPException(status_code=500, detail=message)
    return new_art

@router.get("/elements/cultivation-arts", response_model=List[schema.CultivationArt], tags=["通用修仙元素"])
async def read_cultivation_arts():
    """
    从藏经阁中查阅所有百艺法理。
    """
    return await crud_elements.get_cultivation_arts()

# --- 武器法门 (Weapon Types) ---
@router.post("/elements/weapon-types", response_model=schema.WeaponType, tags=["通用修仙元素"])
async def create_new_weapon_type(weapon_type: schema.WeaponTypeCreate):
    new_item, msg = await crud_elements.create_weapon_type(weapon_type)
    if not new_item: raise HTTPException(500, msg)
    return new_item

@router.get("/elements/weapon-types", response_model=List[schema.WeaponType], tags=["通用修仙元素"])
async def read_weapon_types():
    return await crud_elements.get_weapon_types()

# --- 修仙职业 (Professions) ---
@router.post("/elements/professions", response_model=schema.Profession, tags=["通用修仙元素"])
async def create_new_profession(profession: schema.ProfessionCreate):
    new_item, msg = await crud_elements.create_profession(profession)
    if not new_item: raise HTTPException(500, msg)
    return new_item

@router.get("/elements/professions", response_model=List[schema.Profession], tags=["通用修仙元素"])
async def read_professions():
    return await crud_elements.get_professions()

# --- 组织机构 (Organizations) ---
@router.post("/elements/organizations", response_model=schema.Organization, tags=["通用修仙元素"])
async def create_new_organization(organization: schema.OrganizationCreate):
    new_item, msg = await crud_elements.create_organization(organization)
    if not new_item: raise HTTPException(500, msg)
    return new_item

@router.get("/elements/organizations", response_model=List[schema.Organization], tags=["通用修仙元素"])
async def read_organizations():
    return await crud_elements.get_organizations()