# "仙凡分治" 重构纪要 (v3.0.0)

此次大规模重构旨在将整个后端从一个混合架构，彻底升级为一个纯粹、高效的异步架构。所有变更都围绕着 **Tortoise-ORM** 和 **FastAPI** 的最佳实践展开。

## 一、核心变更

1.  **架构飞升：纯异步ORM**
    -   **旧法**: `pymysql` + `Tortoise-ORM` 混合使用，代码逻辑割裂，存在同步阻塞风险。
    -   **新法**: **完全移除 `pymysql`**，整个后端的数据交互层 **100% 基于 Tortoise-ORM**。所有数据库操作（CRUD）均为异步 `async/await` 调用，性能与代码一致性大幅提升。

2.  **天条法度：数据库迁移**
    -   引入 `aerich` 作为数据库迁移工具，解决了以往手动管理数据库表结构的混乱问题。
    -   现在，任何对 `server/models.py` 中模型的修改，都可以通过 `aerich` 命令生成迁移文件，并安全地应用到数据库。

3.  **万法归一：命名与结构统一**
    -   清除了历史遗留的 `Core` 前缀，统一了所有模型、Pydantic Schema 和 CRUD 函数的命名（例如 `CoreOrigin` -> `Origin`）。
    -   重构了 `server/core/` 目录，将服务器启动、数据播种等核心逻辑收纳其中，使结构更清晰。

4.  **仙凡分治：双用户系统**
    -   明确分离了玩家 (`PlayerAccount`) 与管理员 (`AdminAccount`) 的数据模型，为后续权限控制和功能扩展奠定了坚实的基础。

5.  **启动流程优化**
    -   重构了 `server/main.py` 的生命周期（`lifespan`）管理，采用更稳定、更明确的 `Tortoise.init()` 方式，解决了所有启动时期的配置与依赖问题。

## 二、新增/变更的法诀 (命令)

以下命令需在项目根目录 (`大道朝天/`) 下执行：

-   **启动灵脉 (运行服务器)**
    ```bash
    python -m uvicorn server.main:app --reload --port 12345
    ```
    *(此命令无变化，但其背后的启动流程已焕然一新，更加稳固。)*

-   **演化天条 (数据库迁移)**
    ```bash
    # 1. (仅首次) 初始化迁移环境
    aerich init-db

    # 2. 当 models.py 变化后，生成新的迁移法旨
    aerich migrate

    # 3. 将新的法旨铭刻于数据库
    aerich upgrade
    ```

-   **开天辟地 (数据播种)**
    -   服务器启动时不再自动播种。如需手动注入初始数据，请执行：
    ```bash
    python -m server.core.seed_all
    ```

-   **归于混沌 (重置数据库)**
    -   如需清空数据库并重建所有表结构，可执行此毁灭性操作：
    ```bash
    python -m server.reset_database
    ```

## 三、关键卷宗变更一览

-   `server/main.py`: 重构生命周期管理。
-   `server/models.py`: 统一并最终确定了所有数据模型。
-   `server/schemas/schema.py`: 统一了所有 Pydantic 模型。
-   `server/crud/`: **目录下所有文件**均已重构为纯异步ORM实现。
-   `server/api/api_v1/endpoints/`: **目录下所有文件**均已适配新的异步CRUD。
-   `server/admin.py`: 更新了后台对新模型的注册。
-   `server/core/`: 存放核心启动与播种逻辑。
-   `aerich.ini`, `aerich_config.py`: **[新增]** `aerich` 迁移工具的配置文件。
-   `server/reset_database.py`: **[新增]** 用于快速重置数据库的脚本。
-   `server/database.py`: 简化为只提供 `TORTOISE_ORM` 核心配置。