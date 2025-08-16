import sys
import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            print(f"--- 尝试连接数据库 ({attempt + 1}/{max_retries})... ---")
            await asyncio.wait_for(Tortoise.init(config=TORTOISE_ORM), timeout=30.0)
            await asyncio.wait_for(Tortoise.generate_schemas(), timeout=30.0)
            print("--- 数据库连接成功。---")
            break
        except asyncio.TimeoutError:
            print(f"--- 数据库连接超时 (尝试 {attempt + 1}/{max_retries}) ---")
        except Exception as e:
            print(f"--- 数据库连接失败 (尝试 {attempt + 1}/{max_retries}): {str(e)[:100]} ---")
            
        if attempt == max_retries - 1:
            print("--- 数据库连接失败，服务器将以离线模式启动。 ---")
            yield  # 允许服务器启动，但没有数据库功能
            return
        await asyncio.sleep(1)  # 等待1秒后重试
    
    try:
        print("--- 开始初始化用户账户... ---")
        await crud_user.ensure_admin_account_exists()
        print("--- 开始初始化种子数据... ---")
        await initialize_database()  # 初始化种子数据
        print("--- 世界根基稳固，灵脉畅通---\n\t(后台启动)\t\n=== 大 - 道 - 朝 - 天 ===")
    except Exception as e:
        print(f"--- 种子数据初始化失败: {str(e)[:100]} ---")
        print("--- 服务器将以基础模式运行。 ---")
    
    yield
    
    try:
        await Tortoise.close_connections()
        print("--- 服务器关闭，灵气归于混沌。 ---")
    except Exception as e:
        print(f"--- 数据库连接关闭时出错: {str(e)[:50]} ---")

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

# 挂载静态文件 - 管理后台（检查目录存在）
static_admin_path = os.path.join(os.path.dirname(__file__), "static", "admin")

@app.get("/admin", include_in_schema=False)
async def admin_index():
    return FileResponse(os.path.join(static_admin_path, "index.html"))

if os.path.exists(static_admin_path):
    app.mount("/admin/static", StaticFiles(directory=static_admin_path), name="admin-static")
else:
    print(f"--- 静态文件目录不存在: {static_admin_path} ---")

app.include_router(api_router, prefix="/api/v1")