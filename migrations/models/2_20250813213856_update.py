from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
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
        DROP TABLE IF EXISTS `core_spirit_roots`;
        DROP TABLE IF EXISTS `core_origins`;
        DROP TABLE IF EXISTS `core_talents`;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `core_origins`;
        DROP TABLE IF EXISTS `core_talents`;
        DROP TABLE IF EXISTS `core_spirit_roots`;"""
