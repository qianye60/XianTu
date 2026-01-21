<template>
  <div class="admin-container">
    <VideoBackground />

    <div class="admin-panel">
      <div class="header">
        <div class="title-row">
          <div class="title-left">
            <h2 class="title">后端管理</h2>
            <span class="status" :class="{ ok: backendReady && isAdmin, warn: !backendReady || !isAdmin }">
              {{ statusText }}
            </span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary sm" @click="goBack">返回</button>
            <button v-if="backendReady && isAdmin" class="btn btn-secondary sm" @click="logout">退出</button>
          </div>
        </div>
        <p class="subtitle">世界/出身/天赋/天资/灵根 与 联机数据管理</p>
      </div>

      <div v-if="!backendConfigured" class="locked">
        <p>未配置后端服务器，无法使用。</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">返回</button>
        </div>
      </div>

      <div v-else-if="!backendReady" class="locked">
        <p>后端未连接或不可用，请先确认后端运行正常。</p>
        <div class="actions">
          <button class="btn btn-secondary" @click="goBack">返回</button>
          <button class="btn" @click="checkBackend">重试连接</button>
        </div>
      </div>

      <template v-else>
        <div v-if="!isAdmin" class="locked">
          <p>需要仙官权限才能访问后端管理。</p>
          <p class="hint">请在登录页面勾选"仙官登录"后重新登录。</p>
          <div class="actions">
            <button class="btn btn-secondary" @click="goBack">返回</button>
            <button class="btn" @click="goLogin">去登录</button>
          </div>
        </div>

        <template v-else>
          <div class="admin-layout">
            <aside class="sidebar">
              <div class="sidebar-top">
                <div class="sidebar-meta">
                  <div class="meta-title">功能导航</div>
                  <div class="meta-sub">按模块管理后端数据</div>
                </div>
                <div class="sidebar-actions">
                  <button class="btn sm" :disabled="isBusy" @click="refreshActive">刷新</button>
                </div>
              </div>

              <div class="sidebar-scroll">
                <div v-for="group in tabGroups" :key="group.label" class="nav-group">
                  <div class="nav-group-label">{{ group.label }}</div>
                  <div class="nav-items">
                    <button
                      v-for="t in group.tabs"
                      :key="t.id"
                      type="button"
                      class="nav-item"
                      :class="{ active: activeTab === t.id }"
                      @click="setActiveTab(t.id)"
                    >
                      {{ t.label }}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <section class="main">
              <div class="main-head">
                <div class="main-title">{{ tabLabel }}</div>
                <div class="main-actions">
                  <button class="btn btn-secondary sm" :disabled="isBusy" @click="refreshActive">刷新</button>
                </div>
              </div>

              <div class="main-scroll">
            <!-- 存档管理标签页 -->
            <div v-if="activeTab === 'saves'" class="section">
              <div class="section-head">
                <div class="section-title">存档管理</div>
                <div class="section-sub">查看和删除玩家存档</div>
              </div>

              <div class="toolbar">
                <input v-model="saveQuery" class="input" placeholder="搜索角色名/道号..." />
                <button class="btn" :disabled="isBusy" @click="loadSaves">加载</button>
              </div>

              <div v-if="savesError" class="error">{{ savesError }}</div>
              <div v-else-if="savesLoading" class="loading">加载中…</div>
              <div v-else class="table saves">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell name">角色名</div>
                  <div class="cell mode">模式</div>
                  <div class="cell time">创建时间</div>
                  <div class="cell time">更新时间</div>
                  <div class="cell num">大小(KB)</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="s in filteredSaves" :key="s.id" class="row">
                  <div class="cell id">#{{ s.id }}</div>
                  <div class="cell name">{{ s.user_name }}</div>
                  <div class="cell name">{{ s.character_name }}</div>
                  <div class="cell mode">{{ s.mode }}</div>
                  <div class="cell time">{{ formatDate(s.created_at) }}</div>
                  <div class="cell time">{{ formatDate(s.updated_at) }}</div>
                  <div class="cell num">{{ s.size_kb.toFixed(1) }}</div>
                  <div class="cell actions">
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteSave(s)">删除</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'online'" class="section">
              <div class="section-head">
                <div class="section-title">联机数据 · 玩家管理</div>
                <div class="section-sub">修改穿越点、查看基础信息</div>
              </div>

              <div class="toolbar">
                <input v-model="playerQuery" class="input" placeholder="搜索道号..." />
                <button class="btn" :disabled="isBusy" @click="loadPlayers">加载</button>
              </div>

              <div v-if="playersError" class="error">{{ playersError }}</div>
              <div v-else-if="playersLoading" class="loading">加载中…</div>
              <div v-else class="table players">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell time">注册时间</div>
                  <div class="cell num">角色数</div>
                  <div class="cell num">穿越点</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="p in filteredPlayers" :key="p.id" class="row">
                  <div class="cell id">#{{ p.id }}</div>
                  <div class="cell name">
                    <span class="pill" :class="{ banned: !!p.is_banned }">{{ p.user_name }}</span>
                  </div>
                  <div class="cell time">{{ formatDate(p.created_at) }}</div>
                  <div class="cell num">{{ p.character_count }}</div>
                  <div class="cell num">
                    <input v-model.number="p._draft_travel_points" class="input small" type="number" min="0" />
                  </div>
                  <div class="cell actions">
                    <button class="btn sm" :disabled="isBusy" @click="saveTravelPoints(p)">保存</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 角色管理标签页 -->
            <div v-else-if="activeTab === 'characters'" class="section">
              <div class="section-head">
                <div class="section-title">角色管理</div>
                <div class="section-sub">查看所有角色信息</div>
              </div>

              <div class="toolbar">
                <input v-model="characterQuery" class="input" placeholder="搜索角色名/道号..." />
                <button class="btn" :disabled="isBusy" @click="loadCharacters">加载</button>
              </div>

              <div v-if="charactersError" class="error">{{ charactersError }}</div>
              <div v-else-if="charactersLoading" class="loading">加载中…</div>
              <div v-else class="table characters">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell name">角色名</div>
                  <div class="cell">世界</div>
                  <div class="cell">境界</div>
                  <div class="cell num">年龄</div>
                  <div class="cell time">创建时间</div>
                </div>
                <div v-for="c in filteredCharacters" :key="c.id" class="row">
                  <div class="cell id">#{{ c.id }}</div>
                  <div class="cell name">{{ c.user_name }}</div>
                  <div class="cell name">{{ c.character_name }}</div>
                  <div class="cell">{{ c.world }}</div>
                  <div class="cell">{{ c.realm }}</div>
                  <div class="cell num">{{ c.age }}</div>
                  <div class="cell time">{{ formatDate(c.created_at) }}</div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'ban_records'" class="section">
              <div class="section-head">
                <div class="section-title">封号管理</div>
                <div class="section-sub">查看封号记录（含申诉状态）</div>
              </div>

              <div class="toolbar">
                <button class="btn" :disabled="isBusy" @click="loadBanRecords">加载</button>
              </div>

              <div v-if="banError" class="error">{{ banError }}</div>
              <div v-else-if="banLoading" class="loading">加载中…</div>
              <div v-else class="table">
                <div class="row header" style="min-width: 980px;">
                  <div class="cell id">ID</div>
                  <div class="cell">玩家ID</div>
                  <div class="cell">类型</div>
                  <div class="cell desc">原因</div>
                  <div class="cell time">开始</div>
                  <div class="cell time">结束</div>
                  <div class="cell">申诉</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="r in banRecords" :key="String((r as any).id)" class="row" style="min-width: 980px;">
                  <div class="cell id">#{{ (r as any).id }}</div>
                  <div class="cell">{{ (r as any).player_id }}</div>
                  <div class="cell">{{ (r as any).ban_type || '-' }}</div>
                  <div class="cell desc">{{ (r as any).reason || '-' }}</div>
                  <div class="cell time">{{ formatDate(String((r as any).ban_start_time || '')) }}</div>
                  <div class="cell time">{{ formatDate(String((r as any).ban_end_time || '')) }}</div>
                  <div class="cell">
                    <span class="pill">{{ (r as any).appeal_status || 'none' }}</span>
                  </div>
                  <div class="cell actions">
                    <button
                      v-if="String((r as any).appeal_status || '') === 'pending'"
                      class="btn sm"
                      :disabled="isBusy"
                      @click="handleAppeal(Number((r as any).id), true)"
                    >
                      通过
                    </button>
                    <button
                      v-if="String((r as any).appeal_status || '') === 'pending'"
                      class="btn sm danger"
                      :disabled="isBusy"
                      @click="handleAppeal(Number((r as any).id), false)"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'appeals'" class="section">
              <div class="section-head">
                <div class="section-title">申诉管理</div>
                <div class="section-sub">仅显示待处理的申诉</div>
              </div>

              <div class="toolbar">
                <button class="btn" :disabled="isBusy" @click="loadBanRecords">加载</button>
                <span class="pill">待处理：{{ pendingAppeals.length }}</span>
              </div>

              <div v-if="banError" class="error">{{ banError }}</div>
              <div v-else-if="banLoading" class="loading">加载中…</div>
              <div v-else class="table">
                <div class="row header" style="min-width: 860px;">
                  <div class="cell id">ID</div>
                  <div class="cell">玩家ID</div>
                  <div class="cell desc">申诉理由</div>
                  <div class="cell time">申诉时间</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="r in pendingAppeals" :key="String((r as any).id)" class="row" style="min-width: 860px;">
                  <div class="cell id">#{{ (r as any).id }}</div>
                  <div class="cell">{{ (r as any).player_id }}</div>
                  <div class="cell desc">{{ (r as any).appeal_reason || '-' }}</div>
                  <div class="cell time">{{ formatDate(String((r as any).appeal_time || '')) }}</div>
                  <div class="cell actions">
                    <button class="btn sm" :disabled="isBusy" @click="handleAppeal(Number((r as any).id), true)">通过</button>
                    <button class="btn sm danger" :disabled="isBusy" @click="handleAppeal(Number((r as any).id), false)">拒绝</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'admins'" class="section">
              <div class="section-head">
                <div class="section-title">仙官管理</div>
                <div class="section-sub">查看/删除仙官账号（创建/改密请用后端接口）</div>
              </div>

              <div class="toolbar">
                <input v-model="adminAccountQuery" class="input" placeholder="搜索道号/角色/ID..." />
                <button class="btn" :disabled="isBusy" @click="loadAdminAccounts">加载</button>
              </div>

              <div v-if="adminAccountsError" class="error">{{ adminAccountsError }}</div>
              <div v-else-if="adminAccountsLoading" class="loading">加载中…</div>
              <div v-else class="table admins">
                <div class="row header" style="min-width: 760px;">
                  <div class="cell id">ID</div>
                  <div class="cell name">道号</div>
                  <div class="cell">角色</div>
                  <div class="cell time">创建时间</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="a in filteredAdminAccounts" :key="a.id" class="row" style="min-width: 760px;">
                  <div class="cell id">#{{ a.id }}</div>
                  <div class="cell name">{{ a.user_name }}</div>
                  <div class="cell">{{ a.role }}</div>
                  <div class="cell time">{{ formatDate(String(a.created_at || '')) }}</div>
                  <div class="cell actions">
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteAdminAccount(a)">删除</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'codes'" class="section">
              <div class="section-head">
                <div class="section-title">兑换码</div>
                <div class="section-sub">用于联机开局内容投放（后台创建/删除）</div>
              </div>

              <div class="toolbar">
                <input v-model="codeQuery" class="input" placeholder="搜索兑换码/类型/ID..." />
                <button class="btn" :disabled="isBusy" @click="loadCodes">加载</button>
              </div>

              <div v-if="codesError" class="error">{{ codesError }}</div>
              <div v-else-if="codesLoading" class="loading">加载中…</div>
              <div v-else class="table codes">
                <div class="row header" style="min-width: 980px;">
                  <div class="cell id">ID</div>
                  <div class="cell name">兑换码</div>
                  <div class="cell">类型</div>
                  <div class="cell num">次数</div>
                  <div class="cell time">创建时间</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="c in filteredCodes" :key="c.id" class="row" style="min-width: 980px;">
                  <div class="cell id">#{{ c.id }}</div>
                  <div class="cell name">{{ c.code }}</div>
                  <div class="cell">{{ c.type || '-' }}</div>
                  <div class="cell num">{{ c.times_used }} / {{ c.max_uses }}</div>
                  <div class="cell time">{{ formatDate(String(c.created_at || '')) }}</div>
                  <div class="cell actions">
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteCode(c)">删除</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'workshop'" class="section">
              <div class="section-head">
                <div class="section-title">创意工坊（后台）</div>
                <div class="section-sub">审核/隐藏/删除玩家上传内容</div>
              </div>

              <div class="toolbar">
                <input v-model="workshopAdminQuery" class="input" placeholder="搜索标题/作者/说明..." />
                <select v-model="workshopAdminType" class="input">
                  <option value="">全部类型</option>
                  <option value="settings">设置</option>
                  <option value="prompts">提示词</option>
                  <option value="saves">单机存档</option>
                  <option value="start_config">开局配置</option>
                </select>
                <label class="pill" style="display:flex; gap:8px; align-items:center;">
                  <input v-model="workshopAdminIncludeDeleted" type="checkbox" />
                  包含已删除
                </label>
                <button class="btn" :disabled="isBusy" @click="loadWorkshopAdmin">加载</button>
              </div>

              <div v-if="workshopAdminError" class="error">{{ workshopAdminError }}</div>
              <div v-else-if="workshopAdminLoading" class="loading">加载中…</div>
              <div v-else class="table workshop">
                <div class="row header" style="min-width: 1100px;">
                  <div class="cell id">ID</div>
                  <div class="cell">类型</div>
                  <div class="cell name">标题</div>
                  <div class="cell">作者</div>
                  <div class="cell num">下载</div>
                  <div class="cell">公开</div>
                  <div class="cell">删除</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="it in workshopAdminItems" :key="it.id" class="row" style="min-width: 1100px;">
                  <div class="cell id">#{{ it.id }}</div>
                  <div class="cell">{{ it.type }}</div>
                  <div class="cell name">{{ it.title }}</div>
                  <div class="cell">{{ it.author_name }}</div>
                  <div class="cell num">{{ it.downloads }}</div>
                  <div class="cell">
                    <button class="btn sm" :disabled="isBusy" @click="setWorkshopItemFlags(it, { is_public: !it.is_public })">
                      {{ it.is_public ? '公开' : '私密' }}
                    </button>
                  </div>
                  <div class="cell">
                    <button class="btn sm" :disabled="isBusy" @click="setWorkshopItemFlags(it, { is_deleted: !it.is_deleted })">
                      {{ it.is_deleted ? '已删' : '正常' }}
                    </button>
                  </div>
                  <div class="cell actions">
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteWorkshopItemHard(it)">彻删</button>
                  </div>
                </div>
              </div>

              <div class="toolbar" style="justify-content: space-between;">
                <span class="pill">共 {{ workshopAdminTotal }} 条 · 第 {{ workshopAdminPage }} / {{ workshopAdminTotalPages }} 页</span>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button class="btn btn-secondary sm" :disabled="isBusy || workshopAdminPage <= 1" @click="workshopAdminPage--; loadWorkshopAdmin()">上一页</button>
                  <button class="btn sm" :disabled="isBusy || workshopAdminPage >= workshopAdminTotalPages" @click="workshopAdminPage++; loadWorkshopAdmin()">下一页</button>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'system'" class="section">
              <div class="section-head">
                <div class="section-title">系统设置</div>
                <div class="section-sub">版本号与安全配置（部分操作需要超级仙官权限）</div>
              </div>

              <div class="toolbar">
                <button class="btn" :disabled="isBusy" @click="loadSystemInfo">加载</button>
              </div>

              <div v-if="systemError" class="error">{{ systemError }}</div>
              <div v-else-if="systemLoading" class="loading">加载中…</div>
              <div v-else class="section" style="background: transparent; border: none; padding: 0;">
                <div class="section-head">
                  <div class="section-title">后端版本</div>
                  <div class="section-sub">/api/v1/version</div>
                </div>
                <div class="toolbar">
                  <span class="pill">当前：{{ backendVersion || '-' }}</span>
                  <input v-model="versionDraft" class="input" placeholder="例如 4.0.0" style="max-width: 260px;" />
                  <button class="btn primary" :disabled="isBusy || !versionDraft.trim()" @click="updateBackendVersion">更新版本</button>
                </div>

                <div class="section-head" style="margin-top: 14px;">
                  <div class="section-title">安全配置</div>
                  <div class="section-sub">/api/v1/admin/security-config</div>
                </div>
                <div v-if="!securityConfig" class="hint">无权限或后端未开启该接口。</div>
                <textarea v-else class="textarea mono" rows="10" readonly :value="JSON.stringify(securityConfig, null, 2)"></textarea>
              </div>
            </div>

            <div v-else class="section">
              <div class="section-head">
                <div class="section-title">{{ tabLabel }}</div>
                <div class="section-sub">增删改查（复杂字段用 JSON 编辑）</div>
              </div>

              <div class="toolbar">
                <input v-model="crudQuery" class="input" placeholder="搜索名称..." />
                <button class="btn" :disabled="isBusy" @click="loadCrud">加载</button>
                <button class="btn primary" :disabled="isBusy" @click="openCreate">新增</button>
              </div>

              <div v-if="crudError" class="error">{{ crudError }}</div>
              <div v-else-if="crudLoading" class="loading">加载中…</div>
              <div v-else class="table crud">
                <div class="row header">
                  <div class="cell id">ID</div>
                  <div class="cell name">名称</div>
                  <div class="cell desc">描述</div>
                  <div class="cell actions">操作</div>
                </div>
                <div v-for="item in filteredCrudItems" :key="item.id" class="row">
                  <div class="cell id">#{{ item.id }}</div>
                  <div class="cell name">{{ item.name }}</div>
                  <div class="cell desc">{{ item.description || '-' }}</div>
                  <div class="cell actions">
                    <button class="btn sm" :disabled="isBusy" @click="openEdit(item)">编辑</button>
                    <button class="btn sm danger" :disabled="isBusy" @click="deleteItem(item)">删除</button>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </section>
          </div>

          <div v-if="editModalOpen" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
              <div class="modal-head">
                <div class="modal-title">{{ editingItem?.id ? '编辑' : '新增' }} · {{ tabLabel }}</div>
                <button class="btn sm" @click="closeModal">关闭</button>
              </div>

              <div class="modal-body">
                <label class="field">
                  <span class="label">名称</span>
                  <input v-model="editDraft.name" class="input" />
                </label>
                <label class="field">
                  <span class="label">描述</span>
                  <textarea v-model="editDraft.description" class="textarea" rows="4"></textarea>
                </label>
                <label class="field">
                  <span class="label">附加 JSON（可空）</span>
                  <textarea v-model="editDraft.extraJson" class="textarea mono" rows="8" placeholder="{ }"></textarea>
                </label>
              </div>

              <div class="actions">
                <button class="btn btn-secondary" @click="closeModal">取消</button>
                <button class="btn primary" :disabled="isBusy || !editDraft.name" @click="saveItem">保存</button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { toast } from '@/utils/toast';
