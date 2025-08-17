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
    turnstile_token: str

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

class PlayerAccountCreateWithTurnstile(PlayerAccountCreate):
    turnstile_token: str

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
    player_id: Optional[int] = None  # 管理员创建时需要，普通用户创建时自动设置
    world_id: int
    talent_tier_id: int
    birth_age: int = 16  # 出生年龄，默认16岁
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
    # 新增游戏状态字段
    is_active: bool = False
    is_deleted: bool = False
    last_played: Optional[datetime.datetime] = None
    play_time_minutes: int = 0
    is_accessible: bool = True  # 计算属性，在API中动态设置
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class CharacterWithState(CharacterBase):
    """用于角色列表的完整角色信息模型"""
    # 来自 CharacterGameState 的字段
    realm: Optional[str] = "凡人"
    reputation: int = 0
    qi_blood: int
    max_qi_blood: int
    spiritual_power: int
    max_spiritual_power: int
    spirit_sense: int
    max_spirit_sense: int
    max_lifespan: int

class CharacterGameState(BaseModel):
    id: int
    character_id: int
    current_realm_id: Optional[int] = None
    cultivation_progress: float = 0.0
    cultivation_experience: int = 0
    current_location: Optional[str] = None
    current_scene: Optional[str] = None
    spiritual_stones: int = 100
    qi_blood: int = 100
    max_qi_blood: int = 100
    spiritual_power: int = 100
    max_spiritual_power: int = 100
    spirit_sense: int = 100
    max_spirit_sense: int = 100
    current_age: int = 16
    max_lifespan: int = 80
    inventory: Dict[str, Any] = {}
    equipped_items: Dict[str, Any] = {}
    learned_skills: List[str] = []
    cultivation_methods: List[str] = []
    relationships: Dict[str, Any] = {}
    faction_reputation: Dict[str, Any] = {}
    active_quests: List[Dict[str, Any]] = []
    completed_quests: List[Dict[str, Any]] = []
    achievements: List[str] = []
    last_sync_time: datetime.datetime
    version: int = 1
    is_dirty: bool = False
    model_config = ConfigDict(from_attributes=True)

class CharacterGameStateUpdate(BaseModel):
    cultivation_progress: Optional[float] = None
    cultivation_experience: Optional[int] = None
    current_location: Optional[str] = None
    current_scene: Optional[str] = None
    spiritual_stones: Optional[int] = None
    qi_blood: Optional[int] = None
    max_qi_blood: Optional[int] = None
    spiritual_power: Optional[int] = None
    max_spiritual_power: Optional[int] = None
    spirit_sense: Optional[int] = None
    max_spirit_sense: Optional[int] = None
    current_age: Optional[int] = None
    max_lifespan: Optional[int] = None
    inventory: Optional[Dict[str, Any]] = None
    equipped_items: Optional[Dict[str, Any]] = None
    learned_skills: Optional[List[str]] = None
    cultivation_methods: Optional[List[str]] = None
    relationships: Optional[Dict[str, Any]] = None
    faction_reputation: Optional[Dict[str, Any]] = None
    active_quests: Optional[List[Dict[str, Any]]] = None
    completed_quests: Optional[List[Dict[str, Any]]] = None
    achievements: Optional[List[str]] = None

class PlayerBanRecord(BaseModel):
    id: int
    player_id: int
    admin_id: Optional[int] = None
    ban_type: str
    reason: str
    ban_start_time: datetime.datetime
    ban_end_time: Optional[datetime.datetime] = None
    is_active: bool = True
    appeal_reason: Optional[str] = None
    appeal_time: Optional[datetime.datetime] = None
    appeal_status: str = "none"
    appeal_handler_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class PlayerBanCreate(BaseModel):
    player_id: int
    ban_type: str  # "temporary" or "permanent"
    reason: str
    ban_end_time: Optional[datetime.datetime] = None  # 临时封号需要设置结束时间

class AppealCreate(BaseModel):
    ban_record_id: int
    appeal_reason: str

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
    created_at: datetime.datetime
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