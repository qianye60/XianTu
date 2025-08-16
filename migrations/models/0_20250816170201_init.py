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
    `name` VARCHAR(50) NOT NULL COMMENT '出身名称',
    `description` LONGTEXT COMMENT '出身描述',
    `root_bone_modifier` INT NOT NULL COMMENT '根骨修正' DEFAULT 0,
    `spirituality_modifier` INT NOT NULL COMMENT '灵性修正' DEFAULT 0,
    `comprehension_modifier` INT NOT NULL COMMENT '悟性修正' DEFAULT 0,
    `fortune_modifier` INT NOT NULL COMMENT '福缘修正' DEFAULT 0,
    `charm_modifier` INT NOT NULL COMMENT '魅力修正' DEFAULT 0,
    `temperament_modifier` INT NOT NULL COMMENT '心性修正' DEFAULT 0,
    `special_effects` JSON COMMENT '特殊效果',
    `rarity` INT NOT NULL COMMENT '稀有度' DEFAULT 3,
    `talent_cost` INT NOT NULL COMMENT '天赋点消耗' DEFAULT 0
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
    `creator_id` INT COMMENT '创建此码的仙官',
    `used_by_id` INT,
    CONSTRAINT `fk_redempti_admin_ac_f5c131ab` FOREIGN KEY (`creator_id`) REFERENCES `admin_accounts` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_redempti_player_a_53d24d9b` FOREIGN KEY (`used_by_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_spirit_roots` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `base_multiplier` DOUBLE NOT NULL,
    `talent_cost` INT NOT NULL COMMENT '天赋点消耗' DEFAULT 0
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `core_talents` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` LONGTEXT,
    `effects` JSON,
    `rarity` INT NOT NULL DEFAULT 2,
    `talent_cost` INT NOT NULL COMMENT '天赋点消耗' DEFAULT 1,
    `max_uses` INT NOT NULL COMMENT '最大使用次数' DEFAULT 1
) CHARACTER SET utf8mb4;
CREATE TABLE IF NOT EXISTS `talent_tiers` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL COMMENT '天资等级名称',
    `description` LONGTEXT COMMENT '等级描述',
    `total_points` INT NOT NULL COMMENT '总可分配点数',
    `rarity` INT NOT NULL COMMENT '稀有度，数字越小越稀有',
    `color` VARCHAR(20) NOT NULL COMMENT '显示颜色' DEFAULT 'white'
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
CREATE TABLE IF NOT EXISTS `character_bases` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `character_name` VARCHAR(100) NOT NULL COMMENT '角色名称',
    `root_bone` INT NOT NULL COMMENT '根骨 - 体质根基',
    `spirituality` INT NOT NULL COMMENT '灵性 - 灵气亲和',
    `comprehension` INT NOT NULL COMMENT '悟性 - 理解天赋',
    `fortune` INT NOT NULL COMMENT '福缘 - 机缘造化',
    `charm` INT NOT NULL COMMENT '魅力 - 容貌气质',
    `temperament` INT NOT NULL COMMENT '心性 - 道心坚韧',
    `selected_talents` JSON COMMENT '选择的天赋列表',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `origin_id` INT,
    `player_id` INT NOT NULL,
    `spirit_root_id` INT,
    `talent_tier_id` INT NOT NULL,
    `world_id` INT NOT NULL,
    CONSTRAINT `fk_characte_core_ori_de8b91b3` FOREIGN KEY (`origin_id`) REFERENCES `core_origins` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_player_a_27a3414c` FOREIGN KEY (`player_id`) REFERENCES `player_accounts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_core_spi_de374a25` FOREIGN KEY (`spirit_root_id`) REFERENCES `core_spirit_roots` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_talent_t_752012c9` FOREIGN KEY (`talent_tier_id`) REFERENCES `talent_tiers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characte_worlds_7db7c181` FOREIGN KEY (`world_id`) REFERENCES `worlds` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COMMENT='角色基础创建信息';
CREATE TABLE IF NOT EXISTS `aerich` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `version` VARCHAR(255) NOT NULL,
    `app` VARCHAR(100) NOT NULL,
    `content` JSON NOT NULL
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """
