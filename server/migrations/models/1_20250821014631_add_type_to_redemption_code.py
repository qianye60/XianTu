from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `redemption_codes` ADD `type` VARCHAR(50) COMMENT '兑换码类型 (world, talent, etc.)';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `redemption_codes` DROP COLUMN `type`;"""
