from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from server.schemas.schema import (
    SystemConfigUpdate,
    SystemConfig,
    TurnstileConfigUpdate,
    EmailConfigUpdate,
    RateLimitConfigUpdate,
    AllSecurityConfigResponse,
)
from server.crud import crud_system_config
from server.api.api_v1 import deps
from server.utils.system_config import (
    get_all_configs,
    get_turnstile_config,
    get_email_config,
    get_rate_limit_config,
    set_configs,
)

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


@router.get("/turnstile-config", summary="获取 Turnstile 公开配置")
async def get_public_turnstile_config():
    """
    获取 Turnstile 人机验证的公开配置（是否启用、site_key）。
    这是一个公开接口，用于前端判断是否需要显示人机验证。
    """
    config = await get_turnstile_config()
    return {
        "enabled": config.get("turnstile_enabled", False),
        "site_key": config.get("turnstile_site_key", "") if config.get("turnstile_enabled", False) else "",
    }


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


# ========== 安全配置管理接口 ==========


def _mask_password(password: str | None) -> str | None:
    """密码脱敏"""
    if not password:
        return None
    if len(password) <= 4:
        return "****"
    return password[:2] + "*" * (len(password) - 4) + password[-2:]


@router.get(
    "/admin/security-config",
    summary="获取所有安全配置",
    dependencies=[Depends(deps.get_super_admin_user)],
    response_model=AllSecurityConfigResponse
)
async def get_all_security_config():
    """
    获取所有安全相关配置（Turnstile、邮箱、限流）。
    需要超级管理员权限。
    密码会进行脱敏处理。
    """
    all_config = await get_all_configs()

    # 密码脱敏
    all_config["smtp_password"] = _mask_password(all_config.get("smtp_password"))
    all_config["turnstile_secret_key"] = _mask_password(all_config.get("turnstile_secret_key"))

    return all_config


@router.put(
    "/admin/security-config/turnstile",
    summary="更新 Turnstile 配置",
    dependencies=[Depends(deps.get_super_admin_user)],
)
async def update_turnstile_config(config_in: TurnstileConfigUpdate):
    """
    更新 Cloudflare Turnstile 人机验证配置。
    需要超级管理员权限。
    """
    updates = {}
    if config_in.turnstile_enabled is not None:
        updates["turnstile_enabled"] = config_in.turnstile_enabled
    if config_in.turnstile_site_key is not None:
        updates["turnstile_site_key"] = config_in.turnstile_site_key
    if config_in.turnstile_secret_key is not None:
        updates["turnstile_secret_key"] = config_in.turnstile_secret_key
    if config_in.turnstile_verify_url is not None:
        updates["turnstile_verify_url"] = config_in.turnstile_verify_url

    if updates:
        await set_configs(updates)

    return {"message": "Turnstile 配置已更新", "updated_keys": list(updates.keys())}


@router.put(
    "/admin/security-config/email",
    summary="更新邮箱验证配置",
    dependencies=[Depends(deps.get_super_admin_user)],
)
async def update_email_config(config_in: EmailConfigUpdate):
    """
    更新邮箱验证相关配置。
    需要超级管理员权限。
    """
    updates = {}
    if config_in.email_verification_enabled is not None:
        updates["email_verification_enabled"] = config_in.email_verification_enabled
    if config_in.smtp_host is not None:
        updates["smtp_host"] = config_in.smtp_host
    if config_in.smtp_port is not None:
        updates["smtp_port"] = config_in.smtp_port
    if config_in.smtp_user is not None:
        updates["smtp_user"] = config_in.smtp_user
    if config_in.smtp_password is not None:
        updates["smtp_password"] = config_in.smtp_password
    if config_in.smtp_from_email is not None:
        updates["smtp_from_email"] = config_in.smtp_from_email
    if config_in.smtp_from_name is not None:
        updates["smtp_from_name"] = config_in.smtp_from_name
    if config_in.email_code_expire_minutes is not None:
        updates["email_code_expire_minutes"] = config_in.email_code_expire_minutes

    if updates:
        try:
            await set_configs(updates)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"保存邮箱配置失败: {exc}")

    return {"message": "邮箱配置已更新", "updated_keys": list(updates.keys())}


