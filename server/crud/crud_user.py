import pymysql
from .. import database

from .. import auth
from ..schemas import schema

def get_user_by_username(user_name: str):
    """根据道号查找一位道友。"""
    conn = database.get_db_connection()
    if not conn:
        return None
    sql = "SELECT * FROM users WHERE user_name = %s"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (user_name,))
            user = cursor.fetchone()
            return user
    finally:
        if conn:
            conn.close()

def create_user(user: schema.UserCreate):
    """
    接引新道友，将其名号与凭证写入 users 表。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"

    hashed_password = auth.get_password_hash(user.password)
    
    try:
        with conn.cursor() as cursor:
            role = 'user' # Public registration always creates a 'user'
            sql = "INSERT INTO users (user_name, password_hash, role) VALUES (%s, %s, %s)"
            cursor.execute(sql, (user.user_name, hashed_password, role))
            conn.commit()
            
            new_user_id = cursor.lastrowid
            return {"id": new_user_id, "user_name": user.user_name, "role": role}, "道友接引成功！"
            
    except pymysql.MySQLError as e:
        conn.rollback()
        if e.args[0] == 1062:
            return None, "此道号已被他人占用，请另择佳名。"
        print(f"!!! 创建用户失败: {e}")
        return None, f"未知错误: {e}"
    finally:
        if conn:
            conn.close()

def ensure_system_user_exists():
    """
    确保ID为1的系统用户存在。
    """
    conn = database.get_db_connection()
    if not conn:
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE id = 1")
            if not cursor.fetchone():
                print("--- 系统用户不存在，正在创建... ---")
                # 使用 INSERT IGNORE 来避免在并发情况下因重复插入而报错
                cursor.execute("INSERT IGNORE INTO users (id, user_name) VALUES (1, 'system')")
                conn.commit()
                print("--- 系统用户创建成功。 ---")
    except pymysql.MySQLError as e:
        print(f"!!! 确保系统用户存在时出错: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()