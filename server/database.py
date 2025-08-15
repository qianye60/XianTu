# --- 灵脉参数 (数据库配置) ---
import os
from typing import AsyncGenerator
from tortoise.backends.base.client import BaseDBAsyncClient
from tortoise import Tortoise

async def get_db() -> AsyncGenerator[BaseDBAsyncClient, None]:
    """获取数据库连接"""
    try:
        conn = Tortoise.get_connection("default")
        yield conn
    finally:
        pass  # Connection will be automatically managed by Tortoise ORM

# 环境变量配置，默认使用远程数据库
USE_LOCAL_DB = os.getenv('USE_LOCAL_DB', 'false').lower() == 'true'

if USE_LOCAL_DB:
    # 本地数据库配置
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': 'password',  # 请修改为您的本地MySQL密码
        'database': 'qianye',
    }
    print("--- 使用本地数据库配置 ---")
else:
    # 远程数据库配置
    DB_CONFIG = {
        'host': '38.55.124.252',
        'user': 'qianye',
        'password': '153854qQ',
        'database': 'qianye',
    }
    print("--- 使用远程数据库配置 ---")

# --- Tortoise ORM 配置 (唯一真实来源) ---
# 从此，整个应用都应使用此配置来与数据库交互。
db_url = (
    f"mysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:3306/{DB_CONFIG['database']}"
    f"?charset=utf8mb4&autocommit=true"
)

TORTOISE_ORM = {
    "connections": {
        "default": {
            "engine": "tortoise.backends.mysql",
            "credentials": {
                "host": DB_CONFIG['host'],
                "port": 3306,
                "user": DB_CONFIG['user'],
                "password": DB_CONFIG['password'],
                "database": DB_CONFIG['database'],
                "charset": "utf8mb4",
                "autocommit": True,
                "sql_mode": "TRADITIONAL",
                "connect_timeout": 120,
                "echo": False,
            }
        }
    },
    "apps": {
        "models": {
            "models": ["server.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}

# 陈旧的、基于 pymysql 的 create_all_new_tables 和 get_db_connection 函数已被彻底废弃。
# 数据库的结构将完全由 Tortoise ORM 和 Aerich 管理。