@router.put(
    "/admin/security-config/rate-limit",
    summary="更新限流配置",
    dependencies=[Depends(deps.get_super_admin_user)],
)
async def update_rate_limit_config(config_in: RateLimitConfigUpdate):
    """
    更新 IP 限流相关配置。
    需要超级管理员权限。
    """
    updates = {}
    if config_in.register_rate_limit_enabled is not None:
        updates["register_rate_limit_enabled"] = config_in.register_rate_limit_enabled
    if config_in.register_rate_limit_max is not None:
        if config_in.register_rate_limit_max < 1:
            raise HTTPException(status_code=400, detail="限流次数不能小于1")
        updates["register_rate_limit_max"] = config_in.register_rate_limit_max
    if config_in.register_rate_limit_window is not None:
        if config_in.register_rate_limit_window < 60:
            raise HTTPException(status_code=400, detail="限流窗口不能小于60秒")
        updates["register_rate_limit_window"] = config_in.register_rate_limit_window

    if updates:
        await set_configs(updates)

    return {"message": "限流配置已更新", "updated_keys": list(updates.keys())}


@router.post(
    "/admin/test-smtp",
    summary="测试SMTP连接",
    dependencies=[Depends(deps.get_super_admin_user)],
)
async def test_smtp_connection():
    """
    测试SMTP邮箱连接是否正常。
    需要超级管理员权限。
    """
    import socket
    import smtplib
    import ssl

    config = await get_email_config()

    smtp_host = config["smtp_host"]
    smtp_port = int(config["smtp_port"])
    smtp_user = config["smtp_user"]
    smtp_password = config["smtp_password"]

    if not smtp_user or not smtp_password:
        return {"success": False, "error": "SMTP用户名或密码未配置"}

    results = {
        "host": smtp_host,
        "port": smtp_port,
        "user": smtp_user,
        "tests": []
    }

    # 1. 测试DNS解析
    try:
        ip = socket.gethostbyname(smtp_host)
        results["tests"].append({"name": "DNS解析", "success": True, "detail": f"解析到IP: {ip}"})
    except socket.gaierror as e:
        results["tests"].append({"name": "DNS解析", "success": False, "detail": str(e)})
        results["success"] = False
        results["error"] = "DNS解析失败"
        return results

    # 2. 测试端口连通性
    try:
        sock = socket.create_connection((smtp_host, smtp_port), timeout=10)
        sock.close()
        results["tests"].append({"name": "端口连通", "success": True, "detail": f"端口 {smtp_port} 可连接"})
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        results["tests"].append({"name": "端口连通", "success": False, "detail": str(e)})
        results["success"] = False
        results["error"] = f"端口 {smtp_port} 无法连接，可能被防火墙拦截"
        return results

    # 3. 测试SMTP连接和认证
    try:
        if smtp_port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=30) as server:
                server.login(smtp_user, smtp_password)
                results["tests"].append({"name": "SMTP认证", "success": True, "detail": "SSL连接和登录成功"})
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.ehlo()
                if smtp_port == 587:
                    server.starttls()
                    server.ehlo()
                server.login(smtp_user, smtp_password)
                results["tests"].append({"name": "SMTP认证", "success": True, "detail": "STARTTLS连接和登录成功"})

        results["success"] = True
        results["error"] = None
    except smtplib.SMTPAuthenticationError as e:
        results["tests"].append({"name": "SMTP认证", "success": False, "detail": f"认证失败: {e}"})
        results["success"] = False
        results["error"] = "SMTP认证失败，请检查用户名和授权码"
    except Exception as e:
        results["tests"].append({"name": "SMTP认证", "success": False, "detail": f"{type(e).__name__}: {e}"})
        results["success"] = False
        results["error"] = f"SMTP连接失败: {type(e).__name__}"

    return results
