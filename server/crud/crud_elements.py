from typing import List, Optional, Tuple, Any

from server.models import (
    Realm, CultivationPath, CultivationArt, WeaponType, Profession, Organization
)
from server.schemas import schema

# ========= 境界 (Realms) =========

async def create_realm(realm: schema.RealmCreate) -> Tuple[Optional[Realm], str]:
    """向藏经阁中录入一条新的境界法理。"""
    try:
        new_realm = await Realm.create(**realm.model_dump())
        return new_realm, "境界法理录入成功"
    except Exception as e:
        return None, f"录入境界法理失败: {e}"

async def get_realms() -> List[Realm]:
    """从藏经阁中查阅所有境界法理。"""
    return await Realm.all().order_by("order")

# ========= 道途 (Cultivation Paths) =========

async def create_cultivation_path(path_data: schema.CultivationPathCreate) -> Tuple[Optional[CultivationPath], str]:
    """向藏经阁中录入一条新的道途法理。"""
    try:
        new_path = await CultivationPath.create(**path_data.model_dump())
        return new_path, "道途法理录入成功"
    except Exception as e:
        return None, f"录入道途法理失败: {e}"

async def get_cultivation_paths() -> List[CultivationPath]:
    """从藏经阁中查阅所有道途法理。"""
    return await CultivationPath.all()

# ========= 百艺 (Cultivation Arts) =========

async def create_cultivation_art(art_data: schema.CultivationArtCreate) -> Tuple[Optional[CultivationArt], str]:
    """向藏经阁中录入一条新的百艺法理。"""
    try:
        new_art = await CultivationArt.create(**art_data.model_dump())
        return new_art, "百艺法理录入成功"
    except Exception as e:
        return None, f"录入百艺法理失败: {e}"

async def get_cultivation_arts() -> List[CultivationArt]:
    """从藏经阁中查阅所有百艺法理。"""
    return await CultivationArt.all()

# ========= 武器法门 (Weapon Types) =========

async def create_weapon_type(weapon_type: schema.WeaponTypeCreate) -> Tuple[Optional[WeaponType], str]:
    """向藏经阁中录入一种新的武器法门。"""
    try:
        new_weapon_type = await WeaponType.create(**weapon_type.model_dump())
        return new_weapon_type, "武器法门录入成功"
    except Exception as e:
        return None, f"录入武器法门失败: {e}"

async def get_weapon_types() -> List[WeaponType]:
    """从藏经阁中查阅所有武器法门。"""
    return await WeaponType.all()

# ========= 修仙职业 (Professions) =========

async def create_profession(profession: schema.ProfessionCreate) -> Tuple[Optional[Profession], str]:
    """向藏经阁中录入一种新的修仙职业。"""
    try:
        new_profession = await Profession.create(**profession.model_dump())
        return new_profession, "修仙职业录入成功"
    except Exception as e:
        return None, f"录入修仙职业失败: {e}"

async def get_professions() -> List[Profession]:
    """从藏经阁中查阅所有修仙职业。"""
    return await Profession.all()

# ========= 组织机构 (Organizations) =========

async def create_organization(organization: schema.OrganizationCreate) -> Tuple[Optional[Organization], str]:
    """向藏经阁中录入一个新的组织机构。"""
    try:
        new_org = await Organization.create(**organization.model_dump())
        return new_org, "组织机构录入成功"
    except Exception as e:
        return None, f"录入组织机构失败: {e}"

async def get_organizations() -> List[Organization]:
    """从藏经阁中查阅所有组织机构。"""
    return await Organization.all()
