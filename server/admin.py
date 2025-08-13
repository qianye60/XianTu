import aioredis
from fastapi import FastAPI
from fastapi_admin.app import app as admin_app
from fastapi_admin.providers.login import UsernamePasswordProvider
from fastapi_admin.resources import Model
from fastapi_admin.widgets import displays, inputs
from tortoise.backends.base.client import BaseDBAsyncClient

from server.models import AdminAccount, World, Origin, Talent, SpiritRoot

async def init_admin_app(app: FastAPI, engine: BaseDBAsyncClient) -> None:
    """
    配置 FastAPIAdmin 实例。
    """
    
    # 创建 Redis 连接 (aioredis v1.x API)
    redis = await aioredis.create_redis_pool("redis://localhost")
    
    # 设置登录提供者
    await admin_app.configure(
        logo_url="https://preview.tabler.io/static/logo.svg",
        template_folders=[],
        providers=[
            UsernamePasswordProvider(
                admin_model=AdminAccount
            )
        ],
        redis=redis
    )
    
    @admin_app.register
    class AdminAccountAdmin(Model):
        model = AdminAccount
        label = "天庭仙官"
        icon = "ti ti-users"
        fields = ["id", "user_name", "role", "created_at"]
        displays = [displays.DatetimeDisplay("created_at")]

    @admin_app.register
    class WorldAdmin(Model):
        model = World
        label = "大千世界"
        icon = "ti ti-world"
        fields = ["id", "name", "type", "description", "author", "created_at"]
        inputs = [inputs.TextArea("description")]

    @admin_app.register
    class OriginAdmin(Model):
        model = Origin
        label = "核心·出身"
        icon = "ti ti-baby-carriage"
        fields = ["id", "name", "description", "attribute_modifiers"]

    @admin_app.register
    class TalentAdmin(Model):
        model = Talent
        label = "核心·天赋"
        icon = "ti ti-sparkles"
        fields = ["id", "name", "description", "effects"]

    @admin_app.register
    class SpiritRootAdmin(Model):
        model = SpiritRoot
        label = "核心·灵根"
        icon = "ti ti-plant-2"
        fields = ["id", "name", "description", "base_multiplier"]
        
    app.mount("/admin", admin_app)