import { buildBackendUrl, isBackendConfigured } from '@/services/backendConfig';
import { adminRequest } from '@/services/adminRequest';
import { useUIStore } from '@/stores/uiStore';

type AdminMe = { id: number; user_name: string; role?: string; created_at?: string };

type CrudItem = { id: number; name: string; description?: string; [k: string]: any };

type PlayerRow = {
  id: number;
  user_name: string;
  created_at: string;
  is_banned: boolean;
  character_count: number;
  travel_points: number;
  _draft_travel_points: number;
};

type SaveRow = {
  id: number;
  user_name: string;
  character_name: string;
  mode: string;
  created_at: string;
  updated_at: string;
  size_kb: number;
};

type CharacterRow = {
  id: number;
  user_name: string;
  character_name: string;
  world: string;
  realm: string;
  age: number;
  created_at: string;
};

type AdminAccountRow = {
  id: number;
  user_name: string;
  role: string;
  email?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

type RedemptionCodeRow = {
  id: number;
  code: string;
  type?: string | null;
  max_uses: number;
  times_used: number;
  expires_at?: string | null;
  created_at?: string | null;
};

type WorkshopAdminItemRow = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  author_name: string;
  downloads: number;
  likes: number;
  is_public: boolean;
  is_deleted: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type WorkshopAdminListResponse = {
  items: WorkshopAdminItemRow[];
  total: number;
  page: number;
  page_size: number;
};

type BanRecordRow = Record<string, any>;

const router = useRouter();
const uiStore = useUIStore();

const backendConfigured = ref(isBackendConfigured());
const backendReady = ref(false);
const adminMe = ref<AdminMe | null>(null);
const adminToken = computed(() => localStorage.getItem('admin_access_token') || '');
const isAdmin = computed(() => !!adminMe.value);
const isSuperAdmin = computed(() => adminMe.value?.role === 'super_admin');
const statusText = computed(() => {
  if (!backendReady.value) return '后端不可用';
  if (isAdmin.value) return isSuperAdmin.value ? '超级仙官' : '仙官权限';
  if (adminToken.value) return '令牌失效/无权限';
  return '未登录';
});

const checkBackend = async () => {
  backendConfigured.value = isBackendConfigured();
  if (!backendConfigured.value) {
    backendReady.value = false;
    adminMe.value = null;
    return;
  }
  backendReady.value = await uiStore.checkBackendConnection();
  if (!backendReady.value) {
    adminMe.value = null;
    return;
  }

  // 若已有仙官令牌，则拉取 /admin/me 做真实鉴权
  if (adminToken.value) {
    try {
      adminMe.value = await adminRequest.get<AdminMe>('/api/v1/admin/me');
      localStorage.setItem('is_admin', 'true');
    } catch {
      adminMe.value = null;
      localStorage.removeItem('is_admin');
      localStorage.removeItem('admin_access_token');
    }
  } else {
    adminMe.value = null;
  }
};

const goBack = () => router.push('/');
const goLogin = () => router.push('/login');

const isBusy = ref(false);

const logout = () => {
  localStorage.removeItem('is_admin');
  localStorage.removeItem('admin_access_token');
  adminMe.value = null;
  toast.info('已退出登录');
  router.push('/login');
};

// 定义所有标签页
const allTabs = [
  { id: 'saves', label: '存档管理', group: '数据管理' },
  { id: 'online', label: '玩家管理', group: '数据管理' },
  { id: 'characters', label: '角色管理', group: '数据管理' },
  { id: 'ban_records', label: '封号管理', group: '用户管理' },
  { id: 'appeals', label: '申诉管理', group: '用户管理' },
  { id: 'admins', label: '仙官管理', group: '用户管理' },
  { id: 'worlds', label: '世界', group: '开局配置' },
  { id: 'origins', label: '出身', group: '开局配置' },
  { id: 'talents', label: '天赋', group: '开局配置' },
  { id: 'talent_tiers', label: '天资', group: '开局配置' },
  { id: 'spirit_roots', label: '灵根', group: '开局配置' },
  { id: 'codes', label: '兑换码', group: '其他' },
  { id: 'workshop', label: '创意工坊', group: '其他' },
  { id: 'system', label: '系统设置', group: '其他' },
] as const;

type TabId = (typeof allTabs)[number]['id'];

// 按分组组织标签页
const tabGroups = [
  { label: '数据管理', tabs: allTabs.filter(t => t.group === '数据管理') },
  { label: '用户管理', tabs: allTabs.filter(t => t.group === '用户管理') },
  { label: '开局配置', tabs: allTabs.filter(t => t.group === '开局配置') },
  { label: '其他', tabs: allTabs.filter(t => t.group === '其他') },
];

const activeTab = ref<TabId>('worlds');

const tabLabel = computed(() => allTabs.find(t => t.id === activeTab.value)?.label || '管理');

const crudQuery = ref('');
const crudLoading = ref(false);
const crudError = ref('');
const crudItems = ref<CrudItem[]>([]);

const playersLoading = ref(false);
const playersError = ref('');
const playerQuery = ref('');
const players = ref<PlayerRow[]>([]);

const savesLoading = ref(false);
const savesError = ref('');
const saveQuery = ref('');
const saves = ref<SaveRow[]>([]);

const charactersLoading = ref(false);
const charactersError = ref('');
const characterQuery = ref('');
const characters = ref<CharacterRow[]>([]);

// 仙官管理
const adminAccountsLoading = ref(false);
const adminAccountsError = ref('');
const adminAccountQuery = ref('');
const adminAccounts = ref<AdminAccountRow[]>([]);

// 兑换码管理
const codesLoading = ref(false);
const codesError = ref('');
const codeQuery = ref('');
const codes = ref<RedemptionCodeRow[]>([]);

// 封号/申诉
const banLoading = ref(false);
const banError = ref('');
const banRecords = ref<BanRecordRow[]>([]);

// 创意工坊（后台）
const workshopAdminLoading = ref(false);
const workshopAdminError = ref('');
const workshopAdminQuery = ref('');
const workshopAdminType = ref<string>('');
const workshopAdminIncludeDeleted = ref(false);
const workshopAdminPage = ref(1);
const workshopAdminPageSize = ref(50);
const workshopAdminTotal = ref(0);
const workshopAdminItems = ref<WorkshopAdminItemRow[]>([]);

// 系统设置
const systemLoading = ref(false);
const systemError = ref('');
const backendVersion = ref<string>('');
const versionDraft = ref<string>('');
const securityConfig = ref<Record<string, any> | null>(null);

const formatDate = (isoText: string) => {
  if (!isoText) return '-';
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;
  return date.toLocaleString();
};

const getCrudPath = (tabId: TabId): string => {
  switch (tabId) {
    case 'worlds': return '/api/v1/worlds/';
    case 'origins': return '/api/v1/origins/';
    case 'talents': return '/api/v1/talents/';
    case 'talent_tiers': return '/api/v1/talent_tiers/';
    case 'spirit_roots': return '/api/v1/spirit_roots/';
    default: return '';
  }
};

const normalizeCrudItem = (raw: any): CrudItem => ({
  ...raw,
  id: Number(raw?.id),
  name: String(raw?.name ?? raw?.名称 ?? ''),
  description: typeof raw?.description === 'string' ? raw.description : (typeof raw?.描述 === 'string' ? raw.描述 : ''),
});

const loadCrud = async () => {
  const tabAtStart = activeTab.value;
  const path = getCrudPath(tabAtStart);
  if (!path) {
    crudItems.value = [];
    crudLoading.value = false;
    crudError.value = '该模块暂未接入后端接口';
    return;
  }
  crudLoading.value = true;
  crudError.value = '';
  try {
    const rows = await adminRequest.get<any[]>(path);
    if (activeTab.value !== tabAtStart) return;
    crudItems.value = (rows || []).map(normalizeCrudItem);
  } catch (e: any) {
    crudError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      crudLoading.value = false;
    }
  }
};

