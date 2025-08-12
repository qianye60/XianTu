import pymysql
import json
from .. import database
from ..schemas import schema

# ========= 境界 (Realms) =========

def create_realm(realm: schema.RealmCreate):
    """向藏经阁中录入一条新的境界法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = """
        INSERT INTO realms (name, title, milestone, lifespan, description, `order`)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (
                realm.name, realm.title, realm.milestone, 
                realm.lifespan, realm.description, realm.order
            ))
            conn.commit()
            new_id = cursor.lastrowid
            return {"id": new_id, **realm.dict()}, "境界法理录入成功"
    except pymysql.MySQLError as e:
        conn.rollback()
        return None, f"录入境界法理失败: {e}"
    finally:
        if conn:
            conn.close()

def get_realms():
    """从藏经阁中查阅所有境界法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "SELECT * FROM realms ORDER BY `order` ASC"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            result = cursor.fetchall()
            return result, "境界法理查阅完毕"
    except pymysql.MySQLError as e:
        return None, f"查阅境界法理失败: {e}"
    finally:
        if conn:
            conn.close()

# ========= 道途 (Cultivation Paths) =========

def create_cultivation_path(path_data: schema.CultivationPathCreate):
    """向藏经阁中录入一条新的道途法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "INSERT INTO cultivation_paths (name, concept, description) VALUES (%s, %s, %s)"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (path_data.name, path_data.concept, path_data.description))
            conn.commit()
            new_id = cursor.lastrowid
            return {"id": new_id, **path_data.dict()}, "道途法理录入成功"
    except pymysql.MySQLError as e:
        conn.rollback()
        return None, f"录入道途法理失败: {e}"
    finally:
        if conn:
            conn.close()

def get_cultivation_paths():
    """从藏经阁中查阅所有道途法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "SELECT * FROM cultivation_paths"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            result = cursor.fetchall()
            return result, "道途法理查阅完毕"
    except pymysql.MySQLError as e:
        return None, f"查阅道途法理失败: {e}"
    finally:
        if conn:
            conn.close()

# ========= 百艺 (Cultivation Arts) =========

def create_cultivation_art(art_data: schema.CultivationArtCreate):
    """向藏经阁中录入一条新的百艺法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
        
    # 将list转换为JSON字符串
    ranks_json = json.dumps(art_data.ranks, ensure_ascii=False) if isinstance(art_data.ranks, list) else art_data.ranks
    products_json = json.dumps(art_data.products, ensure_ascii=False) if isinstance(art_data.products, list) else art_data.products

    sql = "INSERT INTO cultivation_arts (name, function, ranks, products, note) VALUES (%s, %s, %s, %s, %s)"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, (
                art_data.name, art_data.function, ranks_json, products_json, art_data.note
            ))
            conn.commit()
            new_id = cursor.lastrowid
            return {"id": new_id, **art_data.dict()}, "百艺法理录入成功"
    except pymysql.MySQLError as e:
        conn.rollback()
        return None, f"录入百艺法理失败: {e}"
    finally:
        if conn:
            conn.close()

def get_cultivation_arts():
    """从藏经阁中查阅所有百艺法理。"""
    conn = database.get_db_connection()
    if not conn:
        return None, "数据库连接失败"
    
    sql = "SELECT * FROM cultivation_arts"
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            results = cursor.fetchall()
            # 将JSON字符串转回list
            for item in results:
                if item.get('ranks'):
                    item['ranks'] = json.loads(item['ranks'])
                if item.get('products'):
                    item['products'] = json.loads(item['products'])
            return results, "百艺法理查阅完毕"
    except (pymysql.MySQLError, json.JSONDecodeError) as e:
        return None, f"查阅百艺法理失败: {e}"
    finally:
        if conn:
            conn.close()
