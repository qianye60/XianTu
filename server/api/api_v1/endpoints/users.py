from fastapi import APIRouter, Depends, HTTPException
from server.schemas import schema
from server.crud import crud_user
from server import database

router = APIRouter()

@router.get('/by-username/{username}', response_model=schema.User, tags=["用户"])
def get_user_by_username(username: str):
    """
    根据道号（用户名）查询用户信息。
    """
    db_user = crud_user.get_user_by_username(user_name=username)
    if db_user is None:
        raise HTTPException(status_code=404, detail="未找到此道号的拥有者")
    return db_user