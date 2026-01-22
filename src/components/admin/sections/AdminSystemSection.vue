<template>
  <div v-if="active" class="section">
    <div class="section-head">
      <div class="section-title">系统设置</div>
      <div class="section-sub">版本号与安全配置（部分操作需要超级仙官权限）</div>
    </div>

    <div class="toolbar">
      <button class="btn" :disabled="busy" @click="loadSystemInfo">加载</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">加载中…</div>
    <div v-else class="system-grid">
      <div class="system-card">
        <div class="section-head">
          <div class="section-title">后端版本</div>
          <div class="section-sub">/api/v1/version</div>
        </div>
        <div class="toolbar">
          <span class="pill">当前：{{ backendVersion || '-' }}</span>
          <input v-model="versionDraft" class="input" placeholder="例如 4.0.0" style="max-width: 240px;" />
          <button class="btn primary" :disabled="busy || !versionDraft.trim()" @click="updateBackendVersion">更新版本</button>
        </div>
      </div>

      <div class="system-card">
        <div class="section-head">
          <div class="section-title">安全配置</div>
          <div class="section-sub">/api/v1/admin/security-config</div>
        </div>
        <div v-if="!securityConfig" class="hint">无权限或后端未开启该接口。</div>
        <div v-else class="config-grid">
          <div class="config-card">
            <div class="config-title">Turnstile</div>
            <label class="field">
              <span class="label">启用</span>
              <select v-model="turnstileDraft.turnstile_enabled" class="input">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
            <label class="field">
              <span class="label">Site Key</span>
              <input v-model="turnstileDraft.turnstile_site_key" class="input" />
            </label>
            <label class="field">
              <span class="label">Secret Key</span>
              <input v-model="turnstileDraft.turnstile_secret_key" class="input" />
            </label>
            <p v-if="maskedTurnstileSecret" class="hint">当前已配置：{{ maskedTurnstileSecret }}</p>
            <label class="field">
              <span class="label">验证地址</span>
              <input v-model="turnstileDraft.turnstile_verify_url" class="input" />
            </label>
            <div class="actions">
              <button class="btn primary" :disabled="busy || !isSuperAdmin" @click="saveTurnstile">保存 Turnstile</button>
            </div>
          </div>

          <div class="config-card">
            <div class="config-title">邮箱验证</div>
            <label class="field">
              <span class="label">启用</span>
              <select v-model="emailDraft.email_verification_enabled" class="input">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
            <label class="field">
              <span class="label">SMTP Host</span>
              <input v-model="emailDraft.smtp_host" class="input" />
            </label>
            <label class="field">
              <span class="label">SMTP Port</span>
              <input v-model.number="emailDraft.smtp_port" class="input" type="number" min="1" />
            </label>
            <label class="field">
              <span class="label">SMTP 用户名</span>
              <input v-model="emailDraft.smtp_user" class="input" />
            </label>
            <label class="field">
              <span class="label">SMTP 密码</span>
              <input v-model="emailDraft.smtp_password" class="input" />
            </label>
            <p v-if="maskedSmtpPassword" class="hint">当前已配置：{{ maskedSmtpPassword }}</p>
            <label class="field">
              <span class="label">发件人邮箱</span>
              <input v-model="emailDraft.smtp_from_email" class="input" />
            </label>
            <label class="field">
              <span class="label">发件人名称</span>
              <input v-model="emailDraft.smtp_from_name" class="input" />
            </label>
            <label class="field">
              <span class="label">验证码有效期（分钟）</span>
              <input v-model.number="emailDraft.email_code_expire_minutes" class="input" type="number" min="1" />
            </label>
            <div class="actions">
              <button class="btn primary" :disabled="busy || !isSuperAdmin" @click="saveEmail">保存邮箱配置</button>
              <button class="btn btn-secondary" :disabled="busy || !isSuperAdmin" @click="testSmtp">测试 SMTP</button>
            </div>
            <div v-if="smtpResult" class="hint mono">{{ smtpResult }}</div>
          </div>

          <div class="config-card">
            <div class="config-title">注册限流</div>
            <label class="field">
              <span class="label">启用</span>
              <select v-model="rateLimitDraft.register_rate_limit_enabled" class="input">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
            <label class="field">
              <span class="label">次数上限</span>
              <input v-model.number="rateLimitDraft.register_rate_limit_max" class="input" type="number" min="1" />
            </label>
            <label class="field">
              <span class="label">窗口秒数</span>
              <input v-model.number="rateLimitDraft.register_rate_limit_window" class="input" type="number" min="60" />
            </label>
            <div class="actions">
              <button class="btn primary" :disabled="busy || !isSuperAdmin" @click="saveRateLimit">保存限流配置</button>
            </div>
          </div>
        </div>
        <div v-if="!isSuperAdmin" class="hint">需要超级仙官权限才能保存安全配置。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { adminRequest } from '@/services/adminRequest';
import { toast } from '@/utils/toast';

type SecurityConfig = Record<string, any>;

const props = defineProps<{
  active: boolean;
  busy: boolean;
  setBusy: (next: boolean) => void;
  isSuperAdmin: boolean;
}>();

