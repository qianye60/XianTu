"""
兑换码（仙缘信物） API 端点
用于联机模式中世界背景和灵根出身的兑换码验证
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Any, Dict

from server.api.api_v1 import deps
from server.crud import crud_redemption
from server.models import PlayerAccount, AdminAccount
from server.schemas import schema

router = APIRouter()

@router.post("/validate/{code}", response_model=schema.RedemptionCode, tags=["兑换码"])
async def validate_redemption_code(code: str):
    """
    验证兑换码是否有效，返回其公开信息。
    """
    code_obj, message = await crud_redemption.get_code_by_string(code)

    if not code_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)

    if code_obj.is_used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="此信物已被他人使用，仙缘已尽。")

    if code_obj.is_expired:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="此信物已过时效，仙缘已散。")

    return code_obj

@router.post("/redeem/{code}", response_model=schema.CreationDataResponse, tags=["兑换码"])
async def redeem_code_for_creation_data(
    code: str,
    current_user: PlayerAccount = Depends(deps.get_current_active_user)
):
    """
    使用兑换码获取角色创建数据，此操作会消耗兑换码。
    """
    # use_code 会原子性地处理验证和消耗
    code_obj, message = await crud_redemption.use_code(code, current_user.id)
    if not code_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    # 成功消耗后，提取数据
    creation_data = await crud_redemption.get_creation_data_by_code(code)
    if not creation_data:
        # This case should be rare if the payload was validated on creation
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到兑换码对应的有效创建数据")

    return schema.CreationDataResponse(**creation_data)

# ===============================================
# 管理员接口
# ===============================================

@router.get("/admin/codes", response_model=List[schema.RedemptionCode], tags=["兑换码管理"])
async def list_redemption_codes(
    skip: int = 0,
    limit: int = 50,
    current_admin: AdminAccount = Depends(deps.get_current_active_admin_user)
):
    """
    管理员查看所有兑换码
    """
    codes = await crud_redemption.get_all_codes(skip=skip, limit=limit)
    return codes

@router.post("/admin/codes", response_model=schema.RedemptionCode, tags=["兑换码管理"])
async def create_redemption_code(
    request: schema.RedemptionCodeAdminCreate,
    current_admin: AdminAccount = Depends(deps.get_current_active_admin_user)
):
    """
    管理员创建新的兑换码
    """
    # 为了安全，将创建者信息强制设为当前管理员
    payload = request.payload
    payload['creator'] = current_admin.username
    
    new_code, message = await crud_redemption.create_admin_redemption_code(
        code_type=request.type,
        payload=payload,
        max_uses=request.max_uses
    )

    if not new_code:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)
    
    return new_code

@router.get("/admin/codes/{code_id}", response_model=schema.RedemptionCode, tags=["兑换码管理"])
async def get_redemption_code(
    code_id: int,
    current_admin: AdminAccount = Depends(deps.get_current_active_admin_user)
):
    """
    获取指定兑换码信息
    """
    code_obj = await crud_redemption.get_code_by_id(code_id)
    if not code_obj:
        raise HTTPException(status_code=404, detail="兑换码不存在")
    return code_obj

@router.put("/admin/codes/{code_id}", response_model=schema.RedemptionCode, tags=["兑换码管理"])
async def update_redemption_code(
    code_id: int,
    updates: dict,
    current_admin: AdminAccount = Depends(deps.get_current_active_admin_user)
):
    """
    更新兑换码信息
    """
    code_obj = await crud_redemption.get_code_by_id(code_id)
    if not code_obj:
        raise HTTPException(status_code=404, detail="兑换码不存在")
    
    # 更新允许的字段
    if "code" in updates:
        code_obj.code = updates["code"]
    if "type" in updates:
        code_obj.type = updates["type"]
    if "max_uses" in updates:
        code_obj.max_uses = updates["max_uses"]
    
    await code_obj.save()
    return code_obj

@router.delete("/admin/codes/{code_id}", tags=["兑换码管理"])
async def delete_redemption_code(
    code_id: int,
    current_admin: AdminAccount = Depends(deps.get_current_active_admin_user)
):
    """
    删除兑换码
    """
    code_obj = await crud_redemption.get_code_by_id(code_id)
    if not code_obj:
        raise HTTPException(status_code=404, detail="兑换码不存在")
    
    await code_obj.delete()
    return {"message": "兑换码已删除"}