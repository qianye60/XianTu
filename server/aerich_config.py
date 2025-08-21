import os

# This configuration is a bridge for Aerich to find the database settings.
# It mirrors the logic from `server/database.py` to ensure consistency.

# Environment variable to decide which database to use
USE_LOCAL_DB = os.getenv('USE_LOCAL_DB', 'false').lower() == 'true'

if USE_LOCAL_DB:
    # Local database configuration
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': 'password',
        'database': 'qianye',
    }
else:
    # Remote database configuration
    DB_CONFIG = {
        'host': '38.55.124.252',
        'user': 'qianye',
        'password': '153854qQ',
        'database': 'qianye',
    }

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