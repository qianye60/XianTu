import pymysql
from server import database
from server.schemas import schema

def get_user_permissions(user_id: int):
    """
    查阅指定天官的权柄。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "SELECT * FROM permissions WHERE user_id = %s"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (user_id,))
            result = cursor.fetchone()
            return result, "权柄查阅完毕"
    except pymysql.MySQLError as e:
        return None, f"查阅权柄失败: {e}"
    finally:
        if conn:
            conn.close()

def create_or_update_user_permissions(user_id: int, perms: schema.PermissionCreate):
    """
    册封或变更天官的权柄。
    若该用户尚无权柄记录，则为其创建；若已有，则更新。
    """
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"

    # 检查是否存在
    existing_perms, msg = get_user_permissions(user_id)
    if msg != "权柄查阅完毕":
        return None, msg # 传递数据库错误

    try:
        with conn.cursor() as cursor:
            if existing_perms:
                # 更新
                sql = """
                    UPDATE permissions SET
                    can_generate_codes = %s,
                    can_manage_worlds = %s,
                    can_manage_talents = %s,
                    can_manage_users = %s
                    WHERE user_id = %s
                """
                cursor.execute(sql, (
                    perms.can_generate_codes,
                    perms.can_manage_worlds,
                    perms.can_manage_talents,
                    perms.can_manage_users,
                    user_id
                ))
                message = "天官权柄已更新"
            else:
                # 创建
                sql = """
                    INSERT INTO permissions (user_id, can_generate_codes, can_manage_worlds, can_manage_talents, can_manage_users)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    user_id,
                    perms.can_generate_codes,
                    perms.can_manage_worlds,
                    perms.can_manage_talents,
                    perms.can_manage_users
                ))
                message = "天官权柄已册封"
            
            conn.commit()
            return {"user_id": user_id, **perms.model_dump()}, message
    except pymysql.MySQLError as e:
        conn.rollback()
        return None, f"册封/变更权柄失败: {e}"
    finally:
        if conn:
            conn.close()
