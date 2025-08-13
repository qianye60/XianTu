from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

router = APIRouter()

class AIGenerateRequest(BaseModel):
    prompt: str

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
