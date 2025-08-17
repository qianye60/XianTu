from tortoise import fields
from tortoise.models import Model
from datetime import datetime

# --- 核心账户模型 ---

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
    redemption_code_limit = fields.IntField(default=-1, description="可创建兑换码上限 (-1为无限制)")
    created_at = fields.DatetimeField(auto_now_add=True, description="授印时间")

    class Meta:
        table = "admin_accounts"

# --- 游戏内容模型 ---

class World(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100, unique=True, description="世界名称")
    description = fields.TextField(null=True, description="世界描述")
    era = fields.CharField(max_length=50, null=True, description="时代背景")
    core_rules = fields.JSONField(null=True, description="核心规则设定")
    creator = fields.ForeignKeyField("models.AdminAccount", related_name="created_worlds", null=True, on_delete=fields.SET_NULL, description="创世仙官")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "worlds"

# --- 天资等级和先天属性模型 ---

class TalentTier(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50, description="天资等级名称")  # 如：废柴、普通、优秀、天才、妖孽、逆天
    description = fields.TextField(null=True, description="等级描述")
    total_points = fields.IntField(description="总可分配点数")  # 如：60, 70, 80, 90, 100, 120
    rarity = fields.IntField(description="稀有度，数字越小越稀有")
    color = fields.CharField(max_length=20, default="white", description="显示颜色")

    class Meta:
        table = "talent_tiers"

class CharacterBase(Model):
    """角色基础创建信息"""
    id = fields.IntField(pk=True)
    character_name = fields.CharField(max_length=100, description="角色名称")
    player = fields.ForeignKeyField("models.PlayerAccount", related_name="character_bases")
    world = fields.ForeignKeyField("models.World", related_name="character_bases")
    talent_tier = fields.ForeignKeyField("models.TalentTier", related_name="characters")
    
    # 先天六司 - 永恒基础属性
    root_bone = fields.IntField(description="根骨 - 体质根基")  # 决定气血、恢复、寿命
    spirituality = fields.IntField(description="灵性 - 灵气亲和")  # 决定灵气上限、吸收效率
    comprehension = fields.IntField(description="悟性 - 理解天赋")  # 决定神识、学习效率
    fortune = fields.IntField(description="福缘 - 机缘造化")  # 决定奇遇概率、物品品质
    charm = fields.IntField(description="魅力 - 容貌气质")  # 决定好感度、社交加成
    temperament = fields.IntField(description="心性 - 道心坚韧")  # 决定心魔抗性、意志力
    
    # 选择的天赋、灵根、出身
    origin = fields.ForeignKeyField("models.Origin", related_name="characters", null=True)
    spirit_root = fields.ForeignKeyField("models.SpiritRoot", related_name="characters", null=True)
    selected_talents = fields.JSONField(null=True, description="选择的天赋列表")
    
    # 游戏状态管理
    is_active = fields.BooleanField(default=False, description="是否为当前激活角色")
    is_deleted = fields.BooleanField(default=False, description="是否已删除")
    last_played = fields.DatetimeField(null=True, description="最后游戏时间")
    play_time_minutes = fields.IntField(default=0, description="总游戏时间(分钟)")
    
    created_at = fields.DatetimeField(auto_now_add=True)
    
    @property
    def is_accessible(self) -> bool:
        """角色是否可访问（账号未被封且角色未删除）"""
        return not self.player.is_banned and not self.is_deleted
    
    class Meta:
        table = "character_bases"

class CharacterGameState(Model):
    """角色游戏运行时状态"""
    id = fields.IntField(pk=True)
    character = fields.OneToOneField("models.CharacterBase", related_name="game_state", on_delete=fields.CASCADE)
    
    # 修炼状态
    current_realm = fields.ForeignKeyField("models.Realm", related_name="characters_at_realm", null=True)
    cultivation_progress = fields.FloatField(default=0.0, description="当前境界修炼进度 0-100")
    cultivation_experience = fields.BigIntField(default=0, description="总修炼经验")
    
    # 位置和环境
    current_location = fields.CharField(max_length=100, null=True, description="当前位置")
    current_scene = fields.CharField(max_length=100, null=True, description="当前场景")
    
    # 资源和物品
    spiritual_stones = fields.BigIntField(default=100, description="灵石")
    
    # 核心三元属性（气血、灵气、神识）及其上限
    qi_blood = fields.IntField(default=100, description="当前气血值")
    max_qi_blood = fields.IntField(default=100, description="气血上限")
    spiritual_power = fields.IntField(default=100, description="当前灵气值")
    max_spiritual_power = fields.IntField(default=100, description="灵气上限")
    spirit_sense = fields.IntField(default=100, description="当前神识值")
    max_spirit_sense = fields.IntField(default=100, description="神识上限")
    
    # 寿元系统
    current_age = fields.IntField(default=16, description="当前年龄")
    max_lifespan = fields.IntField(default=80, description="寿命上限")
    
    # 恢复速度（基于根骨）
    qi_blood_recovery_rate = fields.FloatField(default=1.0, description="气血恢复速度倍率")
    spiritual_recovery_rate = fields.FloatField(default=1.0, description="灵气恢复速度倍率")
    spirit_recovery_rate = fields.FloatField(default=1.0, description="神识恢复速度倍率")
    
    # 物品背包 (JSON格式存储)
    inventory = fields.JSONField(default=dict, description="背包物品")
    equipped_items = fields.JSONField(default=dict, description="装备物品")
    
    # 技能和功法
    learned_skills = fields.JSONField(default=list, description="已学技能")
    cultivation_methods = fields.JSONField(default=list, description="修炼功法")
    
    # 关系和声望
    reputation = fields.IntField(default=0, description="总声望")
    relationships = fields.JSONField(default=dict, description="人物关系")
    faction_reputation = fields.JSONField(default=dict, description="门派声望")
    
    # 任务和成就
    active_quests = fields.JSONField(default=list, description="进行中任务")
    completed_quests = fields.JSONField(default=list, description="已完成任务")
    achievements = fields.JSONField(default=list, description="成就列表")
    
    # 同步控制
    last_sync_time = fields.DatetimeField(auto_now=True, description="最后同步时间")
    version = fields.IntField(default=1, description="数据版本号")
    is_dirty = fields.BooleanField(default=False, description="是否有未同步数据")
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    class Meta:
        table = "character_game_states"

