from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `admin_accounts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL UNIQUE COMMENT '仙官道号',
    `password` VARCHAR(255) NOT NULL COMMENT '哈希后的凭证',
    `role` VARCHAR(20) NOT NULL COMMENT '仙官品阶 (admin, super_admin)' DEFAULT 'admin',
    `redemption_code_limit` INT NOT NULL COMMENT '可创建兑换码上限 (-1为无限制)' DEFAULT -1,
    `created_at` DATETIME(6) NOT NULL COMMENT '授印时间' DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `cultivation_arts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `function` LONGTEXT,
    `level_system` JSON,
    `experience_curve` JSON,
    `success_formula` JSON,
    `resource_cost` JSON,
    `recipes` JSON,
    `note` LONGTEXT
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `cultivation_paths` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `concept` LONGTEXT,
    `description` LONGTEXT
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `organizations` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `type` VARCHAR(50)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_origins` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `attribute_modifiers` JSON,
    `starting_resources` JSON,
    `rarity` INT NOT NULL DEFAULT 3
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `player_accounts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL UNIQUE COMMENT '玩家道号',
    `password` VARCHAR(255) NOT NULL COMMENT '哈希后的凭证',
    `created_at` DATETIME(6) NOT NULL COMMENT '创角时间' DEFAULT CURRENT_TIMESTAMP(6),
    `is_banned` BOOL NOT NULL COMMENT '是否被封禁' DEFAULT 0
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `professions` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `realms` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `title` VARCHAR(50),
    `milestone` LONGTEXT,
    `lifespan` VARCHAR(50),
    `description` LONGTEXT,
    `order` INT NOT NULL UNIQUE,
    `breakthrough_exp_required` INT NOT NULL DEFAULT 1000,
    `breakthrough_base_chance` DOUBLE NOT NULL DEFAULT 0.5,
    `sub_stages` INT NOT NULL DEFAULT 4,
    `sub_stage_exp` INT NOT NULL DEFAULT 250,
    `attribute_growth` JSON,
    `unlocked_abilities` JSON
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `redemption_codes` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `type` VARCHAR(50) NOT NULL,
    `payload` JSON,
    `max_uses` INT NOT NULL DEFAULT 1,
    `times_used` INT NOT NULL DEFAULT 0,
    `expires_at` DATETIME(6),
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `creator_id` INT COMMENT '创建此码的仙官',
    `used_by_id` INT,
    CONSTRAINT `fk_redempti_admin_ac_f5c131ab` FOREIGN KEY (`creator_id`) REFERENCES `admin_accounts` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_redempti_player_a_53d24d9b` FOREIGN KEY (`used_by_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_spirit_roots` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `base_multiplier` DOUBLE NOT NULL
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_talents` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `effects` JSON,
    `rarity` INT NOT NULL DEFAULT 2,
    `stackable` BOOL NOT NULL DEFAULT 0,
    `requirements` JSON
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `weapon_types` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50)
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `worlds` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '世界名称',
    `description` LONGTEXT COMMENT '世界描述',
    `type` VARCHAR(50) COMMENT '世界类型',
    `features` JSON COMMENT '世界特色',
    `cultivation_bonus` VARCHAR(255) COMMENT '修行加成',
    `era` VARCHAR(50) COMMENT '时代背景',
    `core_rules` JSON COMMENT '核心规则设定',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `creator_id` INT NOT NULL COMMENT '创世仙官',
    CONSTRAINT `fk_worlds_admin_ac_ee47f807` FOREIGN KEY (`creator_id`) REFERENCES `admin_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `characters` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `character_name` VARCHAR(100) NOT NULL COMMENT '角色姓名',
    `character_data` JSON NOT NULL COMMENT '角色核心数据',
    `is_active` BOOL NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `player_id` INT NOT NULL,
    `world_id` INT NOT NULL,
    CONSTRAINT `fk_characte_player_a_1cb8db69` FOREIGN KEY (`player_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_worlds_df22ca5b` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE CASCADE
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
