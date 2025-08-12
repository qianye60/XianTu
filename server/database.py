import pymysql
import pymysql.cursors

# --- 灵脉参数 (数据库配置) ---
DB_CONFIG = {
    'host': '38.55.124.252',
    'user': 'qianye',
    'password': '153854qQ',
    'database': 'qianye',
    'connect_timeout': 10,
    'cursorclass': pymysql.cursors.DictCursor,
    'charset': 'utf8mb4'
}

def get_db_connection():
    """ 使用 PyMySQL 获取一个新的数据库连接。 """
    try:
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except pymysql.MySQLError as e:
        print(f"!!! PyMySQL 连接失败: {e}")
        return None

def create_all_new_tables():
    """
    开天辟地之术：一次性创建所有新世界的表结构。
    此术会衍化出 users, worlds, characters, redemption_codes, 
    以及核心规则和UGC相关的表。
    *** 已加入编码修正 ***
    """
    conn = get_db_connection()
    if not conn:
        print("无法连接到数据库灵脉，创世失败。")
        return

    # 定义表名，便于统一处理
    table_names = [
        "ugc_talents", "ugc_origins", "core_spirit_roots", "core_talents",
        "core_origins", "redemption_codes", "characters", "worlds", "users",
        "realms", "cultivation_paths", "cultivation_arts"
    ]
    
    # 将所有创世SQL法咒汇于一处
    # 注意：CHARACTER SET 和 COLLATE 的添加是为了确保中文等非英文字符正确存储
    creation_sql_commands = {
        "users": """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_name VARCHAR(255) NOT NULL UNIQUE COMMENT '道友的唯一登录名号',
                password_hash VARCHAR(255) COMMENT '加密后的凭证',
                role VARCHAR(50) NOT NULL DEFAULT 'user' COMMENT '用户角色: user, admin, super_admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '道友的创生之时'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '用户表';
        """,
        "worlds": """
            CREATE TABLE IF NOT EXISTS worlds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL COMMENT '世界之名',
                type VARCHAR(50) COMMENT '世界类型，如 洪荒、现代',
                description TEXT COMMENT '世界的描述',
                settings JSON COMMENT '存储世界独特法则，如灵气浓度、地图规则等',
                author_id INT COMMENT '创世者ID，关联users表',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '世界表';
        """,
        "characters": """
            CREATE TABLE IF NOT EXISTS characters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL COMMENT '关联到 users.id',
                world_id INT NOT NULL COMMENT '关联到 worlds.id',
                character_name VARCHAR(255) NOT NULL COMMENT '此仙身之名',
                character_data JSON COMMENT '存档核心数据，包含属性、物品、记忆等',
                is_active BOOLEAN DEFAULT TRUE COMMENT '是否为当前活跃存档',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '云存档表';
        """,
        "redemption_codes": """
            CREATE TABLE IF NOT EXISTS redemption_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(255) NOT NULL UNIQUE COMMENT '兑换码字符串',
                type VARCHAR(50) NOT NULL COMMENT '兑换码类型，如 UGC_ORIGIN_SUBMIT',
                is_used BOOLEAN DEFAULT FALSE COMMENT '是否已被使用',
                used_by_user_id INT NULL COMMENT '被哪位道友所用，关联users.id',
                used_at TIMESTAMP NULL,
                expires_at TIMESTAMP NULL COMMENT '凭证的失效之时',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '兑换码表';
        """,
        "core_origins": """
            CREATE TABLE IF NOT EXISTS core_origins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                attribute_modifiers JSON
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '官方核心出身背景';
        """,
        "core_talents": """
            CREATE TABLE IF NOT EXISTS core_talents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                effects JSON
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '官方核心天赋';
        """,
        "core_spirit_roots": """
            CREATE TABLE IF NOT EXISTS core_spirit_roots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                base_multiplier DECIMAL(5, 2)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '官方核心灵根';
        """,
        "ugc_origins": """
            CREATE TABLE IF NOT EXISTS ugc_origins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                attribute_modifiers JSON,
                author_id INT NOT NULL COMMENT '作者ID，关联users.id',
                status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, approved, rejected',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'UGC出身背景';
        """,
        "ugc_talents": """
            CREATE TABLE IF NOT EXISTS ugc_talents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                effects JSON,
                author_id INT NOT NULL COMMENT '作者ID，关联users.id',
                status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, approved, rejected',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'UGC天赋';
        """,
        "realms": """
            CREATE TABLE IF NOT EXISTS realms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                milestone TEXT,
                lifespan VARCHAR(255),
                description TEXT,
                `order` INT NOT NULL UNIQUE COMMENT '境界排序'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '通用境界表';
        """,
        "cultivation_paths": """
            CREATE TABLE IF NOT EXISTS cultivation_paths (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                concept TEXT,
                description TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '通用道途表';
        """,
        "cultivation_arts": """
            CREATE TABLE IF NOT EXISTS cultivation_arts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                function TEXT,
                ranks JSON,
                products JSON,
                note TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '通用百艺表';
        """
    }

    try:
        with conn.cursor() as cursor:
            # 必须先删除所有表（逆序），再创建
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            print("--- 正在归墟旧世界 ---")
            for table_name in table_names:
                print(f"正在抹除 `{table_name}` 表...")
                cursor.execute(f"DROP TABLE IF EXISTS {table_name};")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            print("--- 旧世界已归于混沌 ---")

            # 逆序创建，先创建被引用的表
            print("\n--- 正在衍化核心表 ---")
            cursor.execute(creation_sql_commands['users'])
            print("`users` 表已衍化成功。")
            cursor.execute(creation_sql_commands['worlds'])
            print("`worlds` 表已衍化成功。")

            print("\n--- 正在衍化关联表 ---")
            cursor.execute(creation_sql_commands['characters'])
            print("`characters` (云存档) 表已衍化成功。")
            cursor.execute(creation_sql_commands['redemption_codes'])
            print("`redemption_codes` 表已衍化成功。")

            print("\n--- 正在铭刻天道大纲 (核心规则表) ---")
            cursor.execute(creation_sql_commands['core_origins'])
            print("`core_origins` 表已铭刻成功。")
            cursor.execute(creation_sql_commands['core_talents'])
            print("`core_talents` 表已铭刻成功。")
            cursor.execute(creation_sql_commands['core_spirit_roots'])
            print("`core_spirit_roots` 表已铭刻成功。")

            print("\n--- 正在开辟百家争鸣之地 (UGC表) ---")
            cursor.execute(creation_sql_commands['ugc_origins'])
            print("`ugc_origins` 表已开辟成功。")
            cursor.execute(creation_sql_commands['ugc_talents'])
            print("`ugc_talents` 表已开辟成功。")

            print("\n--- 正在篆刻通用修仙法理 (核心设定) ---")
            cursor.execute(creation_sql_commands['realms'])
            print("`realms` 表已篆刻成功。")
            cursor.execute(creation_sql_commands['cultivation_paths'])
            print("`cultivation_paths` 表已篆刻成功。")
            cursor.execute(creation_sql_commands['cultivation_arts'])
            print("`cultivation_arts` 表已篆刻成功。")

        conn.commit()
        print("\n--- 乾坤重塑完毕，新世界基石已定！编码法则已修正！ ---")

    except pymysql.MySQLError as e:
        print(f"!!! 创世途中遭遇混沌乱流，操作失败: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    # 独立运行时，执行创世法咒
    print("正在执行数据库初始化脚本...")
    create_all_new_tables()
    # 注意：此处的 seed_core_rules() 在独立运行时会报错，因为它已被移走
    # 这只是为了在直接运行此文件时重建数据库结构
    print("数据库结构已更新。请通过 main.py 启动应用来注入数据。")
