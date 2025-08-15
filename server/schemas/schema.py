from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
import datetime

# --- 基础模型 ---

class User(BaseModel):
    id: int
    user_name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None

# --- 手动创建 Pydantic 模型以解耦启动依赖 ---

# --- 账户模型 ---

class PlayerAccount(BaseModel):
    id: int
    user_name: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class PlayerAccountCreate(BaseModel):
    user_name: str
    password: str

class PlayerAccountUpdate(BaseModel):
    user_name: Optional[str] = None
    password: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class AdminPasswordChange(BaseModel):
    new_password: str

class AdminAccount(BaseModel):
    id: int
    user_name: str
    role: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

# --- 天资等级模型 ---

class TalentTier(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    total_points: int
    rarity: int
    color: str
    model_config = ConfigDict(from_attributes=True)

# --- 角色创建模型 ---

class CharacterBaseCreate(BaseModel):
    character_name: str
    world_id: int
    talent_tier_id: int
    # 先天六司
    root_bone: int
    spirituality: int
    comprehension: int
    fortune: int
    charm: int
    temperament: int
    # 可选选择
    origin_id: Optional[int] = None
    spirit_root_id: Optional[int] = None
    selected_talent_ids: Optional[List[int]] = None

class CharacterBase(BaseModel):
    id: int
    character_name: str
    world_id: int
    talent_tier_id: int
    root_bone: int
    spirituality: int
    comprehension: int
    fortune: int
    charm: int
    temperament: int
    origin_id: Optional[int] = None
    spirit_root_id: Optional[int] = None
    selected_talents: Optional[List[int]] = None
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

# --- 世界模型 ---

class World(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    era: Optional[str] = None
    core_rules: Optional[Dict[str, Any]] = None
    creator: Optional[AdminAccount] = None
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class WorldCreate(BaseModel):
    name: str
    description: Optional[str] = None
    era: Optional[str] = None
    core_rules: Optional[Dict[str, Any]] = None
    creator_id: int

class WorldUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    era: Optional[str] = None
    core_rules: Optional[Dict[str, Any]] = None

# --- 角色/存档模型 ---

class Character(BaseModel):
    id: int
    character_name: str
    character_data: Dict[str, Any]
    is_active: bool
    player: PlayerAccount
    world: World
    model_config = ConfigDict(from_attributes=True)

class CharacterCreate(BaseModel):
    user_id: int
    world_id: int
    character_name: str
    character_data: Dict[str, Any]

# --- 核心规则模型 ---

class Origin(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    attribute_modifiers: Optional[Dict[str, Any]] = None
    rarity: int = 3
    talent_cost: int = 0
    model_config = ConfigDict(from_attributes=True)

class OriginCreate(BaseModel):
    name: str
    description: Optional[str] = None
    attribute_modifiers: Optional[Dict[str, Any]] = None
    rarity: int = 3
    talent_cost: int = 0

class OriginUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    attribute_modifiers: Optional[Dict[str, Any]] = None
    rarity: Optional[int] = None
    talent_cost: Optional[int] = None

class Talent(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    effects: Optional[Any] = None  # 简化为Any类型
    rarity: int = 2
    talent_cost: int = 1
    model_config = ConfigDict(from_attributes=True)

class TalentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    effects: Optional[Any] = None  # 简化为Any类型
    rarity: int = 2
    talent_cost: int = 1

class TalentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    effects: Optional[Any] = None
    rarity: Optional[int] = None
    talent_cost: Optional[int] = None

class SpiritRoot(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_multiplier: float
    talent_cost: int = 0
    model_config = ConfigDict(from_attributes=True)

class SpiritRootCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_multiplier: float
    talent_cost: int = 0

class SpiritRootUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_multiplier: Optional[float] = None
    talent_cost: Optional[int] = None

# --- 通用修仙元素 ---

class Realm(BaseModel):
    id: int
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    order: int
    model_config = ConfigDict(from_attributes=True)

class RealmCreate(BaseModel):
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    order: int

class CultivationPath(BaseModel):
    id: int
    name: str
    concept: Optional[str] = None
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CultivationPathCreate(BaseModel):
    name: str
    concept: Optional[str] = None
    description: Optional[str] = None

class CultivationArt(BaseModel):
    id: int
    name: str
    function: Optional[str] = None
    level_system: Optional[Dict[str, Any]] = None
    experience_curve: Optional[Dict[str, Any]] = None
    success_formula: Optional[Dict[str, Any]] = None
    resource_cost: Optional[Dict[str, Any]] = None
    recipes: Optional[Dict[str, Any]] = None
    note: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CultivationArtCreate(BaseModel):
    name: str
    function: Optional[str] = None
    level_system: Optional[Dict[str, Any]] = None
    experience_curve: Optional[Dict[str, Any]] = None
    success_formula: Optional[Dict[str, Any]] = None
    resource_cost: Optional[Dict[str, Any]] = None
    recipes: Optional[Dict[str, Any]] = None
    note: Optional[str] = None

class WeaponType(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WeaponTypeCreate(BaseModel):
    name: str
    category: Optional[str] = None

class Profession(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProfessionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Organization(BaseModel):
    id: int
    name: str
    type: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class OrganizationCreate(BaseModel):
    name: str
    type: Optional[str] = None

# --- 兑换码模型 ---

class RedemptionCode(BaseModel):
    id: int
    code: str
    type: str
    payload: Optional[Dict[str, Any]] = None
    max_uses: int
    times_used: int
    expires_at: Optional[datetime.datetime] = None
    is_used: bool
    is_expired: bool
    model_config = ConfigDict(from_attributes=True)

class RedemptionCodeCreate(BaseModel):
    code: str
    type: str
    payload: Optional[Dict[str, Any]] = None
    max_uses: int = 1
    used_by_user_id: Optional[int] = None

class RedemptionCodeAdminCreate(BaseModel):
    type: str
    payload: Dict[str, Any]
    max_uses: int = 1

class CreationDataResponse(BaseModel):
    origins: Optional[List[Dict[str, Any]]] = None
    spirit_roots: Optional[List[Dict[str, Any]]] = None
    talents: Optional[List[Dict[str, Any]]] = None
    world_backgrounds: Optional[List[Dict[str, Any]]] = None