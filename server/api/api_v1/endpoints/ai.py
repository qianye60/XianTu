from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict
from tortoise.transactions import in_transaction

from server.api.api_v1 import deps
from server import models
from server.schemas import schema
from server.crud import crud_redemption, crud_world, crud_origins, crud_spirit_roots, crud_talents
import logging

router = APIRouter()

class AIGenerateRequest(BaseModel):
    prompt: str

class AISaveRequest(BaseModel):
    code: str
    type: str
    content: Dict[str, Any]

@router.post("/generate")
async def generate_ai_content(request: AIGenerateRequest):
    """
    AI (Claude) content generation endpoint.
    This is a placeholder and needs to be connected to a real AI model.
    """
    logging.info(f"Received AI generation request with prompt: {request.prompt[:100]}...")
    # Here you would call your AI model (e.g., Anthropic's Claude API)
    # For now, we'll return a mock response.
    mock_response = [
        {
            "name": "天命主角",
            "description": "你出生时天降异象，紫气东来三万里，被认为是天命所归之人。你的修行之路将一帆风顺，奇遇连连。",
            "attributeModifiers": { "LUK": 5, "CHR": 3, "STR": 1 }
        },
        {
            "name": "凡尘孤儿",
            "description": "你只是一个普通的孤儿，父母不详，被一个好心的老乞丐收养。你的童年充满了艰辛，但也磨练了你坚韧不拔的意志。",
            "attributeModifiers": { "CON": 3, "WILL": 4, "INT": 2 }
        },
        {
            "name": "魔门弃子",
            "description": "你曾是魔门最有天赋的弟子，但因修炼禁忌功法而走火入魔，被师门追杀。你在生死边缘挣扎，心中充满了对力量的渴望和对命运的愤恨。",
            "attributeModifiers": { "STR": 4, "DEX": 3, "SPI": -2 }
        }
    ]

    import json
    return json.dumps(mock_response)

@router.post("/save")
async def save_ai_content(
    request: AISaveRequest,
    current_user: models.PlayerAccount = Depends(deps.get_current_user)
):
    """
    Save AI-generated content to database and consume redemption code within a transaction.
    """
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="仙缘信物不可为空！")
        
    try:
        async with in_transaction():
            # 1. 验证兑换码
            code_obj, message = await crud_redemption.get_code_by_string(code_str=request.code)
            if not code_obj:
                raise HTTPException(status_code=400, detail="仙缘信物不存在！")
            
            if code_obj.times_used >= code_obj.max_uses:
                raise HTTPException(status_code=400, detail="仙缘信物已被使用！")

            # 2. 保存AI生成的内容
            content_type = request.type
            content_data = request.content
            
            if 'id' in content_data:
                del content_data['id']
            
            saved_item = None
            
            if content_type == 'world':
                from server.models import AdminAccount
                admin = await AdminAccount.first()
                if not admin:
                    raise Exception("无法创建世界：系统中没有管理员账户。")
                content_data['creator_id'] = admin.id
                world_create = schema.WorldCreate(**content_data)
                saved_item, msg = await crud_world.create_world(world=world_create)
                if not saved_item:
                    raise Exception(f"创建世界失败: {msg}")
            
            elif content_type == 'origin':
                origin_create = schema.OriginCreate(**content_data)
                saved_item = await crud_origins.create_origin(origin=origin_create)
            
            elif content_type == 'spirit_root':
                spirit_root_create = schema.SpiritRootCreate(**content_data)
                saved_item = await crud_spirit_roots.create_spirit_root(spirit_root=spirit_root_create)
            
            elif content_type == 'talent':
                talent_create = schema.TalentCreate(**content_data)
                saved_item = await crud_talents.create_talent(talent=talent_create)
            
            else:
                raise HTTPException(status_code=400, detail=f"未知的内容类型: {content_type}")

            if not saved_item:
                raise Exception("保存内容失败，未能创建记录")

            # 3. 在所有内容成功保存后，才消耗兑换码
            result, use_message = await crud_redemption.use_code(code_str=request.code, user_id=current_user.id)
            if not result:
                # 理论上，由于事务的存在，这里不应该失败，但作为保险
                raise Exception(use_message)

            logging.info(f"兑换码 {request.code} 已被使用，当前使用次数: {result.times_used}/{result.max_uses}")

            return {
                "message": "内容已成功记录于云端",
                "type": content_type,
                "saved_id": saved_item.id,
                "code_used": f"{result.times_used}/{result.max_uses}"
            }
            
    except HTTPException:
        # Re-raise HTTPException to show specific error messages to the user
        raise
    except Exception as e:
        # Catch all other exceptions, log them, and return a generic 500 error
        logging.error(f"保存AI内容时发生事务错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误，操作已回滚。")
