"""物品系统核心模块"""
from typing import Dict, Any

def get_initial_equipment() -> Dict[str, Any]:
    """获取初始装备栏配置"""
    return {
        "weapon": None,      # 武器
        "armor": None,       # 护甲
        "accessory": None,   # 饰品
        "shoes": None,       # 鞋子
        "ring": None,        # 戒指
        "necklace": None     # 项链
    }

def get_initial_inventory() -> Dict[str, Any]:
    """获取初始背包配置"""
    return {
        "items": {},         # 物品列表
        "max_slots": 20,     # 最大槽位数
        "used_slots": 0      # 已使用槽位数
    }