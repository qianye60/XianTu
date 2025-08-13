from tortoise import fields
from tortoise.models import Model
from datetime import datetime
# --- 核心账户模型 ---

class PlayerAccount(Model):
    id = fields.IntField(pk=True)
    user_name = fields.CharField(max_length=50, unique=True, description="玩家道号")
    password = fields.CharField(max_length=255, description="哈希后的凭证")
    created_at = fields.DatetimeField(auto_now_add=True, description="创角时间")

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

# --- 核心游戏内容模型 ---

class World(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100, unique=True, description="世界名称")
    description = fields.TextField(null=True, description="世界描述")
    era = fields.CharField(max_length=50, null=True, description="时代背景")
    core_rules = fields.JSONField(null=True, description="核心规则设定")
    creator = fields.ForeignKeyField("models.AdminAccount", related_name="created_worlds", description="创世仙官")
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "worlds"

class Character(Model):
    id = fields.IntField(pk=True)
    character_name = fields.CharField(max_length=100, description="角色姓名")
    character_data = fields.JSONField(description="角色核心数据")
    is_active = fields.BooleanField(default=True)
    player = fields.ForeignKeyField("models.PlayerAccount", related_name="characters")
    world = fields.ForeignKeyField("models.World", related_name="characters_in_world")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "characters"

# --- 核心规则模型 ---

class Origin(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)
    attribute_modifiers = fields.JSONField(null=True)

    class Meta:
        table = "core_origins"

class Talent(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)
    effects = fields.TextField(null=True)

    class Meta:
        table = "core_talents"

class SpiritRoot(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)
    base_multiplier = fields.FloatField()

    class Meta:
        table = "core_spirit_roots"

# --- 通用修仙元素 ---

class Realm(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    title = fields.CharField(max_length=50, null=True)
    milestone = fields.TextField(null=True)
    lifespan = fields.CharField(max_length=50, null=True)
    description = fields.TextField(null=True)
    order = fields.IntField(unique=True)

    class Meta:
        table = "realms"

class CultivationPath(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    concept = fields.TextField(null=True)
    description = fields.TextField(null=True)

    class Meta:
        table = "cultivation_paths"

class CultivationArt(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    function = fields.TextField(null=True)
    ranks = fields.JSONField(null=True)
    products = fields.JSONField(null=True)
    note = fields.TextField(null=True)

    class Meta:
        table = "cultivation_arts"

class WeaponType(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    category = fields.CharField(max_length=50, null=True)

    class Meta:
        table = "weapon_types"

class Profession(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    description = fields.TextField(null=True)

    class Meta:
        table = "professions"

class Organization(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)
    type = fields.CharField(max_length=50, null=True)

    class Meta:
        table = "organizations"

# --- 兑换码 ---
class RedemptionCode(Model):
    id = fields.IntField(pk=True)
    code = fields.CharField(max_length=50, unique=True)
    type = fields.CharField(max_length=50)
    payload = fields.JSONField(null=True)
    max_uses = fields.IntField(default=1)
    times_used = fields.IntField(default=0)
    expires_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    used_by = fields.ForeignKeyField("models.PlayerAccount", related_name="used_codes", null=True)

    @property
    def is_used(self) -> bool:
        """检查信物是否已耗尽次数"""
        if self.max_uses == -1:  # -1 代表无限次
            return False
        return self.times_used >= self.max_uses

    @property
    def is_expired(self) -> bool:
        """检查信物是否已过期"""
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return False

    class Meta:
        table = "redemption_codes"
