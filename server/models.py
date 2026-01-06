from tortoise import fields
from tortoise.models import Model
from datetime import datetime, date

# --- 核心账户模型 (无大改动) ---

class PlayerAccount(Model):
    id = fields.IntField(pk=True)
    user_name = fields.CharField(max_length=50, unique=True, description="玩家道号")
    password = fields.CharField(max_length=255, description="哈希后的凭证")
    created_at = fields.DatetimeField(auto_now_add=True, description="创角时间")
    is_banned = fields.BooleanField(default=False, description="是否被封禁")

    class Meta:
        table = "player_accounts"

class AdminAccount(Model):
    id = fields.IntField(pk=True)
    user_name = fields.CharField(max_length=50, unique=True, description="仙官道号")
    password = fields.CharField(max_length=255, description="哈希后的凭证")
    role = fields.CharField(max_length=20, default="admin", description="仙官品阶 (admin, super_admin)")
    created_at = fields.DatetimeField(auto_now_add=True, description="授印时间")

    class Meta:
        table = "admin_accounts"

# --- 游戏设定模型 (静态数据) ---

class World(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100, unique=True, description="世界名称")
    description = fields.TextField(null=True, description="世界描述")
    era = fields.CharField(max_length=100, null=True, description="时代背景")
    core_rules = fields.JSONField(null=True, description="核心规则")
    creator = fields.ForeignKeyField("models.AdminAccount", related_name="created_worlds", null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "worlds"

class TalentTier(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50, description="天资等级名称")
    description = fields.TextField(null=True, description="描述")
    total_points = fields.IntField(description="总可分配点数")
    rarity = fields.IntField(description="稀有度，数值越小越稀有")
    color = fields.CharField(max_length=20, default="#FFFFFF", description="代表颜色")
    created_at = fields.DatetimeField(auto_now_add=True, null=True)

    class Meta:
        table = "talent_tiers"
        
class Origin(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50, description="出身名称")
    description = fields.TextField(null=True, description="描述")
    attribute_modifiers = fields.JSONField(null=True, description="属性修正")
    rarity = fields.IntField(default=3, description="稀有度")
    talent_cost = fields.IntField(default=0, description="天赋点花费")
    created_at = fields.DatetimeField(auto_now_add=True, null=True)
    
    class Meta:
        table = "core_origins"

class SpiritRoot(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True, description="描述")
    base_multiplier = fields.FloatField(description="修炼速度基础倍率")
    talent_cost = fields.IntField(default=0, description="天赋点花费")
    created_at = fields.DatetimeField(auto_now_add=True, null=True)

    class Meta:
        table = "core_spirit_roots"

class Talent(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True, description="描述")
    effects = fields.JSONField(null=True, description="具体效果")
    rarity = fields.IntField(default=2, description="稀有度")
    talent_cost = fields.IntField(default=1, description="天赋点花费")
    tier = fields.ForeignKeyField("models.TalentTier", related_name="talents", null=True, description="所属天资等级")
    created_at = fields.DatetimeField(auto_now_add=True, null=True)
    
    class Meta:
        table = "core_talents"

# --- NPC 核心模型 ---
class NpcCharacter(Model):
    id = fields.IntField(pk=True)
    npc_id = fields.CharField(max_length=100, unique=True, description="NPC唯一标识符")
    name = fields.CharField(max_length=100, description="NPC名字")
    
    # 存储NPC的静态基础信息模板
    base_info_template = fields.JSONField(description="角色基础信息模板")
    # 存储NPC的默认存档信息模板
    save_info_template = fields.JSONField(description="角色存档信息模板")
    # 存储NPC的默认AI行为模板
    ai_behavior_template = fields.JSONField(description="AI行为模板")
    
    world = fields.ForeignKeyField("models.World", related_name="npcs", null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "npc_characters"


# --- 玩家角色核心模型 (V3 重构) ---

class CharacterBase(Model):
    """
    角色基础信息 (静态数据)
    这是角色被创建时就已确定的、几乎不会改变的信息。
    """
    id = fields.IntField(pk=True)
    char_id = fields.CharField(max_length=100, unique=True, description="角色唯一ID, e.g., char_1001")
    player = fields.ForeignKeyField("models.PlayerAccount", related_name="characters")
    
    # 角色基础信息的结构化存储
    base_info = fields.JSONField(description="角色基础信息, 对应前端 CharacterBaseInfo")
    
    # 关联的动态存档数据 (一对一)
    game_save = fields.OneToOneField("models.GameSave", related_name="character_base", on_delete=fields.CASCADE)

    is_deleted = fields.BooleanField(default=False, description="是否已删除")
    created_at = fields.DatetimeField(auto_now_add=True)

    @property
    def is_accessible(self) -> bool:
        """角色是否可访问（账号未被封且角色未删除）"""
        return not self.player.is_banned and not self.is_deleted
    
    class Meta:
        table = "character_bases"


class GameSave(Model):
    """
    角色游戏存档 (动态数据)
    这是角色在游戏世界中冒险的实时记录，会频繁发生变化。
    专为联机模式设计，每个角色只有一个存档实例。
    """
    id = fields.IntField(pk=True)
    
    # 存档核心数据，直接映射前端的 SaveSlot 结构
    save_name = fields.CharField(max_length=100, default="云端存档", description="存档名")
    saved_at = fields.DatetimeField(auto_now=True, description="保存时间")
    game_time = fields.CharField(max_length=100, null=True, description="游戏内时间")
    
    world_map = fields.JSONField(null=True, description="世界地图数据")
    save_data = fields.JSONField(null=True, description="核心存档数据 (玩家状态、背包、NPC关系等)")
    
    # 云端同步信息
    last_sync = fields.DatetimeField(auto_now=True, description="最后同步时间")
    version = fields.IntField(default=1, description="数据版本号，用于冲突检测")
    is_dirty = fields.BooleanField(default=False, description="是否有未同步到客户端的数据")

    class Meta:
        table = "game_saves"

# --- 其他辅助模型 (封禁、兑换码等，可按需保留或修改) ---

class PlayerBanRecord(Model):
    id = fields.IntField(pk=True)
    player = fields.ForeignKeyField("models.PlayerAccount", related_name="ban_records")
    admin = fields.ForeignKeyField("models.AdminAccount", related_name="ban_actions", null=True)
    reason = fields.TextField(description="封号原因")
    ban_start_time = fields.DatetimeField(auto_now_add=True)
    ban_end_time = fields.DatetimeField(null=True)
    is_active = fields.BooleanField(default=True)

    class Meta:
        table = "player_ban_records"

class RedemptionCode(Model):
    id = fields.IntField(pk=True)
    code = fields.CharField(max_length=50, unique=True)
    type = fields.CharField(max_length=50, null=True, description="兑换码类型 (world, talent, etc.)")
    payload = fields.JSONField(null=True)
    max_uses = fields.IntField(default=1)
    times_used = fields.IntField(default=0)
    expires_at = fields.DatetimeField(null=True)
    creator = fields.ForeignKeyField("models.AdminAccount", related_name="created_codes", null=True)
    created_at = fields.DatetimeField(auto_now_add=True, null=True)

    class Meta:
        table = "redemption_codes"

class SystemConfig(Model):
   key = fields.CharField(max_length=100, pk=True, description="配置键")
   value = fields.JSONField(description="配置值")

   class Meta:
       table = "system_config"


# --- 创意工坊 ---

class WorkshopItem(Model):
    """
    玩家之间分享的内容载体：
    - settings: 设置备份（dad_game_settings）
    - prompts: 提示词包（promptStorage.exportAll）
    - saves: 存档导出（SavePanel / CharacterManagement 导出格式）
    - start_config: 开局配置（预留）
    """
    id = fields.IntField(pk=True)

    type = fields.CharField(max_length=32, description="内容类型")
    title = fields.CharField(max_length=120, description="标题")
    description = fields.TextField(null=True, description="说明")
    tags = fields.JSONField(null=True, description="标签数组")

    # 核心内容，直接存储导出的 JSON
    payload = fields.JSONField(description="导出的内容")
    game_version = fields.CharField(max_length=32, null=True, description="内容对应的游戏版本")
    data_version = fields.CharField(max_length=32, null=True, description="内容格式版本（预留）")

    author = fields.ForeignKeyField("models.PlayerAccount", related_name="workshop_items", description="作者")

    downloads = fields.IntField(default=0, description="下载次数")
    likes = fields.IntField(default=0, description="点赞数（预留）")

    is_public = fields.BooleanField(default=True, description="是否公开")
    is_deleted = fields.BooleanField(default=False, description="是否删除（软删除）")

    created_at = fields.DatetimeField(auto_now_add=True, description="创建时间")
    updated_at = fields.DatetimeField(auto_now=True, description="更新时间")

    class Meta:
        table = "workshop_items"


# --- 邮箱验证码 ---

class EmailVerificationCode(Model):
    """邮箱验证码"""
    id = fields.IntField(pk=True)
    email = fields.CharField(max_length=255, description="邮箱地址")
    code = fields.CharField(max_length=10, description="验证码")
    purpose = fields.CharField(max_length=32, default="register", description="用途：register/reset_password")
    created_at = fields.DatetimeField(auto_now_add=True, description="创建时间")
    expires_at = fields.DatetimeField(description="过期时间")
    is_used = fields.BooleanField(default=False, description="是否已使用")

    class Meta:
        table = "email_verification_codes"


# --- IP限流记录 ---

class IPRateLimitRecord(Model):
    """IP限流记录"""
    id = fields.IntField(pk=True)
    ip_address = fields.CharField(max_length=64, description="IP地址")
    action = fields.CharField(max_length=32, default="register", description="操作类型")
    created_at = fields.DatetimeField(auto_now_add=True, description="记录时间")

    class Meta:
        table = "ip_rate_limit_records"


# =====================================================================
# 联机穿越（POI 坐标地图）- M1 基础数据模型
# =====================================================================


class PlayerTravelProfile(Model):
    """
    玩家穿越点与签到状态（M1）。
    """

    id = fields.IntField(pk=True)
    player = fields.OneToOneField("models.PlayerAccount", related_name="travel_profile")
    travel_points = fields.IntField(default=0, description="穿越点（TP）")
    last_signin_at = fields.DateField(null=True, description="上次签到日期（UTC）")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "player_travel_profiles"


class WorldInstance(Model):
    """
    联机主世界实例（每个联机角色一个主世界）。
    世界永久改变写入该实例（通过事件日志 + 快照）。
    """

    id = fields.IntField(pk=True)

    owner = fields.ForeignKeyField("models.PlayerAccount", related_name="world_instances")
    owner_char_id = fields.CharField(max_length=128, null=True, description="所属角色 char_id（可选，用于绑定联机角色）")

    visibility_mode = fields.CharField(
        max_length=16,
        default="public",
        description="public|hidden|locked",
    )

    world_state = fields.JSONField(
        null=True,
        description="世界快照（规则/警戒/势力态度/背景版本等）",
    )
    revision = fields.IntField(default=1)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "online_world_instances"
        indexes = (("owner_id",), ("visibility_mode",))


class MapInstance(Model):
    """
    世界内的地图实例（大陆/洞府/秘境等）。
    """

    id = fields.IntField(pk=True)
    world = fields.ForeignKeyField("models.WorldInstance", related_name="maps")
    map_key = fields.CharField(max_length=64, description="mainland/manor/secret_realm/...")
    map_state = fields.JSONField(null=True, description="地图快照（POI/Edge索引、资源参数等）")
    revision = fields.IntField(default=1)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "online_map_instances"
        unique_together = (("world_id", "map_key"),)
        indexes = (("world_id",), ("map_key",))


class Poi(Model):
    """
    POI 点位（坐标化地图核心）。
    """

    id = fields.IntField(pk=True)
    map = fields.ForeignKeyField("models.MapInstance", related_name="pois")

    poi_key = fields.CharField(max_length=64, description="safehouse/market/wild/...")
    x = fields.IntField(default=0)
    y = fields.IntField(default=0)

    type = fields.CharField(max_length=32, default="wild", description="town|manor|resource|portal|...")
    tags = fields.JSONField(null=True, description="标签数组（safe/core/public/hidden/danger/lootable等）")

    visibility_policy = fields.CharField(max_length=16, default="default", description="default|hidden|public")
    state = fields.JSONField(null=True, description="点位状态（资源库存/建筑耐久/门禁/陷阱等）")

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "online_pois"
        unique_together = (("map_id", "poi_key"),)
        indexes = (("map_id",), ("poi_key",), ("type",))


class Edge(Model):
    """
    POI 连接边（路径/传送/暗道等）。
    """

    id = fields.IntField(pk=True)
    map = fields.ForeignKeyField("models.MapInstance", related_name="edges")

    from_poi = fields.ForeignKeyField("models.Poi", related_name="edges_from")
    to_poi = fields.ForeignKeyField("models.Poi", related_name="edges_to")

    edge_type = fields.CharField(max_length=32, default="road", description="road|trail|portal|secret_tunnel")
    travel_cost = fields.IntField(default=1)
    risk = fields.IntField(default=0, description="0-100 风险（预留）")
    requirements = fields.JSONField(null=True, description="进入条件（钥匙/境界/破阵等）")
    one_way = fields.BooleanField(default=False)

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "online_edges"
        indexes = (("map_id",), ("from_poi_id",), ("to_poi_id",), ("edge_type",))


class EntityState(Model):
    """
    世界实体（玩家/NPC/离线玩家）。
    M1 仅实现 POI 级定位与移动。
    """

    id = fields.IntField(pk=True)
    world = fields.ForeignKeyField("models.WorldInstance", related_name="entities")
    map = fields.ForeignKeyField("models.MapInstance", related_name="entities")
    poi = fields.ForeignKeyField("models.Poi", related_name="entities")

    entity_type = fields.CharField(max_length=32, description="player_online|player_offline|npc")
    owner = fields.ForeignKeyField("models.PlayerAccount", related_name="entities", null=True)
    owner_char_id = fields.CharField(max_length=128, null=True)

    stats = fields.JSONField(null=True, description="关键状态（HP/境界/状态效果等）")
    inventory_summary = fields.JSONField(null=True, description="资产摘要（预留）")

    ai_memory = fields.JSONField(null=True, description="权谋记忆/警戒/仇恨（预留）")
    state_flags = fields.JSONField(null=True, description="状态标记（idle/alert/engaged/dead等）")

    is_active = fields.BooleanField(default=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "online_entity_states"
        indexes = (("world_id",), ("map_id", "poi_id"), ("owner_id",), ("entity_type",))


class TravelSession(Model):
    """
    穿越会话（入侵/访问）。
    """

    id = fields.IntField(pk=True)
    visitor = fields.ForeignKeyField("models.PlayerAccount", related_name="travel_sessions")
    target_world = fields.ForeignKeyField("models.WorldInstance", related_name="incoming_sessions")

    visitor_entity = fields.ForeignKeyField("models.EntityState", related_name="as_visitor_session", null=True)

    entry_map = fields.ForeignKeyField("models.MapInstance", related_name="entry_sessions")
    entry_poi = fields.ForeignKeyField("models.Poi", related_name="entry_sessions")

    return_anchor = fields.JSONField(null=True, description="回城锚点（home_world/map/poi）")
    policy = fields.JSONField(null=True, description="权限与规则（可否掠夺/可否破坏等）")

    state = fields.CharField(max_length=16, default="active", description="active|ended|settled")
    started_at = fields.DatetimeField(auto_now_add=True)
    ended_at = fields.DatetimeField(null=True)

    class Meta:
        table = "online_travel_sessions"
        indexes = (("visitor_id",), ("target_world_id",), ("state",))


class WorldEventLog(Model):
    """
    世界事件日志（事实源）。
    """

    id = fields.IntField(pk=True)
    world = fields.ForeignKeyField("models.WorldInstance", related_name="event_logs")
    map = fields.ForeignKeyField("models.MapInstance", related_name="event_logs")
    poi = fields.ForeignKeyField("models.Poi", related_name="event_logs", null=True)

    actor_entity = fields.ForeignKeyField("models.EntityState", related_name="events_as_actor", null=True)
    target_entity = fields.ForeignKeyField("models.EntityState", related_name="events_as_target", null=True)

    event_type = fields.CharField(max_length=32)
    payload = fields.JSONField(null=True)
    server_verdict = fields.JSONField(null=True, description="裁决原因（合理性审查/双境触发等）")

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "online_world_event_logs"
        indexes = (("world_id",), ("map_id",), ("event_type",), ("created_at",))


class InvasionReport(Model):
    """
    入侵报告（上线查看），由服务端基于事件日志生成。
    """

    id = fields.IntField(pk=True)
    world = fields.ForeignKeyField("models.WorldInstance", related_name="invasion_reports")
    victim = fields.ForeignKeyField("models.PlayerAccount", related_name="invasion_reports")
    session = fields.ForeignKeyField("models.TravelSession", related_name="report", null=True)

    summary = fields.JSONField(null=True)
    unread = fields.BooleanField(default=True)

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "online_invasion_reports"
        indexes = (("victim_id", "unread"), ("world_id",))