const filteredCrudItems = computed(() => {
  const q = crudQuery.value.trim();
  const list = crudItems.value;
  if (!q) return list;
  return list.filter(x => (x.name || '').includes(q) || String(x.id).includes(q));
});

const loadPlayers = async () => {
  const tabAtStart = activeTab.value;
  playersLoading.value = true;
  playersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/users/');
    if (activeTab.value !== tabAtStart) return;
    players.value = (rows || []).map((r) => {
      const travelPoints = Number(r?.travel_points ?? 0);
      return {
        id: Number(r?.id),
        user_name: String(r?.user_name ?? ''),
        created_at: String(r?.created_at ?? ''),
        is_banned: !!r?.is_banned,
        character_count: Number(r?.character_count ?? 0),
        travel_points: travelPoints,
        _draft_travel_points: travelPoints,
      } satisfies PlayerRow;
    });
  } catch (e: any) {
    playersError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      playersLoading.value = false;
    }
  }
};

const filteredPlayers = computed(() => {
  const q = playerQuery.value.trim();
  if (!q) return players.value;
  return players.value.filter(p => p.user_name.includes(q) || String(p.id).includes(q));
});

const saveTravelPoints = async (player: PlayerRow) => {
  const next = Number(player._draft_travel_points);
  if (!Number.isFinite(next) || next < 0) {
    toast.error('穿越点必须为非负整数');
    return;
  }
  isBusy.value = true;
  try {
    const res = await adminRequest.put<{ user_id: number; travel_points: number }>(
      `/api/v1/users/${player.id}/travel_points`,
      { travel_points: Math.floor(next) }
    );
    player.travel_points = Number(res?.travel_points ?? Math.floor(next));
    player._draft_travel_points = player.travel_points;
    toast.success('已更新穿越点');
  } catch (e: any) {
    toast.error(e?.message || '更新失败');
  } finally {
    isBusy.value = false;
  }
};

