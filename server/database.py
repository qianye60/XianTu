"""
数据库配置（Tortoise ORM）

开源仓库不应包含任何真实数据库地址/口令。
请通过环境变量配置数据库连接：

- `DDCT_DB_URL`：完整连接串（推荐）
  - SQLite（默认）：`sqlite://db.sqlite3`
  - MySQL 示例：`mysql://user:password@127.0.0.1:3306/ddct?charset=utf8mb4`
"""

import os
from typing import AsyncGenerator

from tortoise import Tortoise
from tortoise.backends.base.client import BaseDBAsyncClient


def get_db_url() -> str:
    return os.getenv("DDCT_DB_URL", "sqlite://db.sqlite3")


db_url = get_db_url()


async def get_db() -> AsyncGenerator[BaseDBAsyncClient, None]:
    """获取数据库连接"""
    try:
        conn = Tortoise.get_connection("default")
        yield conn
    finally:
        pass  # Connection will be automatically managed by Tortoise ORM

TORTOISE_ORM = {
    "connections": {
        "default": db_url,
    },
    "apps": {
        "models": {
            "models": ["server.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}

# 数据库结构由 Tortoise ORM / Aerich 管理。
