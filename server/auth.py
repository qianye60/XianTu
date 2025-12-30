"""
兼容层：历史上部分代码仍从 `server.auth` 导入安全相关函数。

实际实现统一在 `server.core.security`，并且密钥通过环境变量配置，避免在仓库中硬编码。
"""

from server.core.security import (  # noqa: F401
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
