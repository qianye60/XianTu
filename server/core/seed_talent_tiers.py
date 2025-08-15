"""
天资等级种子数据
6个天资等级从低到高，决定角色创建时的总可分配点数
"""

from server.models import TalentTier

talent_tier_data = [
    {
        "name": "废柴",
        "description": "天资愚钝，资质平庸。修行之路困难重重，唯有靠不懈努力方能有所建树。",
        "total_points": 10,
        "rarity": 6,
        "color": "#8B4513"  # 棕色
    },
    {
        "name": "普通",
        "description": "资质平平，无甚出奇之处。修行稳扎稳打，按部就班即可。",
        "total_points": 15,
        "rarity": 5,
        "color": "#808080"  # 灰色
    },
    {
        "name": "优秀",
        "description": "颇有天赋，资质不错。修行事半功倍，前景可观。",
        "total_points": 20,
        "rarity": 4,
        "color": "#4169E1"  # 蓝色
    },
    {
        "name": "天才",
        "description": "天赋异禀，资质出众。修行如有神助，进境神速。",
        "total_points": 30,
        "rarity": 3,
        "color": "#9932CC"  # 紫色
    },
    {
        "name": "妖孽",
        "description": "天才中的天才，资质卓绝。万中无一的修行种子，前途不可限量。",
        "total_points": 40,
        "rarity": 2,
        "color": "#FFD700"  # 金色
    },
    {
        "name": "逆天",
        "description": "万古难遇的绝世天才，资质逆天。天道眷顾，必成大器。",
        "total_points": 60,
        "rarity": 1,
        "color": "#FF0000"  # 红色
    }
]

async def seed_talent_tiers():
    """初始化天资等级数据"""
    print("--- [TalentTiers] 开始初始化天资等级数据 (ORM)... ---")
    
    # 检查是否已有数据
    existing_count = await TalentTier.all().count()
    if existing_count > 0:
        print(f"--- [TalentTiers] 天资等级数据已存在 ({existing_count} 条)，跳过初始化。 ---")
        return
    
    # 批量创建天资等级
    talent_tiers = []
    for data in talent_tier_data:
        talent_tier = TalentTier(**data)
        talent_tiers.append(talent_tier)
    
    await TalentTier.bulk_create(talent_tiers)
    
    print(f"--- [TalentTiers] 成功创建 {len(talent_tier_data)} 个天资等级 ---")
    print("--- [TalentTiers] 天资等级数据初始化完成 (ORM)。 ---")