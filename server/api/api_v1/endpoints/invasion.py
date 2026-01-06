from __future__ import annotations

from fastapi import APIRouter, Depends

from server.api.api_v1 import deps
from server.models import InvasionReport, PlayerAccount
from server.schemas import schema

router = APIRouter()


@router.get("/reports/me", response_model=list[schema.InvasionReportOut])
async def my_invasion_reports(current_user: PlayerAccount = Depends(deps.get_current_active_user)):
    reports = await InvasionReport.filter(victim_id=current_user.id).order_by("-created_at").limit(50)
    return [
        schema.InvasionReportOut(
            id=r.id,
            world_instance_id=r.world_id,
            created_at=r.created_at,
            unread=r.unread,
            summary=r.summary,
        )
        for r in reports
    ]

