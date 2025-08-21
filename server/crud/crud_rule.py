from typing import Dict, Any

async def get_core_settings() -> Dict[str, Any]:
    """获取核心游戏设定"""
    settings = {
        "attributes": {
            "CON": "根骨 - 影响生命值和防御力",
            "INT": "悟性 - 影响学习速度和技能效果",
            "SPI": "神识 - 影响法术强度和感知能力",
            "LUK": "气运 - 影响幸运事件的发生概率",
            "CHA": "仪容 - 影响社交互动和他人反应",
            "BKG": "家世 - 影响初始资源和背景关系"
        },
        "cultivation_elements": [
            "金、木、水、火、土五行",
            "阴阳",
            "风、雷、冰等变异灵根",
            "剑道、丹道、器道等修炼方向"
        ]
    }
    return settings