from typing import Any
from ..models import SystemConfig

async def get_config(key: str) -> Any:
    """
    通过键获取系统配置项。
    如果配置项不存在，则返回 None。
    """
    config = await SystemConfig.get_or_none(key=key)
    return config.value if config else None

async def update_config(key: str, value: Any) -> SystemConfig:
    """
    创建或更新一个系统配置项。
    """
    config, _ = await SystemConfig.update_or_create(
        key=key,
        defaults={"value": value}
    )
    return config