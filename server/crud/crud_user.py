from typing import Optional
from server import auth
from server.schemas import schema
from server.models import PlayerAccount, AdminAccount

from server.core import security
# --- 修者 (Player) 相关 ---

async def get_player_by_username(user_name: str):
    """根据道号查找一位修者。"""
    return await PlayerAccount.get_or_none(user_name=user_name)

async def get_player_by_id(player_id: int):
    """根据ID查找一位修者。"""
    return await PlayerAccount.get_or_none(id=player_id)

async def get_all_players():
    """获取所有修者列表。"""
    return await PlayerAccount.all()

async def update_player(player_id: int, player_data: schema.PlayerAccountUpdate):
    """更新修者信息。"""
    player = await PlayerAccount.get_or_none(id=player_id)
    if not player:
        return None
    
    update_data = {}
    if player_data.user_name is not None:
        update_data["user_name"] = player_data.user_name
    if player_data.password is not None:
        update_data["password"] = auth.get_password_hash(player_data.password)
    
    if update_data:
        await PlayerAccount.filter(id=player_id).update(**update_data)
        # 重新获取更新后的数据
        player = await PlayerAccount.get(id=player_id)
    
    return player

async def delete_player(player_id: int):
    """删除修者账号。"""
    player = await PlayerAccount.get_or_none(id=player_id)
    if player:
        await player.delete()
        return True
    return False

async def change_password(player_id: int, new_password: str):
    """修改修者密码。"""
    try:
        hashed_password = auth.get_password_hash(new_password)
        await PlayerAccount.filter(id=player_id).update(password=hashed_password)
        return True
    except Exception as e:
        print(f"!!! 修改密码失败: {e}")
        return False

async def authenticate_admin(user_name: str, password: str) -> Optional[AdminAccount]:
    """
    验证管理员凭证
    """
    admin = await get_admin_by_username(user_name)
    if not admin:
        return None
    if not security.verify_password(password, admin.password):
        return None
    return admin

async def authenticate_player(user_name: str, password: str):
    """验证修者的道号与凭证。"""
    player = await get_player_by_username(user_name)
    if not player:
        return None
    if not auth.verify_password(password, player.password):
        return None
    return player

async def create_player(player_data: schema.PlayerAccountCreate):
    """接引新修者。"""
    existing_player = await get_player_by_username(player_data.user_name)
    if existing_player:
        return None, "此道号已被他人占用，请另择佳名。"

    hashed_password = auth.get_password_hash(player_data.password)
    
    try:
        new_player = await PlayerAccount.create(
            user_name=player_data.user_name,
            password=hashed_password,
        )
        return {"id": new_player.id, "user_name": new_player.user_name}, "道友接引成功！"
    except Exception as e:
        print(f"!!! 创建修者账号失败: {e}")
        return None, f"未知错误: {e}"

# --- 仙官 (Admin) 相关 ---

async def ensure_admin_account_exists():
    """
    确保天帝（默认管理员）账号存在。
    """
    admin_user = await AdminAccount.get_or_none(user_name="admin")
    if not admin_user:
        print("--- 未发现天帝账号，正在册封... ---")
        hashed_password = auth.get_password_hash("admin") # 默认密码为 admin
        await AdminAccount.create(
            user_name="admin",
            password=hashed_password,
            role="super_admin" # 初始账号为超级管理员
        )
        print("--- 天帝册封完毕。默认道号：admin, 凭证：admin ---")
        print("--- !!! 请尽快登录后台 /admin 修改初始凭证 !!! ---")


# --- 认证相关 ---

async def authenticate_player(user_name: str, password: str) -> Optional[PlayerAccount]:
    """
    验证玩家凭证
    :param user_name: 玩家道号
    :param password: 玩家提供的明文密码
    :return: 如果验证成功，返回 PlayerAccount 对象，否则返回 None
    """
    player = await get_player_by_username(user_name)
    if not player:
        return None
    if not security.verify_password(password, player.password):
        return None
    return player

async def get_admin_by_username(user_name: str) -> Optional[AdminAccount]:
    """
    根据道号查询仙官
    """
    return await AdminAccount.get_or_none(user_name=user_name)
