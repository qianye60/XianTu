import pymysql
from .. import database

def create_character(user_id: int, world_id: int, character_name: str, character_data_json: str):
    """
    在指定世界为指定用户缔造一具化身（创建云存档）。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "INSERT INTO characters (user_id, world_id, character_name, character_data) VALUES (%s, %s, %s, %s)"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (user_id, world_id, character_name, character_data_json))
            conn.commit()
            new_char_id = cursor.lastrowid
            return {"id": new_char_id, "user_id": user_id, "world_id": world_id, "character_name": character_name}, "仙身缔造成功！"
    except pymysql.MySQLError as e:
        conn.rollback()
        # 可以根据具体约束（如：一个用户在一个世界只能有一个活跃角色）添加更复杂的错误处理
        print(f"!!! 缔造仙身失败: {e}")
        return None, f"未知错误: {e}"
    finally:
        if conn:
            conn.close()