class PlayerBanRecord(Model):
    """玩家封号记录"""
    id = fields.IntField(pk=True)
    player = fields.ForeignKeyField("models.PlayerAccount", related_name="ban_records")
    admin = fields.ForeignKeyField("models.AdminAccount", related_name="ban_actions", null=True)
    
    ban_type = fields.CharField(max_length=20, description="封号类型: temporary, permanent")
    reason = fields.TextField(description="封号原因")
    ban_start_time = fields.DatetimeField(auto_now_add=True, description="封号开始时间")
    ban_end_time = fields.DatetimeField(null=True, description="封号结束时间(永久封为NULL)")
    is_active = fields.BooleanField(default=True, description="封号是否生效")
    
    # 申诉相关
    appeal_reason = fields.TextField(null=True, description="申诉理由")
    appeal_time = fields.DatetimeField(null=True, description="申诉时间")
    appeal_status = fields.CharField(max_length=20, default="none", description="申诉状态: none, pending, approved, rejected")
    appeal_handler = fields.ForeignKeyField("models.AdminAccount", related_name="handled_appeals", null=True)
    
    class Meta:
        table = "player_ban_records"

class Origin(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50, description="出身名称")
    description = fields.TextField(null=True, description="出身描述")
    
    # 六司属性加成
    root_bone_modifier = fields.IntField(default=0, description="根骨修正")
    spirituality_modifier = fields.IntField(default=0, description="灵性修正") 
    comprehension_modifier = fields.IntField(default=0, description="悟性修正")
    fortune_modifier = fields.IntField(default=0, description="福缘修正")
    charm_modifier = fields.IntField(default=0, description="魅力修正")
    temperament_modifier = fields.IntField(default=0, description="心性修正")
    
    # 特殊效果
    special_effects = fields.JSONField(null=True, description="特殊效果")
    
    rarity = fields.IntField(default=3, description="稀有度")
    talent_cost = fields.IntField(default=0, description="天赋点消耗")

    class Meta:
        table = "core_origins"

class SpiritRoot(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)
    base_multiplier = fields.FloatField()
    talent_cost = fields.IntField(default=0, description="天赋点消耗")

    class Meta:
        table = "core_spirit_roots"

class Talent(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)
    effects = fields.JSONField(null=True)
    rarity = fields.IntField(default=2)
    talent_cost = fields.IntField(default=1, description="天赋点消耗")
    max_uses = fields.IntField(default=1, description="最大使用次数")

    class Meta:
        table = "core_talents"

class Realm(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    title = fields.CharField(max_length=50, null=True)
    description = fields.TextField(null=True)
    order = fields.IntField(unique=True)

    class Meta:
        table = "realms"

class RedemptionCode(Model):
    id = fields.IntField(pk=True)
    code = fields.CharField(max_length=50, unique=True)
    type = fields.CharField(max_length=50)
    payload = fields.JSONField(null=True)
    max_uses = fields.IntField(default=1)
    times_used = fields.IntField(default=0)
    expires_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    creator = fields.ForeignKeyField("models.AdminAccount", related_name="created_codes", null=True, on_delete=fields.SET_NULL, description="创建此码的仙官")
    used_by = fields.ForeignKeyField("models.PlayerAccount", related_name="used_codes", null=True, on_delete=fields.CASCADE)

    @property
    def is_used(self) -> bool:
        """根据使用次数判断是否已用尽"""
        if self.max_uses == -1:  # -1 代表无限次
            return False
        return self.times_used >= self.max_uses

    @property
    def is_expired(self) -> bool:
        """根据过期时间判断是否已过期"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False

    class Meta:
        table = "redemption_codes"

# --- 扩展内容模型 ---

class CultivationArt(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    function = fields.TextField(null=True)
    level_system = fields.JSONField(null=True)
    experience_curve = fields.JSONField(null=True)
    success_formula = fields.JSONField(null=True)
    resource_cost = fields.JSONField(null=True)
    recipes = fields.JSONField(null=True)
    note = fields.TextField(null=True)

    class Meta:
        table = "cultivation_arts"

class CultivationPath(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    concept = fields.TextField(null=True)
    description = fields.TextField(null=True)

    class Meta:
        table = "cultivation_paths"

class Organization(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    type = fields.CharField(max_length=50, null=True)

    class Meta:
        table = "organizations"

class Profession(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)

    class Meta:
        table = "professions"

class WeaponType(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    category = fields.CharField(max_length=50, null=True)

    class Meta:
        table = "weapon_types"