# --- 灵脉参数 (数据库配置) ---
DB_CONFIG = {
    'host': '38.55.124.252',
    'user': 'qianye',
    'password': '153854qQ',
    'database': 'qianye',
}

# --- Tortoise ORM 配置 (唯一真实来源) ---
# 从此，整个应用都应使用此配置来与数据库交互。
db_url = (
    f"mysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:3306/{DB_CONFIG['database']}"
)

TORTOISE_ORM = {
    "connections": {"default": db_url},
    "apps": {
        "models": {
            "models": ["server.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}

# 陈旧的、基于 pymysql 的 create_all_new_tables 和 get_db_connection 函数已被彻底废弃。
# 数据库的结构将完全由 Tortoise ORM 和 Aerich 管理。