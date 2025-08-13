from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

# --- 密码哈希 ---
# 使用 bcrypt 算法，这是目前非常安全的选择
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT 令牌设置 ---
# !! 警告: 这个密钥在生产环境中必须替换为一个真正的、随机生成的、保密的字符串 !!
# !! 可以通过 `openssl rand -hex 32` 命令生成
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # 令牌有效期

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希密码是否匹配"""
    return pwd_context.verify(plain_password, hashed_password)

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

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from server.crud import crud_user
from server.models import AdminAccount, PlayerAccount

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token") # 沿用凡人的 token URL

# --- 依赖项 ---

async def get_current_admin(token: str = Depends(oauth2_scheme)) -> AdminAccount:
    """
    解析 JWT 令牌，获取当前登录的管理员用户。
    这是给需要管理员权限的接口使用的依赖项。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 注意：这里我们是从 AdminAccount 表中查找用户
    admin = await crud_user.get_admin_by_username(user_name=username)
    if admin is None:
        raise credentials_exception
    return admin

async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> PlayerAccount:
    """
    解析 JWT 令牌，获取当前登录的用户。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 从 PlayerAccount 表中查找用户
    user = await crud_user.get_player_by_username(user_name=username)
    if user is None:
        raise credentials_exception
    return user

async def is_super_admin(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    依赖项：检查当前用户是否为超级管理员。
    如果不是，则抛出 403 Forbidden 错误。
    """
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无上权柄，岂容窥探！非天帝旨意，不得调用。",
        )
    return current_admin

async def can_generate_codes(current_admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    """
    依赖项：检查当前用户是否有权限生成兑换码。
    超级管理员和普通管理员都可以。
    """
    if current_admin.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权柄不足，无法生成信物。",
        )
    return current_admin
