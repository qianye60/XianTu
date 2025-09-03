from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from ....schemas.schema import SystemConfigUpdate, SystemConfig
from ....crud import crud_system_config
from .. import deps
from .... import models

router = APIRouter()

APP_VERSION_KEY = "APP_VERSION"

@router.get("/version", summary="获取应用版本号")
async def get_app_version():
    """
    获取当前的应用版本号。
    这是一个公开接口。
    """
    config_data = await crud_system_config.get_config(APP_VERSION_KEY)
    if config_data is None:
        # 如果数据库中没有设置，返回一个默认值
        return {"version": "0.0.0"}
    
    # 从JSON对象中提取版本号
    if isinstance(config_data, dict) and "version" in config_data:
        return {"version": config_data["version"]}
    else:
        # 兼容性处理：如果是旧格式的数据
        return {"version": str(config_data)}

@router.put(
    "/admin/version",
    summary="更新应用版本号",
    dependencies=[Depends(deps.get_super_admin_user)],
    response_model=SystemConfig
)
async def set_app_version(
    version_in: SystemConfigUpdate
) -> SystemConfig:
    """
    更新应用的版本号。
    需要超级管理员权限。
    """
    if not isinstance(version_in.value, str):
        raise HTTPException(status_code=400, detail="版本号必须是字符串")
        
    config = await crud_system_config.update_config(APP_VERSION_KEY, {"version": version_in.value})
    return config