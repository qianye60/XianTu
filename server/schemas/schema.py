from pydantic import BaseModel

# --- 数据模型 (Pydantic Models) ---

# --- 用户体系 ---
class UserCreate(BaseModel):
    user_name: str
    password: str

class User(BaseModel):
    id: int
    user_name: str
    role: str

# --- 世界体系 ---
class World(BaseModel):
    id: int
    name: str
    type: str | None = None
    description: str | None = None

class WorldCreate(BaseModel):
    name: str
    type: str
    description: str
    author_id: int

# --- 角色/存档体系 ---
class Character(BaseModel):
    id: int
    user_id: int
    world_id: int
    character_name: str

class CharacterCreate(BaseModel):
    user_id: int
    world_id: int
    character_name: str
    character_data: dict

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# --- 通用修仙元素 ---

class RealmBase(BaseModel):
    name: str
    title: str | None = None
    milestone: str | None = None
    lifespan: str | None = None
    description: str | None = None
    order: int # 用于排序

class RealmCreate(RealmBase):
    pass

class Realm(RealmBase):
    id: int
    class Config:
        orm_mode = True

class CultivationPathBase(BaseModel):
    name: str
    concept: str | None = None
    description: str | None = None

class CultivationPathCreate(CultivationPathBase):
    pass

class CultivationPath(CultivationPathBase):
    id: int
    class Config:
        orm_mode = True

class CultivationArtBase(BaseModel):
    name: str
    function: str | None = None
    ranks: str | None = None # 存储为JSON字符串
    products: str | None = None # 存储为JSON字符串
    note: str | None = None

class CultivationArtCreate(CultivationArtBase):
    pass

class CultivationArt(CultivationArtBase):
    id: int
    class Config:
        orm_mode = True