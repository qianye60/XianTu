from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
import datetime

# --- 基础模型 ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    turnstile_token: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None

# --- 账户模型 ---

class PlayerAccount(BaseModel):
    id: int
    user_name: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class PlayerAccountCreate(BaseModel):
    user_name: str
    password: str

class PlayerAccountCreateWithTurnstile(PlayerAccountCreate):
    turnstile_token: Optional[str] = None

class PlayerAccountUpdate(BaseModel):
    user_name: Optional[str] = None
    password: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class AdminPasswordChange(BaseModel):
    new_password: str

class AdminAccountBase(BaseModel):
    user_name: str
    email: Optional[str] = None
    role: str = "admin"
    is_active: bool = True

class AdminAccountCreate(AdminAccountBase):
    password: str

class AdminAccount(AdminAccountBase):
    id: int
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

# --- V3 角色与存档 Schema ---

class InnateAttributes(BaseModel):
    根骨: int
    灵性: int
    悟性: int
    气运: int
    魅力: int
    心性: int

class CharacterBaseInfo(BaseModel):
    名字: str
    世界: str
    天资: str
    出生: str
    灵根: str
    天赋: List[str]
    先天六司: InnateAttributes

class CharacterCreateV3(BaseModel):
    char_id: str
    base_info: CharacterBaseInfo
    player_id: Optional[int] = None

class SaveDataUpdate(BaseModel):
    save_data: Optional[Dict[str, Any]] = None
    world_map: Optional[Dict[str, Any]] = None
    game_time: Optional[str] = None

class GameSave(BaseModel):
    id: int
    save_name: str
    saved_at: datetime.datetime
    game_time: Optional[str] = None
    world_map: Optional[Dict[str, Any]] = None
    save_data: Optional[Dict[str, Any]] = None
    last_sync: datetime.datetime
    version: int
    is_dirty: bool
    model_config = ConfigDict(from_attributes=True)

class CharacterBase(BaseModel):
    id: int
    char_id: str
    base_info: Dict[str, Any]
    created_at: datetime.datetime
    is_deleted: bool
    model_config = ConfigDict(from_attributes=True)

class CharacterProfileResponse(BaseModel):
    id: int
    char_id: str
    player_id: int
    base_info: CharacterBaseInfo
    game_save: GameSave
    created_at: datetime.datetime
    is_deleted: bool

# --- 静态游戏数据模型 (正确顺序) ---

class TalentTier(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    total_points: int
    rarity: int
    color: str
    model_config = ConfigDict(from_attributes=True)

class Talent(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    effects: Optional[Any] = None
    rarity: int = 2
    talent_cost: int = 1
    tier: Optional[TalentTier] = None
    model_config = ConfigDict(from_attributes=True)

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

class TalentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    effects: Optional[Any] = None
    rarity: int = 2
    talent_cost: int = 1

class TalentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    effects: Optional[Any] = None
    rarity: Optional[int] = None
    talent_cost: Optional[int] = None

class CreationDataResponse(BaseModel):
    origins: Optional[List[Dict[str, Any]]] = None
    spirit_roots: Optional[List[Dict[str, Any]]] = None
    talents: Optional[List[Dict[str, Any]]] = None
    world_backgrounds: Optional[List[Dict[str, Any]]] = None

# --- 其他辅助模型 ---

class PlayerBanRecord(BaseModel):
    id: int
    player_id: int
    admin_id: Optional[int] = None
    reason: str
    ban_start_time: datetime.datetime
    ban_end_time: Optional[datetime.datetime] = None
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)

class PlayerBanCreate(BaseModel):
    player_id: int
    reason: str
    ban_end_time: Optional[datetime.datetime] = None

class AppealCreate(BaseModel):
    ban_record_id: int
    appeal_reason: str

class RedemptionCode(BaseModel):
    id: int
    code: str
    type: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    max_uses: int
    times_used: int
    expires_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
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

# --- 系统配置 ---

class SystemConfigBase(BaseModel):
   key: str
   value: Any

class SystemConfigCreate(SystemConfigBase):
   pass

class SystemConfigUpdate(BaseModel):
   value: Any

class SystemConfig(SystemConfigBase):
   model_config = ConfigDict(from_attributes=True)


# --- 创意工坊 ---

class WorkshopItemBase(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    tags: List[str] = []
    game_version: Optional[str] = None
    data_version: Optional[str] = None


class WorkshopItemCreate(WorkshopItemBase):
    payload: Any


class WorkshopItemOut(WorkshopItemBase):
    id: int
    author_id: int
    author_name: str
    downloads: int
    likes: int
    is_public: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime


class WorkshopItemsResponse(BaseModel):
    items: List[WorkshopItemOut]
    total: int
    page: int
    page_size: int


class WorkshopItemDownloadResponse(BaseModel):
    item: WorkshopItemOut
    payload: Any