const loading = ref(false);
const error = ref('');
const backendVersion = ref<string>('');
const versionDraft = ref<string>('');
const securityConfig = ref<SecurityConfig | null>(null);
const smtpResult = ref('');
const maskedTurnstileSecret = ref('');
const maskedSmtpPassword = ref('');

const turnstileDraft = reactive({
  turnstile_enabled: false,
  turnstile_site_key: '',
  turnstile_secret_key: '',
  turnstile_verify_url: ''
});

const emailDraft = reactive({
  email_verification_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  email_code_expire_minutes: 10
});

const rateLimitDraft = reactive({
  register_rate_limit_enabled: false,
  register_rate_limit_max: 5,
  register_rate_limit_window: 600
});

const applySecurityDraft = () => {
  if (!securityConfig.value) return;
  const cfg = securityConfig.value;
  turnstileDraft.turnstile_enabled = !!cfg.turnstile_enabled;
  turnstileDraft.turnstile_site_key = cfg.turnstile_site_key ?? '';
  maskedTurnstileSecret.value = cfg.turnstile_secret_key ?? '';
  turnstileDraft.turnstile_secret_key = '';
  turnstileDraft.turnstile_verify_url = cfg.turnstile_verify_url ?? '';

  emailDraft.email_verification_enabled = !!cfg.email_verification_enabled;
  emailDraft.smtp_host = cfg.smtp_host ?? '';
  emailDraft.smtp_port = Number(cfg.smtp_port ?? 587);
  emailDraft.smtp_user = cfg.smtp_user ?? '';
  maskedSmtpPassword.value = cfg.smtp_password ?? '';
  emailDraft.smtp_password = '';
  emailDraft.smtp_from_email = cfg.smtp_from_email ?? '';
  emailDraft.smtp_from_name = cfg.smtp_from_name ?? '';
  emailDraft.email_code_expire_minutes = Number(cfg.email_code_expire_minutes ?? 10);

  rateLimitDraft.register_rate_limit_enabled = !!cfg.register_rate_limit_enabled;
  rateLimitDraft.register_rate_limit_max = Number(cfg.register_rate_limit_max ?? 5);
  rateLimitDraft.register_rate_limit_window = Number(cfg.register_rate_limit_window ?? 600);
};

const loadSystemInfo = async () => {
  loading.value = true;
  error.value = '';
  try {
    const ver = await adminRequest.get<{ version?: string }>('/api/v1/version');
    backendVersion.value = String(ver?.version ?? '');
    if (!versionDraft.value) versionDraft.value = backendVersion.value;

    try {
      securityConfig.value = await adminRequest.get<Record<string, any>>('/api/v1/admin/security-config');
      applySecurityDraft();
    } catch {
      securityConfig.value = null;
    }
  } catch (e: any) {
    error.value = e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const updateBackendVersion = async () => {
  const next = versionDraft.value.trim();
  if (!next) {
    toast.error('版本号不能为空');
    return;
  }
  props.setBusy(true);
  try {
    await adminRequest.put('/api/v1/admin/version', { value: next });
    toast.success('已更新版本号');
    backendVersion.value = next;
  } catch (e: any) {
    toast.error(e?.message || '更新失败（可能需要超级仙官权限）');
  } finally {
    props.setBusy(false);
  }
};

const saveTurnstile = async () => {
  props.setBusy(true);
  try {
    const payload: Record<string, any> = { ...turnstileDraft };
    if (!payload.turnstile_secret_key) {
      delete payload.turnstile_secret_key;
    }
    await adminRequest.put('/api/v1/admin/security-config/turnstile', payload);
    toast.success('Turnstile 已更新');
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const saveEmail = async () => {
  props.setBusy(true);
  try {
    const payload: Record<string, any> = { ...emailDraft };
    if (!payload.smtp_password) {
      delete payload.smtp_password;
    }
    await adminRequest.put('/api/v1/admin/security-config/email', payload);
    toast.success('邮箱配置已更新');
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const saveRateLimit = async () => {
  props.setBusy(true);
  try {
    await adminRequest.put('/api/v1/admin/security-config/rate-limit', { ...rateLimitDraft });
    toast.success('限流配置已更新');
  } catch (e: any) {
    toast.error(e?.message || '保存失败');
  } finally {
    props.setBusy(false);
  }
};

const testSmtp = async () => {
  props.setBusy(true);
  smtpResult.value = '';
  try {
    const res = await adminRequest.post<any>('/api/v1/admin/test-smtp', {});
    smtpResult.value = JSON.stringify(res, null, 2);
    toast.success('SMTP 测试完成');
  } catch (e: any) {
    toast.error(e?.message || '测试失败');
  } finally {
    props.setBusy(false);
  }
};

defineExpose({
  refresh: loadSystemInfo
});

watch(
  () => props.active,
  (value) => {
    if (value && !backendVersion.value && !loading.value) loadSystemInfo();
  },
  { immediate: true }
);
</script>

<style scoped>
.system-grid {
  display: grid;
  gap: 1rem;
}

.system-card {
  border: 1px solid rgba(var(--color-border-rgb), 0.45);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgba(var(--color-surface-rgb), 0.65);
}

.config-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.config-card {
  border: 1px solid rgba(var(--color-border-rgb), 0.45);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(var(--color-background-rgb), 0.65);
  display: grid;
  gap: 0.5rem;
}

.config-title { font-weight: 800; }
</style>
