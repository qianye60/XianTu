import sys
import os
from typing import List, Dict, Any

# 将项目根目录添加到Python路径中，以便能够导入server模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.database import get_db_connection
from server.crud import crud_world
from server.schemas import schema

# 与 src/core/data/database_seed.ts 中的 DEFAULT_WORLDS 保持同步
DEFAULT_WORLDS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": '朝天大陆',
        "type": '古典仙侠',
        "description": '此乃万道之始，众生朝天之界。此界的核心法则是森严的境界壁垒，不同生命层次之间宛如天渊之隔。修行初阶，修士尚在凡尘浊世中挣扎，于稀薄灵气中寻觅仙缘，在王朝更迭中见证沧桑；待到道途中段，方能接触真正的元气清都，此处宗门林立，为争夺修行资源而合纵连横；唯有臻至上境，才能触及那传说中的法则天域，一念引动天地异象。修士的毕生所求，便是突破这层层无形的壁垒，跨越仙凡之堑，最终在道之巅峰叩问本源，与天争命。此界道途万千，剑修、佛门、儒道、魔道、艺道百花齐放，共同构成了波澜壮阔的修仙画卷。',
        "author_id": 1
    },
    {
        "id": 2,
        "name": '混沌星域',
        "type": '无尽星海',
        "description": '此方宇宙，并无统一的大陆，而是由无尽的星辰与破碎的位面构成。各个星系文明迥异，修行体系千差万别。有驾驭星舰、身着机甲的科技修士，以高能灵晶炮轰碎星辰；也有吐纳恒星真火、肉身横渡虚空的古法修士；更有与星兽共生，掌控引力的异族文明。修士需乘坐“虚空渡舟”，在不同的“星岸”之间穿梭，交易特产，学习异域功法，探索隐藏在陨石带深处的上古遗迹。在这里，生存是第一法则，没有永恒的道友，只有永恒的利益。宇宙风暴、虚空巨兽、文明猎手是每一个星际旅者的噩梦，但无尽的未知也意味着无尽的机缘。',
        "author_id": 1
    },
    {
        "id": 3,
        "name": '荒古大地',
        "type": '蛮荒纪元',
        "description": '一片被时光遗忘的古老大陆，天地间充斥着狂暴而原始的荒古之气。这里没有宗门，没有仙城，只有以血脉划分的原始部落。人类并非此地主宰，体型如山峦的太古凶兽、生而能掌控法则的纯血神魔后裔，才是这片大地的主人。修士的修行，更像是一种血脉的返祖与觉醒，他们将凶兽的精魄炼入体内，获得其神通；在神魔遗骸边感悟，继承其部分法则。此界的战斗血腥而直接，每一次狩猎都是生死一线的搏杀。修士以部落图腾为信仰，争夺稀少的“生命源地”，以求在残酷的环境中延续族群的火种。',
        "author_id": 1
    },
]

def seed_worlds():
    """
    将预设的世界背景数据填充到数据库中。
    """
    db = get_db_connection()
    if not db:
        print("!!! 数据库连接失败，无法播种世界数据。")
        return
        
    print("开始播种世界数据...")
    
    try:
        for world_data in DEFAULT_WORLDS:
            # 检查世界是否已存在
            existing_world, _ = crud_world.get_world_by_name(db, name=world_data["name"])
            if existing_world:
                print(f"--- 世界 '{world_data['name']}' 已存在，执行更新... ---")
                world_to_update = schema.WorldUpdate(
                    name=world_data.get("name"),
                    type=world_data.get("type"),
                    description=world_data.get("description")
                )
                updated_world, message = crud_world.update_world(
                    db,
                    world_id=existing_world['id'],
                    world=world_to_update
                )
                if updated_world:
                    print(f"--- 成功更新世界: '{updated_world.get('name')}' ---")
                else:
                    print(f"!!! 更新世界 '{world_data['name']}' 失败: {message} !!!")
            else:
                print(f"--- 世界 '{world_data['name']}' 不存在，执行创建... ---")
                # 创建世界
                world_to_create = schema.WorldCreate(
                    name=world_data["name"],
                    type=world_data["type"],
                    description=world_data["description"],
                    author_id=world_data["author_id"]
                )
                new_world, message = crud_world.create_world(db, world=world_to_create)
                
                if new_world:
                    print(f"--- 成功创建世界: '{new_world.get('name')}' ---")
                else:
                    print(f"!!! 创建世界 '{world_data['name']}' 失败: {message} !!!")
    finally:
        db.close()
        print("世界数据播种完毕。")

if __name__ == "__main__":
    seed_worlds()