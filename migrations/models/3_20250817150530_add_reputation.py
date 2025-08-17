from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_game_states` RENAME COLUMN `health_points` TO `qi_blood`;
        ALTER TABLE `character_game_states` ADD `reputation` INT NOT NULL COMMENT '总声望' DEFAULT 0;
        ALTER TABLE `character_game_states` RENAME COLUMN `max_health_points` TO `max_qi_blood`;
        ALTER TABLE `character_game_states` RENAME COLUMN `health_recovery_rate` TO `qi_blood_recovery_rate`;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_game_states` RENAME COLUMN `qi_blood` TO `health_points`;
        ALTER TABLE `character_game_states` RENAME COLUMN `max_qi_blood` TO `max_health_points`;
        ALTER TABLE `character_game_states` RENAME COLUMN `qi_blood_recovery_rate` TO `health_recovery_rate`;
        ALTER TABLE `character_game_states` DROP COLUMN `reputation`;"""
