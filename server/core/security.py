from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from server.core import config

# --- 密码哈希 ---
# 使用 bcrypt 算法，这是目前非常安全的选择
# Accept multiple legacy schemes to smooth migrations
# New hashes will still be generated with bcrypt, but verification can
# recognize common historical formats to avoid 500s on login.
pwd_context = CryptContext(
    schemes=[
        "bcrypt",          # current default
        "pbkdf2_sha256",  # common in older FastAPI templates
        "sha256_crypt",   # sometimes used historically
    ],
    deprecated="auto",
)

# --- JWT 令牌设置 ---
SECRET_KEY = config.settings.SECRET_KEY
ALGORITHM = config.settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.settings.ACCESS_TOKEN_EXPIRE_MINUTES

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希密码是否匹配。若哈希不可识别，返回 False 而非抛错。"""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        # Stored password isn't a recognized hash (e.g., legacy/plaintext)
        return False
    except Exception:
        # Any other verification error should not 500 the API
        return False

def get_password_hash(password: str) -> str:
    """生成密码的哈希值"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    创建 JWT 访问令牌
    :param data: 需要编码到令牌中的数据 (通常是用户标识)
    :param expires_delta: 令牌的有效期，如果未提供，则使用默认值
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """
    解码 JWT 访问令牌
    :param token: JWT 令牌字符串
    :return: 解码后的载荷数据
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

