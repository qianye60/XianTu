import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

from tortoise.transactions import atomic
from tortoise.exceptions import DoesNotExist, IntegrityError

from server.models import RedemptionCode, PlayerAccount
from server.schemas.schema import RedemptionCodeCreate

@atomic()
async def create_code(code_data: RedemptionCodeCreate) -> Tuple[Optional[RedemptionCode], str]:
    """
    创生一枚新的仙缘信物，可设定其使用次数。
    """
    try:
        # 检查使用者是否存在
        if code_data.used_by_user_id:
            await PlayerAccount.get(id=code_data.used_by_user_id)

        new_code = await RedemptionCode.create(
            code=code_data.code,
            type=code_data.type,
            payload=code_data.payload,
            max_uses=code_data.max_uses,
            used_by_user_id=code_data.used_by_user_id
        )
        return new_code, "仙缘信物创生成功"
    except IntegrityError:
        return None, f"此信物 ({code_data.code}) 已存在，无法重复创生。"
    except DoesNotExist:
        return None, "指定的用户不存在"
    except Exception as e:
        return None, f"创生仙缘信物失败: {e}"


async def get_code_by_string(code_str: str) -> Tuple[Optional[RedemptionCode], str]:
    """
    根据信物字符串查验其法理。
    """
    try:
        code = await RedemptionCode.get_or_none(code=code_str)
        if not code:
            return None, "未找到此仙缘信物"
        return code, "仙缘信物查验完毕"
    except Exception as e:
        return None, f"查验仙缘信物失败: {e}"


@atomic()
async def use_code(code_str: str, user_id: int) -> Tuple[Optional[RedemptionCode], str]:
    """
    消耗一次仙缘信物，并记录使用者。
    此法门将以原子操作确保次数准确无误，并返回更新后的信物状态。
    """
    try:
        user = await PlayerAccount.get_or_none(id=user_id)
        if not user:
            return None, "天命无此人，无法使用信物"

        code_obj = await RedemptionCode.get_or_none(code=code_str)
        if not code_obj:
            return None, "信物不存在"

        if code_obj.max_uses != -1 and code_obj.times_used >= code_obj.max_uses:
            return None, "仙缘已尽，此信物已无法使用"

        code_obj.times_used += 1
        code_obj.used_at = datetime.utcnow()
        code_obj.used_by = user
        await code_obj.save()

        return code_obj, "仙缘信物使用成功"
    except DoesNotExist:
        return None, "信物或用户不存在"
    except Exception as e:
        return None, f"消耗仙缘信物失败: {e}"

async def get_creation_data_by_code(code: str) -> Optional[Dict[str, Any]]:
    """
    通过兑换码获取角色创建数据
    """
    code_obj, _ = await get_code_by_string(code)

    if not code_obj or not code_obj.payload:
        return None

    payload = code_obj.payload
    creation_data = {}
    
    code_type = code_obj.type
    
    if code_type in ['world_background', 'mixed'] and isinstance(payload, dict):
        if 'origins' in payload:
            creation_data['origins'] = payload['origins']
        if 'world_backgrounds' in payload:
            creation_data['world_backgrounds'] = payload['world_backgrounds']
    
    if code_type in ['spirit_root', 'mixed'] and isinstance(payload, dict):
        if 'spirit_roots' in payload:
            creation_data['spirit_roots'] = payload['spirit_roots']
    
    return creation_data if creation_data else None


async def get_all_codes(skip: int = 0, limit: int = 50) -> List[RedemptionCode]:
    """
    获取所有兑换码（管理员用）
    """
    try:
        return await RedemptionCode.all().order_by('-created_at').offset(skip).limit(limit)
    except Exception:
        return []

@atomic()
async def create_admin_redemption_code(
    code_type: str,
    payload: Dict[str, Any],
    max_uses: int = 1,
) -> Tuple[Optional[RedemptionCode], str]:
    """
    (管理员用) 创建新的兑换码
    """
    try:
        code = str(uuid.uuid4()).replace('-', '').upper()[:12]
        
        new_code = await RedemptionCode.create(
            code=code,
            type=code_type,
            payload=payload,
            max_uses=max_uses
        )
        return new_code, "仙缘信物创生成功"
    except IntegrityError:
        # Retry if the generated code happens to collide, which is extremely unlikely.
        return await create_admin_redemption_code(code_type, payload, max_uses)
    except Exception as e:
        return None, f"创建兑换码失败: {e}"