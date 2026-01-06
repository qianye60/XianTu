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

class PlayerAccountCreateWithEmail(PlayerAccountCreate):
    """使用邮箱验证码注册"""
    email: str
    email_code: str

class PlayerAccountCreateFull(PlayerAccountCreate):
    """完整注册请求（支持多种验证方式）"""
    turnstile_token: Optional[str] = None
    email: Optional[str] = None
    email_code: Optional[str] = None

class SendEmailCodeRequest(BaseModel):
    """发送邮箱验证码请求"""
    email: str
    purpose: str = "register"

class SendEmailCodeResponse(BaseModel):
    """发送邮箱验证码响应"""
    success: bool
    message: str

class SecuritySettingsResponse(BaseModel):
    """安全设置响应（公开接口）"""
    turnstile_enabled: bool
    turnstile_site_key: Optional[str] = None  # 前端需要用来显示验证组件
    email_verification_enabled: bool
    rate_limit_enabled: bool
    rate_limit_max: int
    rate_limit_window: int

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
    # 兼容前端传入“完整对象”（用于扩展/AI提示）与旧版“字符串”
    世界: Any
    天资: Any
    出生: Any
    灵根: Any
    天赋: List[Any]
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
    tier_id: Optional[int] = None
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
    tier_id: Optional[int] = None

class TalentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    effects: Optional[Any] = None
    rarity: Optional[int] = None
    talent_cost: Optional[int] = None
    tier_id: Optional[int] = None

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


# --- 系统安全配置（后台管理用） ---

class TurnstileConfigUpdate(BaseModel):
    """Turnstile 配置更新"""
    turnstile_enabled: Optional[bool] = None
    turnstile_site_key: Optional[str] = None
    turnstile_secret_key: Optional[str] = None
    turnstile_verify_url: Optional[str] = None

class EmailConfigUpdate(BaseModel):
    """邮箱配置更新"""
    email_verification_enabled: Optional[bool] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    email_code_expire_minutes: Optional[int] = None

class RateLimitConfigUpdate(BaseModel):
    """限流配置更新"""
    register_rate_limit_enabled: Optional[bool] = None
    register_rate_limit_max: Optional[int] = None
    register_rate_limit_window: Optional[int] = None

class AllSecurityConfigResponse(BaseModel):
    """所有安全配置响应"""
    # Turnstile
    turnstile_enabled: bool
    turnstile_site_key: Optional[str] = None
    turnstile_secret_key: Optional[str] = None
    turnstile_verify_url: str
    # 邮箱
    email_verification_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # 注意：返回时应该脱敏
    smtp_from_email: Optional[str] = None
    smtp_from_name: str
    email_code_expire_minutes: int
    # 限流
    register_rate_limit_enabled: bool
    register_rate_limit_max: int
    register_rate_limit_window: int


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


# =====================================================================
# 联机穿越（POI 坐标地图）- API Schemas（M1）
# =====================================================================


class TravelSigninResponse(BaseModel):
    travel_points: int
    signed_in: bool
    message: str


class WorldVisibilityUpdate(BaseModel):
    visibility_mode: str  # public|hidden|locked


class OnlineWorldInstanceSummary(BaseModel):
    world_instance_id: int
    owner_player_id: int
    owner_char_id: Optional[str] = None
    visibility_mode: str
    revision: int
    maps: List[Dict[str, Any]] = []


class PoiOut(BaseModel):
    id: int
    poi_key: str
    x: int
    y: int
    type: str
    tags: Optional[Any] = None
    state: Optional[Any] = None


class EdgeOut(BaseModel):
    id: int
    from_poi_id: int
    to_poi_id: int
    edge_type: str
    travel_cost: int
    risk: int
    one_way: bool


class MapGraphResponse(BaseModel):
    map_id: int
    map_key: str
    pois: List[PoiOut]
    edges: List[EdgeOut]
    viewer_poi_id: Optional[int] = None


class TravelStartRequest(BaseModel):
    target_username: str
    invite_code: Optional[str] = None  # 预留：hidden/locked 世界需要


class TravelStartResponse(BaseModel):
    session_id: int
    target_world_instance_id: int
    entry_map_id: int
    entry_poi_id: int
    return_anchor: Dict[str, Any]
    travel_points_left: int


class TravelEndRequest(BaseModel):
    session_id: int


class TravelEndResponse(BaseModel):
    success: bool
    message: str


class WorldActionRequest(BaseModel):
    session_id: Optional[int] = None
    action_type: str  # move (M1)
    intent: Dict[str, Any] = {}


class WorldActionResponse(BaseModel):
    success: bool
    message: str
    new_map_id: Optional[int] = None
    new_poi_id: Optional[int] = None


class InvasionReportOut(BaseModel):
    id: int
    world_instance_id: int
    created_at: datetime.datetime
    unread: bool
    summary: Optional[Any] = None
