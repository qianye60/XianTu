"""
角色属性计算模块
基于先天六司计算核心属性
"""

def calculate_core_attributes(
    root_bone: int,
    spirituality: int,
    comprehension: int,
    fortune: int,  # 气运（原福缘）
    charm: int,
    temperament: int,
    birth_age: int = 16  # 出生年龄，可选0-18
) -> dict:
    """
    根据先天六司计算核心属性
    
    Args:
        root_bone: 根骨 (0-10)
        spirituality: 灵性 (0-10)
        comprehension: 悟性 (0-10)
        fortune: 气运 (0-10) 【原福缘】
        charm: 魅力 (0-10)
        temperament: 心性 (0-10)
        birth_age: 出生年龄 (0-18)
        
    Returns:
        dict: 包含所有核心属性的字典
    """
    
    # 基础计算公式
    # 每点先天六司提供不同的属性加成
    
    # 气血系统（基于根骨）
    base_qi_blood = 80  # 基础气血
    qi_blood_per_bone = 15  # 每点根骨增加的气血
    max_qi_blood = base_qi_blood + (root_bone * qi_blood_per_bone)
    qi_blood_recovery_rate = 1.0 + (root_bone * 0.1)  # 每点根骨增加10%恢复速度
    
    # 灵气系统（基于灵性）
    base_spiritual = 60  # 基础灵气
    spiritual_per_point = 12  # 每点灵性增加的灵气
    max_spiritual = base_spiritual + (spirituality * spiritual_per_point)
    spiritual_recovery_rate = 1.0 + (spirituality * 0.12)  # 每点灵性增加12%恢复速度
    
    # 神识系统（基于悟性）
    base_spirit = 50  # 基础神识
    spirit_per_point = 10  # 每点悟性增加的神识
    max_spirit = base_spirit + (comprehension * spirit_per_point)
    spirit_recovery_rate = 1.0 + (comprehension * 0.08)  # 每点悟性增加8%恢复速度
    
    # 寿元系统（基于根骨）
    base_lifespan = 60  # 凡人基础寿命
    lifespan_per_bone = 10 # 每点根骨增加10年寿命
    max_lifespan = base_lifespan + (root_bone * lifespan_per_bone)
    
    # 使用传入的出生年龄
    current_age = birth_age

    # 获取凡人境界ID
    mortal_realm_id = 1  # 默认为1，凡人境界

    return {
        # 核心属性上限
        "max_qi_blood": max_qi_blood,
        "max_spiritual_power": max_spiritual,
        "max_spirit_sense": max_spirit,
        "max_lifespan": max_lifespan,
        
        # 当前属性值（初始化时等于上限）
        "qi_blood": max_qi_blood,
        "spiritual_power": max_spiritual,
        "spirit_sense": max_spirit,
        "current_age": birth_age, # 修正：确保使用传入的 birth_age
        
        # 恢复速度基础值（将与时间挂钩）
        "qi_blood_recovery_rate": round(qi_blood_recovery_rate, 2),
        "spiritual_recovery_rate": round(spiritual_recovery_rate, 2),
        "spirit_recovery_rate": round(spirit_recovery_rate, 2),
        
        # 其他衍生属性（用于后续系统）
        "luck_factor": fortune,  # 气运影响奇遇概率
        "social_bonus": charm,   # 魅力影响社交
        "mental_resistance": temperament,  # 心性影响心魔抗性
        
        # 初始境界
        "current_realm_id": mortal_realm_id,  # 凡人境界
        "cultivation_progress": 0.0,
        "cultivation_experience": 0,
        
        # 初始位置和场景
        "current_location": "未知之地",
        "current_scene": "初入修仙界",
        
        # 初始资源（全部为空）
        "spiritual_stones": 0,  # 灵石改为0
        
        # 初始背包（空的）
        "inventory": {},
        "equipped_items": {},
        
        # 初始技能和功法（空的）
        "learned_skills": [],
        "cultivation_methods": [],
        
        # 初始关系和声望（空的）
        "relationships": {},
        "faction_reputation": {},
        
        # 初始任务和成就（空的）
        "active_quests": [],
        "completed_quests": [],
        "achievements": [],
        
        # 同步控制
        "version": 1,
        "is_dirty": False
    }


def get_attribute_description(attribute_name: str, value: int) -> str:
    """
    获取属性数值的描述
    
    Args:
        attribute_name: 属性名称
        value: 属性值
        
    Returns:
        str: 属性描述
    """
    descriptions = {
        "root_bone": {
            0: "羸弱不堪", 1: "体弱多病", 2: "身体孱弱", 3: "体质一般",
            4: "身体健康", 5: "体质不错", 6: "身强体壮", 7: "筋骨强健",
            8: "体魄过人", 9: "天生神力", 10: "金刚不坏"
        },
        "spirituality": {
            0: "灵气不显", 1: "灵性微弱", 2: "灵性较低", 3: "灵性一般",
            4: "灵性尚可", 5: "灵性不错", 6: "灵性敏锐", 7: "灵性超群",
            8: "灵性过人", 9: "灵性绝佳", 10: "天人感应"
        },
        "comprehension": {
            0: "愚钝如牛", 1: "悟性极差", 2: "悟性较差", 3: "悟性一般",
            4: "悟性尚可", 5: "悟性不错", 6: "悟性敏锐", 7: "悟性超群",
            8: "悟性过人", 9: "悟性绝佳", 10: "一点即通"
        },
        "fortune": {
            0: "厄运缠身", 1: "运气极差", 2: "运气较差", 3: "运气一般",
            4: "运气尚可", 5: "运气不错", 6: "运气颇佳", 7: "运气极好",
            8: "福星高照", 9: "洪福齐天", 10: "天命之子"
        },
        "charm": {
            0: "面目可憎", 1: "其貌不扬", 2: "容貌平平", 3: "容貌一般",
            4: "容貌尚可", 5: "容貌不错", 6: "容貌出众", 7: "美貌动人",
            8: "倾国倾城", 9: "绝世容颜", 10: "天人之姿"
        },
        "temperament": {
            0: "心性不稳", 1: "意志薄弱", 2: "心性较差", 3: "心性一般",
            4: "心性尚可", 5: "心性不错", 6: "道心稳固", 7: "道心坚韧",
            8: "道心如铁", 9: "道心不移", 10: "道心圆满"
        }
    }
    
    if attribute_name in descriptions and value in descriptions[attribute_name]:
        return descriptions[attribute_name][value]
    
    return f"未知境界({value})"