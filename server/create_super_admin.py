import getpass
import pymysql
from database import get_db_connection
from auth import get_password_hash

def create_super_admin():
    """
    此为创世敕令，用以敕封第一位（或任何一位）超级管理员。
    """
    print("--- 正在敕封超级管理员 ---")
    
    # 获取管理员信息
    try:
        username = input("请输入管理员道号: ")
        password = getpass.getpass("请输入管理员凭证 (输入时不可见): ")
        confirm_password = getpass.getpass("请再次确认凭证: ")
    except (EOFError, KeyboardInterrupt):
        print("\n敕封仪式中断。")
        return

    if not username or not password:
        print("道号或凭证不可为空。敕封失败。")
        return
        
    if password != confirm_password:
        print("两次输入的凭证不符。敕封失败。")
        return

    hashed_password = get_password_hash(password)
    role = 'super_admin'

    conn = get_db_connection()
    if not conn:
        print("无法连接到数据库灵脉，敕封失败。")
        return

    # 检查用户是否已存在
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT user_name FROM users WHERE user_name = %s", (username,))
            if cursor.fetchone():
                print(f"道号 '{username}' 已被占用。若要变更其权责，请直接操作数据库。")
                return

            # 创建新用户
            sql = "INSERT INTO users (user_name, password_hash, role) VALUES (%s, %s, %s)"
            cursor.execute(sql, (username, hashed_password, role))
            conn.commit()
            print(f"--- 敕封成功！道号 '{username}' 已被赐予“超级管理员”之权柄。 ---")

    except pymysql.MySQLError as e:
        print(f"敕封途中遭遇混沌乱流，操作失败: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_super_admin()