// 存档管理相关函数
const loadSaves = async () => {
  const tabAtStart = activeTab.value;
  savesLoading.value = true;
  savesError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/saves');
    if (activeTab.value !== tabAtStart) return;
    saves.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      mode: String(r?.mode ?? ''),
      created_at: String(r?.created_at ?? ''),
      updated_at: String(r?.updated_at ?? ''),
      size_kb: Number(r?.size_kb ?? 0),
    } satisfies SaveRow));
  } catch (e: any) {
    savesError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      savesLoading.value = false;
    }
  }
};

const filteredSaves = computed(() => {
  const q = saveQuery.value.trim();
  if (!q) return saves.value;
  return saves.value.filter(s =>
    s.user_name.includes(q) ||
    s.character_name.includes(q) ||
    String(s.id).includes(q)
  );
});

const deleteSave = async (save: SaveRow) => {
  if (!confirm(`确定删除存档：${save.character_name} (${save.user_name}) #${save.id}？`)) return;
  isBusy.value = true;
  try {
    await adminRequest.delete(`/api/v1/admin/saves/${save.id}`);
    toast.success('已删除存档');
    await loadSaves();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

// 角色管理相关函数
const loadCharacters = async () => {
  const tabAtStart = activeTab.value;
  charactersLoading.value = true;
  charactersError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/characters');
    if (activeTab.value !== tabAtStart) return;
    characters.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      character_name: String(r?.character_name ?? ''),
      world: String(r?.world ?? ''),
      realm: String(r?.realm ?? ''),
      age: Number(r?.age ?? 0),
      created_at: String(r?.created_at ?? ''),
    } satisfies CharacterRow));
  } catch (e: any) {
    charactersError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      charactersLoading.value = false;
    }
  }
};

