from fastapi import APIRouter, HTTPException
from server.crud import crud_rule

router = APIRouter()

@router.get("/rules/origins", tags=["核心规则"])
def get_core_origins_api():
    """
    从数据库获取所有官方出身背景
    """
    origins, message = crud_rule.get_core_origins()
    if origins is None:
        raise HTTPException(status_code=500, detail=message)
    # Pydantic会自动处理JSON字符串的解析
    return origins

@router.get("/rules/talents", tags=["核心规则"])
def get_core_talents_api():
    """
    从数据库获取所有官方天赋
    """
    talents, message = crud_rule.get_core_talents()
    if talents is None:
        raise HTTPException(status_code=500, detail=message)
    return talents

@router.get("/rules/spirit-roots", tags=["核心规则"])
def get_core_spirit_roots_api():
    """
    从数据库获取所有官方灵根
    """
    spirit_roots, message = crud_rule.get_core_spirit_roots()
    if spirit_roots is None:
        raise HTTPException(status_code=500, detail=message)
    return spirit_roots