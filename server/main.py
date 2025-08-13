import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from tortoise import Tortoise

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from server.api.api_v1.api import api_router
from server.crud import crud_user
from server.database import TORTOISE_ORM
from server.core.seed_all import initialize_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    print("--- 服务器启动，开始连接数据库并检查世界根基... ---")
    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()
    print("--- 数据库连接成功。---")
    
    await crud_user.ensure_admin_account_exists()
    await initialize_database()  # 初始化种子数据
    print("--- 世界根基稳固，灵脉畅通。---")
    
    yield
    
    await Tortoise.close_connections()
    print("--- 服务器关闭，灵气归于混沌。 ---")

# --- 应用与法阵初始化 ---
app = FastAPI(
    title="大道朝天 - 后端灵脉",
    description="为大道朝天项目提供数据支持的核心API。",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """ 根路径，确认服务是否正常运转 """
    return {"message": "大道重塑，灵气归元。版本: 3.0.0"}

# 挂载静态文件 - 管理后台
app.mount("/admin", StaticFiles(directory="server/static/admin", html=True), name="admin")

app.include_router(api_router, prefix="/api/v1")