const loadAdminAccounts = async () => {
  const tabAtStart = activeTab.value;
  adminAccountsLoading.value = true;
  adminAccountsError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/admin/accounts');
    if (activeTab.value !== tabAtStart) return;
    adminAccounts.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      user_name: String(r?.user_name ?? ''),
      role: String(r?.role ?? ''),
      email: r?.email == null ? null : String(r?.email),
      is_active: !!r?.is_active,
      created_at: r?.created_at == null ? null : String(r?.created_at),
    } satisfies AdminAccountRow));
  } catch (e: any) {
    adminAccountsError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      adminAccountsLoading.value = false;
    }
  }
};

const deleteAdminAccount = async (row: AdminAccountRow) => {
  if (!confirm(`确定删除仙官账号：${row.user_name} (#${row.id})？`)) return;
  isBusy.value = true;
  try {
    await adminRequest.delete(`/api/v1/admin/accounts/${row.id}`);
    toast.success('已删除');
    await loadAdminAccounts();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

const loadCodes = async () => {
  const tabAtStart = activeTab.value;
  codesLoading.value = true;
  codesError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/redemption/admin/codes?skip=0&limit=100');
    if (activeTab.value !== tabAtStart) return;
    codes.value = (rows || []).map((r) => ({
      id: Number(r?.id),
      code: String(r?.code ?? ''),
      type: r?.type == null ? null : String(r?.type),
      max_uses: Number(r?.max_uses ?? 1),
      times_used: Number(r?.times_used ?? 0),
      expires_at: r?.expires_at == null ? null : String(r?.expires_at),
      created_at: r?.created_at == null ? null : String(r?.created_at),
    } satisfies RedemptionCodeRow));
  } catch (e: any) {
    codesError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      codesLoading.value = false;
    }
  }
};

