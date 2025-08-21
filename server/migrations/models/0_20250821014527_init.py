from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `admin_accounts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL UNIQUE COMMENT '仙官道号',
    `password` VARCHAR(255) NOT NULL COMMENT '哈希后的凭证',
    `role` VARCHAR(20) NOT NULL COMMENT '仙官品阶 (admin, super_admin)' DEFAULT 'admin',
    `created_at` DATETIME(6) NOT NULL COMMENT '授印时间' DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `game_saves` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `save_name` VARCHAR(100) NOT NULL COMMENT '存档名' DEFAULT '云端存档',
    `saved_at` DATETIME(6) NOT NULL COMMENT '保存时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `game_time` VARCHAR(100) COMMENT '游戏内时间',
    `world_map` JSON COMMENT '世界地图数据',
    `save_data` JSON COMMENT '核心存档数据 (玩家状态、背包、NPC关系等)',
    `last_sync` DATETIME(6) NOT NULL COMMENT '最后同步时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `version` INT NOT NULL COMMENT '数据版本号，用于冲突检测' DEFAULT 1,
    `is_dirty` BOOL NOT NULL COMMENT '是否有未同步到客户端的数据' DEFAULT 0
) CHARACTER SET utf8mb4 COMMENT='角色游戏存档 (动态数据)';
CREATE TABLE IF NOT EXISTS `core_origins` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL COMMENT '出身名称',
    `description` LONGTEXT COMMENT '描述',
    `attribute_modifiers` JSON COMMENT '属性修正',
    `rarity` INT NOT NULL COMMENT '稀有度' DEFAULT 3,
    `talent_cost` INT NOT NULL COMMENT '天赋点花费' DEFAULT 0,
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `player_accounts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL UNIQUE COMMENT '玩家道号',
    `password` VARCHAR(255) NOT NULL COMMENT '哈希后的凭证',
    `created_at` DATETIME(6) NOT NULL COMMENT '创角时间' DEFAULT CURRENT_TIMESTAMP(6),
    `is_banned` BOOL NOT NULL COMMENT '是否被封禁' DEFAULT 0
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `character_bases` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `char_id` VARCHAR(100) NOT NULL UNIQUE COMMENT '角色唯一ID, e.g., char_1001',
    `base_info` JSON NOT NULL COMMENT '角色基础信息, 对应前端 CharacterBaseInfo',
    `is_deleted` BOOL NOT NULL COMMENT '是否已删除' DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `player_id` INT NOT NULL,
    `game_save_id` INT NOT NULL UNIQUE,
    CONSTRAINT `fk_characte_player_a_27a3414c` FOREIGN KEY (`player_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_game_sav_6e4d259d` FOREIGN KEY (`game_save_id`) REFERENCES `game_saves` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COMMENT='角色基础信息 (静态数据)';
CREATE TABLE IF NOT EXISTS `player_ban_records` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `reason` LONGTEXT NOT NULL COMMENT '封号原因',
    `ban_start_time` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ban_end_time` DATETIME(6),
    `is_active` BOOL NOT NULL DEFAULT 1,
    `admin_id` INT,
    `player_id` INT NOT NULL,
    CONSTRAINT `fk_player_b_admin_ac_378aff0c` FOREIGN KEY (`admin_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_player_b_player_a_13b5671a` FOREIGN KEY (`player_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `redemption_codes` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `type` VARCHAR(50) COMMENT '兑换码类型 (world, talent, etc.)',
    `payload` JSON,
    `max_uses` INT NOT NULL DEFAULT 1,
    `times_used` INT NOT NULL DEFAULT 0,
    `expires_at` DATETIME(6),
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    `creator_id` INT,
    CONSTRAINT `fk_redempti_admin_ac_f5c131ab` FOREIGN KEY (`creator_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_spirit_roots` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT COMMENT '描述',
    `base_multiplier` DOUBLE NOT NULL COMMENT '修炼速度基础倍率',
    `talent_cost` INT NOT NULL COMMENT '天赋点花费' DEFAULT 0,
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `talent_tiers` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL COMMENT '天资等级名称',
    `description` LONGTEXT COMMENT '描述',
    `total_points` INT NOT NULL COMMENT '总可分配点数',
    `rarity` INT NOT NULL COMMENT '稀有度，数值越小越稀有',
    `color` VARCHAR(20) NOT NULL COMMENT '代表颜色' DEFAULT '#FFFFFF',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_talents` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT COMMENT '描述',
    `effects` JSON COMMENT '具体效果',
    `rarity` INT NOT NULL COMMENT '稀有度' DEFAULT 2,
    `talent_cost` INT NOT NULL COMMENT '天赋点花费' DEFAULT 1,
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    `tier_id` INT COMMENT '所属天资等级',
    CONSTRAINT `fk_core_tal_talent_t_25dd91da` FOREIGN KEY (`tier_id`) REFERENCES `talent_tiers` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `worlds` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '世界名称',
    `description` LONGTEXT COMMENT '世界描述',
    `era` VARCHAR(100) COMMENT '时代背景',
    `core_rules` JSON COMMENT '核心规则',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `creator_id` INT,
    CONSTRAINT `fk_worlds_admin_ac_ee47f807` FOREIGN KEY (`creator_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `npc_characters` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `npc_id` VARCHAR(100) NOT NULL UNIQUE COMMENT 'NPC唯一标识符',
    `name` VARCHAR(100) NOT NULL COMMENT 'NPC名字',
    `base_info_template` JSON NOT NULL COMMENT '角色基础信息模板',
    `save_info_template` JSON NOT NULL COMMENT '角色存档信息模板',
    `ai_behavior_template` JSON NOT NULL COMMENT 'AI行为模板',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `world_id` INT,
    CONSTRAINT `fk_npc_char_worlds_190d58bd` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `aerich` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `version` VARCHAR(255) NOT NULL,
    `app` VARCHAR(100) NOT NULL,
    `content` JSON NOT NULL
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """
