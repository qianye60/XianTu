from fastapi import APIRouter
from server.models import AdminAccount

router = APIRouter(prefix="/admin", tags=["后台管理"])

# 注意：兑换码管理功能已移至 redemption.py 以避免重复路由
# 用户权限管理通过 AdminAccount 的 `role` 字段进行控制