const deleteCode = async (row: RedemptionCodeRow) => {
  if (!confirm(`确定删除兑换码：${row.code} (#${row.id})？`)) return;
  isBusy.value = true;
  try {
    await adminRequest.delete(`/api/v1/redemption/admin/codes/${row.id}`);
    toast.success('已删除');
    await loadCodes();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

const loadBanRecords = async () => {
  const tabAtStart = activeTab.value;
  banLoading.value = true;
  banError.value = '';
  try {
    const rows = await adminRequest.get<any[]>('/api/v1/ban/ban_records?limit=200&offset=0');
    if (activeTab.value !== tabAtStart) return;
    banRecords.value = Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    banError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      banLoading.value = false;
    }
  }
};

const handleAppeal = async (banRecordId: number, approve: boolean) => {
  isBusy.value = true;
  try {
    await adminRequest.post(`/api/v1/ban/handle_appeal/${banRecordId}?approve=${approve ? 'true' : 'false'}`, {});
    toast.success(approve ? '已通过申诉' : '已拒绝申诉');
    await loadBanRecords();
  } catch (e: any) {
    toast.error(e?.message || '处理失败');
  } finally {
    isBusy.value = false;
  }
};

const loadWorkshopAdmin = async () => {
  const tabAtStart = activeTab.value;
  workshopAdminLoading.value = true;
  workshopAdminError.value = '';
  try {
    const q = workshopAdminQuery.value.trim();
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (workshopAdminType.value) qs.set('item_type', workshopAdminType.value);
    qs.set('include_deleted', String(workshopAdminIncludeDeleted.value));
    qs.set('page', String(workshopAdminPage.value));
    qs.set('page_size', String(workshopAdminPageSize.value));

    const res = await adminRequest.get<WorkshopAdminListResponse>(`/api/v1/admin/workshop/items?${qs.toString()}`);
    if (activeTab.value !== tabAtStart) return;
    workshopAdminItems.value = res?.items || [];
    workshopAdminTotal.value = Number(res?.total ?? 0);
  } catch (e: any) {
    workshopAdminError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      workshopAdminLoading.value = false;
    }
  }
};

const setWorkshopItemFlags = async (item: WorkshopAdminItemRow, patch: { is_public?: boolean; is_deleted?: boolean }) => {
  isBusy.value = true;
  try {
    await adminRequest.post(`/api/v1/admin/workshop/items/${item.id}/visibility`, patch);
    toast.success('已更新');
    await loadWorkshopAdmin();
  } catch (e: any) {
    toast.error(e?.message || '更新失败');
  } finally {
    isBusy.value = false;
  }
};

