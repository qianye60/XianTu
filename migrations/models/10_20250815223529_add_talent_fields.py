from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `core_talents` ADD `max_uses` INT NOT NULL COMMENT '最大使用次数' DEFAULT 1;
        ALTER TABLE `core_talents` ADD `stackable` BOOL NOT NULL COMMENT '是否可叠加' DEFAULT 0;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `core_talents` DROP COLUMN `max_uses`;
        ALTER TABLE `core_talents` DROP COLUMN `stackable`;"""
