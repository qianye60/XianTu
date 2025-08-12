from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .crud import crud_user, crud_world, crud_rule, crud_elements
from .database import create_all_new_tables
from .api.api_v1.api import api_router
from .schemas import schema

# --- 应用与法阵初始化 ---
app = FastAPI(
    title="大道朝天 - 后端灵脉",
    description="为大道朝天项目提供数据支持的核心API。",
    version="3.0.0" # Version bump to reflect major refactoring
)

@app.on_event("startup")
def on_startup():
    """
    服务器启动时执行的开天辟地之事。
    """
    print("--- 服务器启动，开始检查世界根基... ---")
    crud_user.ensure_system_user_exists()
    crud_world.ensure_default_world_exists()
    crud_rule.seed_core_rules() # 注入核心规则

    # 检查并注入通用修仙元素
    realms, _ = crud_elements.get_realms()
    if not realms:
        print("--- 藏经阁空虚，正在注入元始道藏... ---")
        seed_universal_elements()
    
    print("--- 世界根基稳固，灵脉畅通，天道规则已铭刻。 ---")


def seed_universal_elements():
    """
    开辟鸿蒙：向数据库注入最基础的通用修仙设定。
    """
    print("--- 正在篆刻'境界'法理 ---")
    realms_data = [
        {"name": "炼气", "title": "问道童子", "milestone": "引气入体，洗涤凡躯", "lifespan": "约120载", "description": "在凡间已是异人，可施展微末法术。", "order": 1},
        {"name": "筑基", "title": "入道之士", "milestone": "灵气液化，丹田筑基", "lifespan": "约250载", "description": "正式脱凡，可御器飞行。", "order": 2},
        {"name": "金丹", "title": "真人", "milestone": "灵液结丹，法力自生", "lifespan": "500-800载", "description": "在中三环可开宗立派，为一派老祖。", "order": 3},
        {"name": "元婴", "title": "真君", "milestone": "丹碎婴生，神魂寄托", "lifespan": "1500-2000载", "description": "元婴不灭，真灵不死。", "order": 4},
        {"name": "化神", "title": "道君", "milestone": "神游太虚，感悟法则", "lifespan": "约5000载", "description": "神识即领域，意念可干涉现实。", "order": 5},
        {"name": "炼虚", "title": "尊者", "milestone": "身融虚空，掌握空间", "lifespan": "万载以上", "description": "咫尺天涯，可短暂撕裂空间。", "order": 6},
        {"name": "合体", "title": "大能", "milestone": "法则归体，身即是道", "lifespan": "与世同君", "description": "一举一动皆引动大道共鸣。", "order": 7},
        {"name": "渡劫", "title": "问天者", "milestone": "超脱世界，叩问天道", "lifespan": "不定（劫数）", "description": "已是人间道之极致，引动天劫。", "order": 8}
    ]
    for r in realms_data:
        crud_elements.create_realm(schema.RealmCreate(**r))

    print("--- 正在衍化'道途'法理 ---")
    paths_data = [
        {"name": "剑修之道", "concept": "一剑破万法", "description": "吾道唯一，吾剑唯一。舍弃万般神通，只求极致的攻击力。"},
        {"name": "魔道修行", "concept": "顺心而为，唯我独尊", "description": "不尊天地，不敬鬼神，只求念头通达，力量至上。"},
        {"name": "佛门之道", "concept": "慈悲为舟，普度众生", "description": "见众生苦，发菩提心。修持戒定慧，熄灭贪嗔痴。"},
        {"name": "儒家之道", "concept": "立德立言，浩然正气", "description": "为天地立心，为生民立命。修身、齐家、治国、平天下。"},
        {"name": "艺道修行", "concept": "琴棋书画，皆可入道", "description": "以艺术之美，沟通天地之韵。"}
    ]
    for p in paths_data:
        crud_elements.create_cultivation_path(schema.CultivationPathCreate(**p))

    print("--- 正在铭刻'百艺'法理 ---")
    arts_data = [
        {"name": "炼丹术", "function": "辅助修炼、疗伤、突破", "ranks": ["丹徒", "丹师", "丹道大师", "丹道宗师"], "products": ["辟谷丹", "筑基丹", "破婴丹"], "note": "丹药皆有三分毒性。"},
        {"name": "炼器术", "function": "打造兵刃、法袍、法宝", "ranks": ["器徒", "器师", "炼器大师", "炼器宗师"], "products": ["飞剑", "法袍", "储物袋"], "note": "高阶法宝可生“器灵”。"},
        {"name": "符箓术", "function": "快速施法、封印、预警", "ranks": ["符徒", "符师", "符箓大师", "符箓宗师"], "products": ["火球符", "神行符", "金刚符"], "note": "低阶修士常用斗法手段。"},
        {"name": "阵法术", "function": "掌控环境、防御、困杀", "ranks": ["阵徒", "阵师", "阵法大师", "阵法宗师"], "products": ["聚灵阵", "护山大阵", "诛仙剑阵"], "note": "高阶阵法可引动天地之力。"}
    ]
    import json
    for a in arts_data:
        a['ranks'] = json.dumps(a['ranks'], ensure_ascii=False)
        a['products'] = json.dumps(a['products'], ensure_ascii=False)
        crud_elements.create_cultivation_art(schema.CultivationArtCreate(**a))
    
    print("--- 元始道藏已录入藏经阁。---")


# 无界法阵 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """ 根路径，确认服务是否正常运转 """
    return {"message": "大道重塑，灵气归元。版本: 3.0.0"}

# 引入版本化的API路由
# 所有具体的端点逻辑现在都在 server/api/api_v1/endpoints 中
app.include_router(api_router, prefix="/api/v1")