const deleteWorkshopItemHard = async (item: WorkshopAdminItemRow) => {
  if (!confirm(`确定彻底删除工坊内容：${item.title} (#${item.id})？此操作不可恢复。`)) return;
  isBusy.value = true;
  try {
    await adminRequest.delete(`/api/v1/admin/workshop/items/${item.id}`);
    toast.success('已彻底删除');
    await loadWorkshopAdmin();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

const loadSystemInfo = async () => {
  const tabAtStart = activeTab.value;
  systemLoading.value = true;
  systemError.value = '';
  try {
    const ver = await adminRequest.get<{ version?: string }>('/api/v1/version');
    if (activeTab.value !== tabAtStart) return;
    backendVersion.value = String(ver?.version ?? '');
    if (!versionDraft.value) versionDraft.value = backendVersion.value;

    try {
      securityConfig.value = await adminRequest.get<Record<string, any>>('/api/v1/admin/security-config');
    } catch {
      securityConfig.value = null;
    }
  } catch (e: any) {
    systemError.value = e?.message || '加载失败';
  } finally {
    if (activeTab.value === tabAtStart) {
      systemLoading.value = false;
    }
  }
};

const updateBackendVersion = async () => {
  const next = versionDraft.value.trim();
  if (!next) {
    toast.error('版本号不能为空');
    return;
  }
  isBusy.value = true;
  try {
    await adminRequest.put('/api/v1/admin/version', { value: next });
    toast.success('已更新版本号');
    backendVersion.value = next;
  } catch (e: any) {
    toast.error(e?.message || '更新失败（可能需要超级仙官权限）');
  } finally {
    isBusy.value = false;
  }
};

const filteredCharacters = computed(() => {
  const q = characterQuery.value.trim();
  if (!q) return characters.value;
  return characters.value.filter(c =>
    c.user_name.includes(q) ||
    c.character_name.includes(q) ||
    String(c.id).includes(q)
  );
});

const filteredAdminAccounts = computed(() => {
  const q = adminAccountQuery.value.trim();
  if (!q) return adminAccounts.value;
  return adminAccounts.value.filter(a =>
    String(a.id).includes(q) ||
    String(a.user_name || '').includes(q) ||
    String(a.role || '').includes(q)
  );
});

const filteredCodes = computed(() => {
  const q = codeQuery.value.trim();
  if (!q) return codes.value;
  return codes.value.filter(c =>
    String(c.id).includes(q) ||
    String(c.code || '').includes(q) ||
    String(c.type || '').includes(q)
  );
});

const pendingAppeals = computed(() => banRecords.value.filter((r) => String((r as any)?.appeal_status || '') === 'pending'));

const workshopAdminTotalPages = computed(() => Math.max(1, Math.ceil(workshopAdminTotal.value / workshopAdminPageSize.value)));

const editModalOpen = ref(false);
const editingItem = ref<CrudItem | null>(null);
const editDraft = reactive({ name: '', description: '', extraJson: '' });

const openCreate = () => {
  editingItem.value = null;
  editDraft.name = '';
  editDraft.description = '';
  editDraft.extraJson = '';
  editModalOpen.value = true;
};

const openEdit = (item: CrudItem) => {
  editingItem.value = item;
  editDraft.name = item.name || '';
  editDraft.description = item.description || '';
  const cloned = { ...item };
  delete (cloned as any).id;
  delete (cloned as any).name;
  delete (cloned as any).description;
  editDraft.extraJson = Object.keys(cloned).length ? JSON.stringify(cloned, null, 2) : '';
  editModalOpen.value = true;
};

const closeModal = () => {
  editModalOpen.value = false;
};

const saveItem = async () => {
  const path = getCrudPath(activeTab.value);
  if (!path) return;

  let extra: any = {};
  if (editDraft.extraJson.trim()) {
    try {
      extra = JSON.parse(editDraft.extraJson);
    } catch {
      toast.error('附加 JSON 不是合法 JSON');
      return;
    }
  }

  const payload = { ...extra, name: editDraft.name, description: editDraft.description };

  isBusy.value = true;
  try {
    if (editingItem.value?.id) {
      await adminRequest.put(`${path}${editingItem.value.id}`, payload);
      toast.success('已保存');
    } else {
      await adminRequest.post(path, payload);
      toast.success('已创建');
    }
    editModalOpen.value = false;
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    isBusy.value = false;
  }
};

const deleteItem = async (item: CrudItem) => {
  const path = getCrudPath(activeTab.value);
  if (!path) return;
  if (!confirm(`确定删除：${item.name} (#${item.id})？`)) return;

  isBusy.value = true;
  try {
    await adminRequest.delete(`${path}${item.id}`);
    toast.success('已删除');
    await loadCrud();
  } catch (e: any) {
    toast.error(e?.message || '删除失败');
  } finally {
    isBusy.value = false;
  }
};

const refreshActive = async () => {
  if (activeTab.value === 'saves') {
    await loadSaves();
  } else if (activeTab.value === 'characters') {
    await loadCharacters();
  } else if (activeTab.value === 'online') {
    await loadPlayers();
  } else if (activeTab.value === 'admins') {
    await loadAdminAccounts();
  } else if (activeTab.value === 'codes') {
    await loadCodes();
  } else if (activeTab.value === 'ban_records' || activeTab.value === 'appeals') {
    await loadBanRecords();
  } else if (activeTab.value === 'workshop') {
    await loadWorkshopAdmin();
  } else if (activeTab.value === 'system') {
    await loadSystemInfo();
  } else {
    await loadCrud();
  }
};

const setActiveTab = (tabId: TabId) => {
  if (activeTab.value === tabId) return;
  activeTab.value = tabId;
};

watch(activeTab, async () => {
  crudQuery.value = '';
  playerQuery.value = '';
  saveQuery.value = '';
  characterQuery.value = '';
  adminAccountQuery.value = '';
  codeQuery.value = '';
  workshopAdminQuery.value = '';

  crudError.value = '';
  playersError.value = '';
  savesError.value = '';
  charactersError.value = '';
  adminAccountsError.value = '';
  codesError.value = '';
  banError.value = '';
  workshopAdminError.value = '';
  systemError.value = '';

  crudItems.value = [];
  players.value = [];
  saves.value = [];
  characters.value = [];
  adminAccounts.value = [];
  codes.value = [];
  banRecords.value = [];
  workshopAdminItems.value = [];
  workshopAdminTotal.value = 0;
  backendVersion.value = '';
  securityConfig.value = null;

  crudLoading.value = false;
  playersLoading.value = false;
  savesLoading.value = false;
  charactersLoading.value = false;
  adminAccountsLoading.value = false;
  codesLoading.value = false;
  banLoading.value = false;
  workshopAdminLoading.value = false;
  systemLoading.value = false;

  if (!backendReady.value || !isAdmin.value) return;
  if (isBusy.value) return;
  await refreshActive();
});

onMounted(async () => {
  await checkBackend();
  if (!backendReady.value) return;
  if (isAdmin.value) await refreshActive();
});
</script>

<style scoped>
.admin-container {
  width: 100%;
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  background: linear-gradient(180deg, rgba(var(--color-background-rgb), 0.95), rgba(var(--color-surface-rgb), 0.86));
}

.admin-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(var(--color-primary-rgb), 0.18), transparent 45%),
    radial-gradient(circle at 85% 0%, rgba(var(--color-accent-rgb), 0.12), transparent 55%);
  opacity: 0.7;
  pointer-events: none;
  z-index: 0;
}

.admin-panel {
  width: 100%;
  max-width: 1280px;
  height: 100%;
  background: linear-gradient(160deg, rgba(var(--color-surface-rgb), 0.98) 0%, rgba(var(--color-surface-rgb), 0.92) 45%, rgba(var(--color-surface-rgb), 0.88) 100%);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  border-radius: 16px;
  box-shadow: 0 30px 60px -28px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 16px;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.admin-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(140% 120% at 10% 0%, rgba(var(--color-primary-rgb), 0.12), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 40%);
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
}

.admin-panel > * { position: relative; z-index: 1; }

.header { margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(var(--color-border-rgb), 0.45); }
.title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.title-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.title { margin: 0; font-family: var(--font-family-serif); font-size: 2rem; color: var(--color-primary); }
.subtitle { margin: 0.6rem 0 0; color: var(--color-text-secondary); }
.header-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; flex-wrap: wrap; }

.status {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
}
.status.ok { border-color: rgba(34, 197, 94, 0.4); color: #22c55e; }
.status.warn { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; }

.locked { padding: 1.25rem; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-light); }

.login-card { border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-light); padding: 1.25rem; }
.login-title { font-weight: 800; margin-bottom: 0.75rem; }
.login-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.hint { margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.85rem; }

.admin-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.sidebar {
  border: 1px solid rgba(var(--color-border-rgb), 0.55);
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(var(--color-surface-rgb), 0.9), rgba(var(--color-surface-rgb), 0.78));
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.5);
  background: rgba(var(--color-surface-rgb), 0.6);
  backdrop-filter: blur(10px);
}

.sidebar-meta { min-width: 0; }
.meta-title { font-weight: 900; }
.meta-sub { font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px; }

.sidebar-actions { display: flex; gap: 8px; flex: 0 0 auto; }

.sidebar-scroll {
  padding: 10px;
  overflow: auto;
  min-height: 0;
  overflow-x: hidden;
}

.nav-group { display: grid; gap: 8px; margin-bottom: 12px; }
.nav-group:last-child { margin-bottom: 0; }
.nav-group-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-items { display: grid; gap: 8px; }
.nav-item {
  text-align: left;
  padding: 10px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  background: rgba(var(--color-background-rgb), 0.7);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item:hover:not(.active) { border-color: rgba(var(--color-primary-rgb), 0.25); }
.nav-item.active {
  background: rgba(var(--color-primary-rgb), 0.10);
  border-color: rgba(var(--color-primary-rgb), 0.40);
  color: var(--color-text);
  font-weight: 700;
}

.main {
  border: 1px solid rgba(var(--color-border-rgb), 0.55);
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(var(--color-surface-rgb), 0.92), rgba(var(--color-surface-rgb), 0.82));
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--color-border-rgb), 0.5);
  background: rgba(var(--color-surface-rgb), 0.65);
  backdrop-filter: blur(10px);
  flex: 0 0 auto;
  flex-wrap: wrap;
}

.main-title { font-weight: 900; min-width: 0; }
.main-actions { display: flex; gap: 8px; flex: 0 0 auto; }

.main-scroll {
  padding: 12px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.section { border: 1px solid rgba(var(--color-border-rgb), 0.6); border-radius: 12px; padding: 1rem; background: linear-gradient(180deg, rgba(var(--color-surface-rgb), 0.9), rgba(var(--color-surface-rgb), 0.82)); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.section-title { font-weight: 800; }
.section-sub { color: var(--color-text-secondary); font-size: 0.85rem; }

.toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }

.field { display: grid; gap: 0.35rem; }
.label { font-size: 0.85rem; color: var(--color-text-secondary); }
.input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: rgba(var(--color-background-rgb), 0.75);
  color: var(--color-text);
}
.input.small { padding: 0.35rem 0.5rem; border-radius: 8px; width: 120px; }
.textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: var(--color-text);
  resize: vertical;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }

.actions { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1rem; }
.btn {
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
.btn:hover:not(:disabled) { border-color: var(--color-primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: var(--color-primary); color: white; border-color: rgba(var(--color-primary-rgb), 0.7); }
.btn.btn-secondary { background: transparent; }
.btn.danger, .btn.sm.danger { border-color: rgba(239, 68, 68, 0.35); color: #ef4444; }
.btn.sm { padding: 0.35rem 0.6rem; border-radius: 8px; font-size: 0.85rem; }

.table {
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  border-radius: 12px;
  overflow: auto;
  background: linear-gradient(180deg, rgba(var(--color-surface-rgb), 0.95), rgba(var(--color-surface-rgb), 0.88));
  width: 100%;
  max-width: 100%;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.table .row { min-width: 100%; }
.table.crud .row { display: grid; grid-template-columns: 90px 200px 1fr 170px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.table.players .row { display: grid; grid-template-columns: 90px 180px 180px 100px 140px 120px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; min-width: 860px; }
.table.saves .row { display: grid; grid-template-columns: 80px 150px 150px 100px 1fr 1fr 100px 100px; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.table.characters .row { display: grid; grid-template-columns: 80px 150px 180px 120px 120px 100px 1fr; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border); align-items: center; }
.row.header { background: rgba(var(--color-primary-rgb), 0.06); font-weight: 800; color: var(--color-text); }
.row:last-child { border-bottom: none; }

.cell { min-width: 0; }
.cell.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell.actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.cell.desc { color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pill { display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid var(--color-border); background: rgba(var(--color-primary-rgb), 0.06); }
.pill.banned { border-color: rgba(239, 68, 68, 0.35); color: #ef4444; }

.error { color: #ef4444; padding: 0.5rem 0; }
.loading { color: var(--color-text-secondary); padding: 0.5rem 0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 10000; }
.modal { width: min(720px, 100%); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 25px 60px rgba(0,0,0,0.4); overflow: hidden; }
.modal-head { padding: 1rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); }
.modal-title { font-weight: 900; }
.modal-body { padding: 1rem; display: grid; gap: 0.75rem; }

@media (max-width: 820px) {
  .login-grid { grid-template-columns: 1fr; }
  .admin-layout { grid-template-columns: 1fr; }
  .sidebar { order: 2; }
  .main { order: 1; }
  .table.crud .row { grid-template-columns: 80px 1fr 120px; grid-template-areas: "id name actions" "desc desc desc"; }
  .table.crud .cell.desc { grid-area: desc; }
  .table.crud .cell.actions { grid-area: actions; }
  .table.players .row { grid-template-columns: 80px 1fr 120px; grid-template-areas: "id name actions" "time time time" "num num num"; }
}
</style>
