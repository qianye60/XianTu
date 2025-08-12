import pymysql
from .. import database

def get_worlds():
    """
    获取所有已创建的世界列表。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "SELECT id, name, type, description FROM worlds"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            worlds = cursor.fetchall()
            return worlds, "世界列表获取成功"
    except pymysql.MySQLError as e:
        print(f"!!! 获取世界列表失败: {e}")
        return None, f"未知错误: {e}"
    finally:
        if conn:
            conn.close()

def create_world(name: str, world_type: str, description: str, author_id: int):
    """
    开辟一个新的世界。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "INSERT INTO worlds (name, type, description, author_id) VALUES (%s, %s, %s, %s)"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (name, world_type, description, author_id))
            conn.commit()
            new_world_id = cursor.lastrowid
            return {"id": new_world_id, "name": name, "type": world_type, "description": description, "author_id": author_id}, "新世界开辟成功！"
    except pymysql.MySQLError as e:
        conn.rollback()
        print(f"!!! 开辟世界失败: {e}")
        return None, f"未知错误: {e}"
    finally:
        if conn:
            conn.close()

def ensure_default_world_exists():
    """
    确保名为“朝天大陆”的默认主世界存在。
    若不存在，则自动创建。
    """
    conn = database.get_db_connection()
    if not conn:
        print("!!! 数据库连接失败，无法确保主世界存在。")
        return

    try:
        with conn.cursor() as cursor:
            # 检查主世界是否存在
            cursor.execute("SELECT id FROM worlds WHERE name = %s", ("朝天大陆",))
            result = cursor.fetchone()
            
            if result:
                print("--- 主世界“朝天大陆”已存在，无需衍化。 ---")
            else:
                # 如果不存在，则创建
                print("--- 主世界“朝天大陆”不存在，正在衍化... ---")
                sql = "INSERT INTO worlds (name, type, description, author_id) VALUES (%s, %s, %s, %s)"
                # author_id=1 代表系统/管理员
                cursor.execute(sql, ("朝天大陆", "仙侠", "万道之始，众生朝天之界。", 1))
                conn.commit()
                print("--- 主世界“朝天大陆”衍化成功！ ---")

    except pymysql.MySQLError as e:
        print(f"!!! 确保主世界存在时出错: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()