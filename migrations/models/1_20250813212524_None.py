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
CREATE TABLE IF NOT EXISTS `core_origins` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `attribute_modifiers` JSON
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
    `effects` LONGTEXT
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `cultivation_arts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `function` LONGTEXT,
    `ranks` JSON,
    `products` JSON,
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
CREATE TABLE IF NOT EXISTS `player_accounts` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL UNIQUE COMMENT '玩家道号',
    `password` VARCHAR(255) NOT NULL COMMENT '哈希后的凭证',
    `created_at` DATETIME(6) NOT NULL COMMENT '创角时间' DEFAULT CURRENT_TIMESTAMP(6)
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
    `order` INT NOT NULL UNIQUE
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
    `used_by_id` INT,
    CONSTRAINT `fk_redempti_player_a_53d24d9b` FOREIGN KEY (`used_by_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE
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
