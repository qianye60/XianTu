from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_bases` ADD `is_active` BOOL NOT NULL COMMENT '是否为当前激活角色' DEFAULT 0;
        ALTER TABLE `character_bases` ADD `is_deleted` BOOL NOT NULL COMMENT '是否已删除' DEFAULT 0;
        ALTER TABLE `character_bases` ADD `last_played` DATETIME(6) COMMENT '最后游戏时间';
        ALTER TABLE `character_bases` ADD `play_time_minutes` INT NOT NULL COMMENT '总游戏时间(分钟)' DEFAULT 0;
        CREATE TABLE IF NOT EXISTS `character_game_states` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `cultivation_progress` DOUBLE NOT NULL COMMENT '当前境界修炼进度 0-100' DEFAULT 0,
    `cultivation_experience` BIGINT NOT NULL COMMENT '总修炼经验' DEFAULT 0,
    `current_location` VARCHAR(100) COMMENT '当前位置',
    `current_scene` VARCHAR(100) COMMENT '当前场景',
    `spiritual_stones` BIGINT NOT NULL COMMENT '灵石' DEFAULT 100,
    `health_points` INT NOT NULL COMMENT '当前生命值' DEFAULT 100,
    `spiritual_power` INT NOT NULL COMMENT '当前灵力' DEFAULT 100,
    `inventory` JSON NOT NULL COMMENT '背包物品',
    `equipped_items` JSON NOT NULL COMMENT '装备物品',
    `learned_skills` JSON NOT NULL COMMENT '已学技能',
    `cultivation_methods` JSON NOT NULL COMMENT '修炼功法',
    `relationships` JSON NOT NULL COMMENT '人物关系',
    `faction_reputation` JSON NOT NULL COMMENT '门派声望',
    `active_quests` JSON NOT NULL COMMENT '进行中任务',
    `completed_quests` JSON NOT NULL COMMENT '已完成任务',
    `achievements` JSON NOT NULL COMMENT '成就列表',
    `last_sync_time` DATETIME(6) NOT NULL COMMENT '最后同步时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `version` INT NOT NULL COMMENT '数据版本号' DEFAULT 1,
    `is_dirty` BOOL NOT NULL COMMENT '是否有未同步数据' DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `current_realm_id` INT,
    `character_id` INT NOT NULL UNIQUE,
    CONSTRAINT `fk_characte_realms_e36cc1bc` FOREIGN KEY (`current_realm_id`) REFERENCES `realms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_characte_dcdf2085` FOREIGN KEY (`character_id`) REFERENCES `character_bases` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COMMENT='角色游戏运行时状态';
        CREATE TABLE IF NOT EXISTS `player_ban_records` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `ban_type` VARCHAR(20) NOT NULL COMMENT '封号类型: temporary, permanent',
    `reason` LONGTEXT NOT NULL COMMENT '封号原因',
    `ban_start_time` DATETIME(6) NOT NULL COMMENT '封号开始时间' DEFAULT CURRENT_TIMESTAMP(6),
    `ban_end_time` DATETIME(6) COMMENT '封号结束时间(永久封为NULL)',
    `is_active` BOOL NOT NULL COMMENT '封号是否生效' DEFAULT 1,
    `appeal_reason` LONGTEXT COMMENT '申诉理由',
    `appeal_time` DATETIME(6) COMMENT '申诉时间',
    `appeal_status` VARCHAR(20) NOT NULL COMMENT '申诉状态: none, pending, approved, rejected' DEFAULT 'none',
    `admin_id` INT,
    `appeal_handler_id` INT,
    `player_id` INT NOT NULL,
    CONSTRAINT `fk_player_b_admin_ac_378aff0c` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_player_b_admin_ac_cc1870f6` FOREIGN KEY (`appeal_handler_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_player_b_player_a_13b5671a` FOREIGN KEY (`player_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COMMENT='玩家封号记录';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `character_bases` DROP COLUMN `is_active`;
        ALTER TABLE `character_bases` DROP COLUMN `is_deleted`;
        ALTER TABLE `character_bases` DROP COLUMN `last_played`;
        ALTER TABLE `character_bases` DROP COLUMN `play_time_minutes`;
        DROP TABLE IF EXISTS `player_ban_records`;
        DROP TABLE IF EXISTS `character_game_states`;"""
