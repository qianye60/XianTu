from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `system_config` (
    `key` VARCHAR(100) NOT NULL PRIMARY KEY COMMENT '配置键',
    `value` JSON NOT NULL COMMENT '配置值'
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `system_config`;"""
