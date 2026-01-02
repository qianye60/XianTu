import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from tortoise.expressions import Q

from server.api.api_v1 import deps
from server.models import WorkshopItem, PlayerAccount
from server.schemas import schema

router = APIRouter()

ALLOWED_ITEM_TYPES = {"settings", "prompts", "saves", "start_config"}


def _normalize_tags(tags: List[str]) -> List[str]:
    normalized: List[str] = []
    seen = set()
    for raw in tags or []:
        if not isinstance(raw, str):
            continue
        t = raw.strip()
        if not t:
            continue
        if len(t) > 24:
            t = t[:24]
        if t in seen:
            continue
        seen.add(t)
        normalized.append(t)
        if len(normalized) >= 12:
            break
    return normalized


def _to_out(item: WorkshopItem, author_name: str) -> schema.WorkshopItemOut:
    return schema.WorkshopItemOut(
        id=item.id,
        type=item.type,
        title=item.title,
        description=item.description,
        tags=item.tags or [],
        game_version=item.game_version,
        data_version=item.data_version,
        author_id=item.author_id,
        author_name=author_name,
        downloads=item.downloads,
        likes=item.likes,
        is_public=item.is_public,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/items", response_model=schema.WorkshopItemsResponse, tags=["创意工坊"])
async def list_workshop_items(
    item_type: Optional[str] = Query(default=None, alias="type"),
    q: Optional[str] = Query(default=None, description="搜索标题/作者/说明"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    qs = WorkshopItem.filter(is_deleted=False, is_public=True).prefetch_related("author")

    if item_type:
        if item_type not in ALLOWED_ITEM_TYPES:
            raise HTTPException(status_code=400, detail=f"不支持的内容类型: {item_type}")
        qs = qs.filter(type=item_type)

    if q:
        keyword = q.strip()
        if keyword:
            qs = qs.filter(
                Q(title__icontains=keyword)
                | Q(description__icontains=keyword)
                | Q(author__user_name__icontains=keyword)
            )

    total = await qs.count()
    offset = (page - 1) * page_size
    rows = await qs.order_by("-created_at").offset(offset).limit(page_size)

    items = [_to_out(row, row.author.user_name if row.author else "未知") for row in rows]
    return schema.WorkshopItemsResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/items/{item_id}", response_model=schema.WorkshopItemOut, tags=["创意工坊"])
async def get_workshop_item(item_id: int):
    item = await WorkshopItem.get_or_none(id=item_id, is_deleted=False, is_public=True).prefetch_related("author")
    if not item:
        raise HTTPException(status_code=404, detail="工坊内容不存在")
    return _to_out(item, item.author.user_name if item.author else "未知")


@router.post("/items", response_model=schema.WorkshopItemOut, tags=["创意工坊"])
async def create_workshop_item(
    item_in: schema.WorkshopItemCreate,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")

    if item_in.type not in ALLOWED_ITEM_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的内容类型: {item_in.type}")

    title = (item_in.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="标题不能为空")
    if len(title) > 120:
        raise HTTPException(status_code=400, detail="标题过长")

    description = (item_in.description or "").strip() or None
    if description and len(description) > 2000:
        raise HTTPException(status_code=400, detail="说明过长")

    tags = _normalize_tags(item_in.tags)

    # 基础结构校验（后端不信任前端）
    payload = item_in.payload
    if item_in.type == "saves":
        if not isinstance(payload, dict) or payload.get("type") != "saves" or not isinstance(payload.get("saves"), list):
            raise HTTPException(status_code=400, detail="单机存档 payload 格式不正确（需要 type=saves 且包含 saves 数组）")
    elif item_in.type == "settings":
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="设置 payload 必须是对象")
        # 推荐格式：{ settings: {...}, exportInfo?: {...} }
        if "settings" in payload and not isinstance(payload.get("settings"), dict):
            raise HTTPException(status_code=400, detail="设置 payload.settings 必须是对象")
    elif item_in.type == "prompts":
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="提示词 payload 必须是对象")
        # 轻量校验：值应是字符串（忽略非法项，但整体必须是对象）
        bad_values = [k for k, v in payload.items() if not isinstance(v, str)]
        if bad_values and len(bad_values) > 0:
            raise HTTPException(status_code=400, detail="提示词 payload 值必须是字符串（key->string）")

    try:
        payload_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        raise HTTPException(status_code=400, detail="payload 不是可序列化的 JSON")

    # 允许较大的存档/提示词包，但做一个上限避免滥用
    if len(payload_text.encode("utf-8")) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="内容过大（>10MB），请精简后再上传")

    item = await WorkshopItem.create(
        type=item_in.type,
        title=title,
        description=description,
        tags=tags,
        payload=payload,
        game_version=item_in.game_version,
        data_version=item_in.data_version,
        author=current_user,
        is_public=True,
        is_deleted=False,
    )
    await item.fetch_related("author")
    return _to_out(item, current_user.user_name)


@router.post("/items/{item_id}/download", response_model=schema.WorkshopItemDownloadResponse, tags=["创意工坊"])
async def download_workshop_item(item_id: int):
    item = await WorkshopItem.get_or_none(id=item_id, is_deleted=False, is_public=True).prefetch_related("author")
    if not item:
        raise HTTPException(status_code=404, detail="工坊内容不存在")

    item.downloads += 1
    await item.save()

    return schema.WorkshopItemDownloadResponse(
        item=_to_out(item, item.author.user_name if item.author else "未知"),
        payload=item.payload,
    )


@router.delete("/items/{item_id}", tags=["创意工坊"])
async def delete_workshop_item(
    item_id: int,
    current_user: PlayerAccount = Depends(deps.get_current_active_user),
):
    item = await WorkshopItem.get_or_none(id=item_id, is_deleted=False).prefetch_related("author")
    if not item:
        raise HTTPException(status_code=404, detail="工坊内容不存在")
    if item.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此内容")

    item.is_deleted = True
    await item.save()
    return {"message": "已删除"}
