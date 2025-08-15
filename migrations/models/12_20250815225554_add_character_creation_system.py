from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `talent_tiers` (
    `id` INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL COMMENT '天资等级名称',
    `description` LONGTEXT COMMENT '等级描述',
    `total_points` INT NOT NULL COMMENT '总可分配点数',
    `rarity` INT NOT NULL COMMENT '稀有度，数字越小越稀有',
    `color` VARCHAR(20) NOT NULL COMMENT '显示颜色' DEFAULT 'white'
) CHARACTER SET utf8mb4;
        ALTER TABLE `core_origins` ADD `temperament_modifier` INT NOT NULL COMMENT '心性修正' DEFAULT 0;
        ALTER TABLE `core_origins` ADD `special_effects` JSON COMMENT '特殊效果';
        ALTER TABLE `core_origins` ADD `charm_modifier` INT NOT NULL COMMENT '魅力修正' DEFAULT 0;
        ALTER TABLE `core_origins` ADD `spirituality_modifier` INT NOT NULL COMMENT '灵性修正' DEFAULT 0;
        ALTER TABLE `core_origins` ADD `fortune_modifier` INT NOT NULL COMMENT '福缘修正' DEFAULT 0;
        ALTER TABLE `core_origins` ADD `comprehension_modifier` INT NOT NULL COMMENT '悟性修正' DEFAULT 0;
        ALTER TABLE `core_origins` ADD `root_bone_modifier` INT NOT NULL COMMENT '根骨修正' DEFAULT 0;
        ALTER TABLE `core_origins` DROP COLUMN `attribute_modifiers`;
        ALTER TABLE `core_origins` MODIFY COLUMN `description` LONGTEXT COMMENT '出身描述';
        ALTER TABLE `core_origins` MODIFY COLUMN `rarity` INT NOT NULL COMMENT '稀有度' DEFAULT 3;
        ALTER TABLE `core_origins` MODIFY COLUMN `name` VARCHAR(50) NOT NULL COMMENT '出身名称';
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
        DROP TABLE IF EXISTS `characters`;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `core_origins` ADD `attribute_modifiers` JSON;
        ALTER TABLE `core_origins` DROP COLUMN `initial_items`;
        ALTER TABLE `core_origins` DROP COLUMN `temperament_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `special_effects`;
        ALTER TABLE `core_origins` DROP COLUMN `charm_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `spirituality_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `fortune_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `comprehension_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `root_bone_modifier`;
        ALTER TABLE `core_origins` DROP COLUMN `initial_money`;
        ALTER TABLE `core_origins` MODIFY COLUMN `description` LONGTEXT;
        ALTER TABLE `core_origins` MODIFY COLUMN `rarity` INT NOT NULL DEFAULT 3;
        ALTER TABLE `core_origins` MODIFY COLUMN `name` VARCHAR(50) NOT NULL;
        DROP TABLE IF EXISTS `character_bases`;
        DROP TABLE IF EXISTS `talent_tiers`;"""
