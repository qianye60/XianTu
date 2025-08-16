from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_game_states` ADD `spirit_sense` INT NOT NULL COMMENT '当前神识值' DEFAULT 100;
        ALTER TABLE `character_game_states` ADD `spirit_recovery_rate` DOUBLE NOT NULL COMMENT '神识恢复速度倍率' DEFAULT 1;
        ALTER TABLE `character_game_states` ADD `spiritual_recovery_rate` DOUBLE NOT NULL COMMENT '灵气恢复速度倍率' DEFAULT 1;
        ALTER TABLE `character_game_states` ADD `max_spirit_sense` INT NOT NULL COMMENT '神识上限' DEFAULT 100;
        ALTER TABLE `character_game_states` ADD `current_age` INT NOT NULL COMMENT '当前年龄' DEFAULT 16;
        ALTER TABLE `character_game_states` ADD `max_health_points` INT NOT NULL COMMENT '气血上限' DEFAULT 100;
        ALTER TABLE `character_game_states` ADD `health_recovery_rate` DOUBLE NOT NULL COMMENT '气血恢复速度倍率' DEFAULT 1;
        ALTER TABLE `character_game_states` ADD `max_spiritual_power` INT NOT NULL COMMENT '灵气上限' DEFAULT 100;
        ALTER TABLE `character_game_states` ADD `max_lifespan` INT NOT NULL COMMENT '寿命上限' DEFAULT 80;
        ALTER TABLE `character_game_states` MODIFY COLUMN `health_points` INT NOT NULL COMMENT '当前气血值' DEFAULT 100;
        ALTER TABLE `character_game_states` MODIFY COLUMN `spiritual_power` INT NOT NULL COMMENT '当前灵气值' DEFAULT 100;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_game_states` DROP COLUMN `spirit_sense`;
        ALTER TABLE `character_game_states` DROP COLUMN `spirit_recovery_rate`;
        ALTER TABLE `character_game_states` DROP COLUMN `spiritual_recovery_rate`;
        ALTER TABLE `character_game_states` DROP COLUMN `max_spirit_sense`;
        ALTER TABLE `character_game_states` DROP COLUMN `current_age`;
        ALTER TABLE `character_game_states` DROP COLUMN `max_health_points`;
        ALTER TABLE `character_game_states` DROP COLUMN `health_recovery_rate`;
        ALTER TABLE `character_game_states` DROP COLUMN `max_spiritual_power`;
        ALTER TABLE `character_game_states` DROP COLUMN `max_lifespan`;
        ALTER TABLE `character_game_states` MODIFY COLUMN `health_points` INT NOT NULL COMMENT '当前生命值' DEFAULT 100;
        ALTER TABLE `character_game_states` MODIFY COLUMN `spiritual_power` INT NOT NULL COMMENT '当前灵力' DEFAULT 100;"""
