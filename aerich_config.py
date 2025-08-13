# 此文件专为 Aerich 所用，以彻底隔绝任何潜在的导入问题。

DB_CONFIG = {
    'host': '38.55.124.252',
    'user': 'qianye',
    'password': '153854qQ',
    'database': 'qianye',
}

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
    "use_tz": False,
    "timezone": "Asia/Shanghai",
}