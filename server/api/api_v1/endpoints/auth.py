from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from .... import auth, database
from ....crud import crud_user
from ....schemas import schema

router = APIRouter()

@router.post("/register", response_model=schema.User, tags=["认证"])
def register_user(user: schema.UserCreate):
    """
    接引新道友（注册），第一位注册者将成为超级管理员。
    """
    db_user = crud_user.get_user_by_username(user_name=user.user_name)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此道号已被他人占用，请另择佳名。",
        )
    new_user, message = crud_user.create_user(user=user)
    if not new_user:
        raise HTTPException(status_code=500, detail=message)
    return new_user

@router.post("/token", response_model=schema.Token, tags=["认证"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    勘合令牌（登录），获取访问令牌。
    """
    user = crud_user.get_user_by_username(user_name=form_data.username)
    if not user or not auth.verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="道号或凭证不符，无法勘合。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(
        data={"sub": user['user_name'], "role": user['role']}
    )
    return {"access_token": access_token, "token_type": "bearer"}