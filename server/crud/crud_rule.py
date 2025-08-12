import pymysql
import json
from .. import database

def seed_core_rules():
    """
    天道铭刻之术：为核心规则表注入初始数据。
    此术会检查表是否为空，若为空，则注入一批权威的、符合世界观的默认规则。
    """
    conn = database.get_db_connection()
    if not conn:
        print("!!! 数据库连接失败，天道铭刻失败。")
        return

    # --- 初始道法定义 ---
    core_origins_data = [
        {'name': '孤儿', 'description': '天地为父母，四海为家。你的童年充满了艰辛，但也磨练了你坚韧不拔的意志。', 'attribute_modifiers': json.dumps({'CON': 2, 'LUK': 1})},
        {'name': '书香门第', 'description': '你的家族世代为官，书香传家。你自幼饱读诗书，对天地至理有自己独到的见解。', 'attribute_modifiers': json.dumps({'INT': 2, 'CHA': 1})},
        {'name': '商贾之家', 'description': '你的家族富甲一方，善于经商。你从小耳濡目染，精于计算，深谙人情世故。', 'attribute_modifiers': json.dumps({'BKG': 2, 'SPI': 1})},
        {'name': '将门之后', 'description': '你的先祖曾是叱咤风云的将军。你继承了先祖的勇武，体魄强健，杀伐果断。', 'attribute_modifiers': json.dumps({'CON': 2, 'SPI': 1})},
    ]

    core_talents_data = [
        {'name': '天生道体', 'description': '你天生亲近大道，修行速度远超常人。', 'effects': json.dumps({'training_speed_multiplier': 1.2})},
        {'name': '丹道宗师', 'description': '你对药理有超凡的领悟力，炼丹时成功率更高，丹药品质也更好。', 'effects': json.dumps({'alchemy_success_rate': 1.1, 'alchemy_quality_bonus': 1})},
        {'name': '剑心通明', 'description': '你的剑道天赋无人能及，学习任何剑法都能迅速掌握其精髓。', 'effects': json.dumps({'sword_art_mastery_speed': 1.5})},
        {'name': '气运之子', 'description': '你仿佛被天地所眷顾，时常能遇到意想不到的机缘。', 'effects': json.dumps({'random_event_luck_bonus': 5})},
    ]

    core_spirit_roots_data = [
        {'name': '废品灵根', 'description': '五行杂乱，灵气难以入体，修行之路崎岖坎坷。', 'base_multiplier': 0.5},
        {'name': '五行灵根', 'description': '五行俱全，虽无专精，但胜在平和，可修行任何属性的功法。', 'base_multiplier': 1.0},
        {'name': '天品单灵根', 'description': '五行之中专精其一，修行该属性功法时，速度一日千里。', 'base_multiplier': 2.0},
    ]

    try:
        with conn.cursor() as cursor:
            # 1. 铭刻出身
            cursor.execute("SELECT COUNT(*) as count FROM core_origins")
            if cursor.fetchone()['count'] == 0:
                print("--- `core_origins` 为空，开始铭刻初始出身... ---")
                sql = "INSERT INTO core_origins (name, description, attribute_modifiers) VALUES (%s, %s, %s)"
                for origin in core_origins_data:
                    cursor.execute(sql, (origin['name'], origin['description'], origin['attribute_modifiers']))
                print(f"--- 成功铭刻 {len(core_origins_data)} 条出身。 ---")

            # 2. 铭刻天赋
            cursor.execute("SELECT COUNT(*) as count FROM core_talents")
            if cursor.fetchone()['count'] == 0:
                print("--- `core_talents` 为空，开始铭刻初始天赋... ---")
                sql = "INSERT INTO core_talents (name, description, effects) VALUES (%s, %s, %s)"
                for talent in core_talents_data:
                    cursor.execute(sql, (talent['name'], talent['description'], talent['effects']))
                print(f"--- 成功铭刻 {len(core_talents_data)} 条天赋。 ---")

            # 3. 铭刻灵根
            cursor.execute("SELECT COUNT(*) as count FROM core_spirit_roots")
            if cursor.fetchone()['count'] == 0:
                print("--- `core_spirit_roots` 为空，开始铭刻初始灵根... ---")
                sql = "INSERT INTO core_spirit_roots (name, description, base_multiplier) VALUES (%s, %s, %s)"
                for root in core_spirit_roots_data:
                    cursor.execute(sql, (root['name'], root['description'], root['base_multiplier']))
                print(f"--- 成功铭刻 {len(core_spirit_roots_data)} 条灵根。 ---")
            
            conn.commit()
    except pymysql.MySQLError as e:
        print(f"!!! 天道铭刻途中遭遇混沌乱流: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

def get_core_origins():
    """获取所有核心出身"""
    conn = database.get_db_connection()
    if not conn: return None, "数据库连接失败"
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, description, attribute_modifiers FROM core_origins")
            return cursor.fetchall(), "出身列表获取成功"
    except pymysql.MySQLError as e:
        return None, f"获取出身列表失败: {e}"
    finally:
        if conn: conn.close()

def get_core_talents():
    """获取所有核心天赋"""
    conn = database.get_db_connection()
    if not conn: return None, "数据库连接失败"
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, description, effects FROM core_talents")
            return cursor.fetchall(), "天赋列表获取成功"
    except pymysql.MySQLError as e:
        return None, f"获取天赋列表失败: {e}"
    finally:
        if conn: conn.close()

def get_core_spirit_roots():
    """获取所有核心灵根"""
    conn = database.get_db_connection()
    if not conn: return None, "数据库连接失败"
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, description, base_multiplier FROM core_spirit_roots")
            return cursor.fetchall(), "灵根列表获取成功"
    except pymysql.MySQLError as e:
        return None, f"获取灵根列表失败: {e}"
    finally:
        if conn: conn.close()