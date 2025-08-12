<template>
  <div class="uploader-overlay" @click.self="$emit('close')">
    <div class="uploader-panel">
      <h2 class="panel-title">传法台</h2>
      <p class="panel-description">
        将你的创世心得（如自创天赋）分享至云端，供万千道友瞻仰。需持有效敕令（兑换码）。
      </p>

      <div v-if="submissionStatus.message" :class="['status-message', submissionStatus.type]">
        {{ submissionStatus.message }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="talent-name">天赋名号</label>
          <input id="talent-name" type="text" v-model="talent.name" required />
        </div>
        <div class="form-group">
          <label for="talent-desc">法诀描述</label>
          <textarea id="talent-desc" v-model="talent.description" rows="3" required></textarea>
        </div>
        <div class="form-group">
          <label for="redemption-code">敕令 (兑换码)</label>
          <input id="redemption-code" type="text" v-model="talent.redemption_code" required />
        </div>
        <button type="submit" class="submit-button" :disabled="isSubmitting">
          {{ isSubmitting ? '上达天听中...' : '传法' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { submitUgcTalent } from '@/services/api' // This function needs to be created
import { getUserInfo } from '@/services/tavern'

defineEmits(['close'])

const talent = reactive({
  name: '',
  description: '',
  redemption_code: '',
})

const isSubmitting = ref(false)
const submissionStatus = reactive({ type: '', message: '' })

const handleSubmit = async () => {
  isSubmitting.value = true
  submissionStatus.message = ''

  try {
    const userInfo = await getUserInfo()
    const payload = {
      ...talent,
      author_name: userInfo.name,
    }
    const response = await submitUgcTalent(payload) // We will create this API call
    submissionStatus.type = 'success'
    submissionStatus.message = response.message || '天赋提交成功！'
    // Clear form on success
    talent.name = ''
    talent.description = ''
    talent.redemption_code = ''
  } catch (error: any) {
    submissionStatus.type = 'error'
    submissionStatus.message = error.detail || '提交失败，请检查敕令或网络。'
    console.error('UGC submission failed:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.uploader-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001; /* Higher than settings panel */
}

.uploader-panel {
  background: #1f2937;
  padding: 2.5rem;
  border-radius: 12px;
  border: 1px solid #374151;
  width: 100%;
  max-width: 600px;
  color: #e5e7eb;
}

.panel-title {
  font-size: 2rem;
  color: #34d399;
  text-align: center;
  margin-bottom: 1rem;
}

.panel-description {
  text-align: center;
  color: #9ca3af;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 6px;
  color: #e5e7eb;
  font-size: 1rem;
  resize: vertical;
}

.submit-button {
  width: 100%;
  padding: 0.8rem;
  margin-top: 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
}

.submit-button:disabled {
  background: #555;
  cursor: not-allowed;
}

.status-message {
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  text-align: center;
}

.status-message.success {
  background-color: rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.status-message.error {
  background-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}
</style>
