from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `core_talents` DROP COLUMN `stackable`;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `core_talents` ADD `stackable` BOOL NOT NULL COMMENT '是否可叠加' DEFAULT 0;"""
