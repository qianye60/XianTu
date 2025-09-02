<template>
  <div class="roleplay_options">
    <div class="roleplay_options_back">
      <div v-for="item in items" class="roleplay_options_item" tabindex="1"
        @click="handle_item_click(item)">
        <span class="roleplay_options_title">
          <strong>{{ item.title }}</strong>
        </span>
        <hr class="roleplay_options_hr">
        <span class="roleplay_options_content">{{ item.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface RoleplayOption {
  title: string;
  content: string;
}

const items = ref<RoleplayOption[]>([]);

function extract_items(): RoleplayOption[] {
  const chat_message = getChatMessages(getCurrentMessageId())[0];
  const text = chat_message.message.match(/<roleplay_options>(.*?)<\/roleplay_options>/s)?.[1] ?? '';

  const item_matches = [...text.matchAll(/(.+?)[:：]\s*(.+)/gm)];
  return item_matches.map(match => ({
    title: match[1],
    content: match[2].replace(/^\$\{(.+)\}$/, '$1').replace(/^「(.+)」$/, '$1')
  }));
}

onMounted(() => {
  items.value = extract_items();
});

async function handle_item_click(item: RoleplayOption) {
  await createChatMessages([{ role: 'user', message: item.content }]);
  triggerSlash('/trigger');
}
</script>

<style lang="scss" scoped>
.roleplay_options {
  &_back {
    background: linear-gradient(160deg, rgba(45, 45, 45, 0.75), rgba(35, 35, 35, 0.85));
    border-radius: 14px;
    box-shadow:
      0 10px 28px rgba(0, 0, 0, 0.15),
      0 3px 10px rgba(0, 0, 0, 0.12);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    max-width: 100%;
    margin: 20px 0;
  }

  &_title {
    font-size: 0.94em;
    font-weight: 600;
    color: #f0f0f0;
    padding-right: 12px;
    letter-spacing: 0.02em;
    text-align: left;
    margin-bottom: 4px;
  }

  &_content {
    font-size: 0.94em;
    line-height: 1.55;
    color: #c6c6c6;
    font-weight: normal;
    transition: color 0.25s ease;
    text-align: left;
    flex: 1;
    letter-spacing: 0.015em;
    overflow-wrap: anywhere;

    /* Long content will trigger this rule */
    &:not(:empty):not(.short-content)~.roleplay_options_title {
      width: 100%;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }

    /* JavaScript helper to add this class for single-line content */
    &.short-content {
      flex: 1;
    }
  }

  &_hr {
    display: none;
  }

  &_item {
    position: relative;
    background: rgba(50, 50, 50, 0.65);
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 14px 16px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    z-index: 1;
    margin: 2px 0;
    color: #d8d8d8;
    font-weight: 400;
    line-height: 1.5;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(90, 90, 90, 0.06) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: linear-gradient(to bottom, rgba(160, 160, 160, 0.6), rgba(180, 180, 180, 0.3));
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      background: rgba(58, 58, 58, 0.75);
      border-color: rgba(200, 200, 200, 0.12);

      &::after {
        opacity: 1;
      }

      .roleplay_options_content {
        color: #e2e2e2;
      }
    }

    &:active {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    }

    &:hover:before {
      transform: scaleY(1);
    }
  }
}

@media (max-width: 768px) {
  .roleplay_options {
    &_back {
      padding: 14px;
      gap: 8px;
    }

    &_item {
      padding: 12px 14px;
    }

    &_title {
      font-size: 0.9em;
      padding-right: 10px;
    }

    &_content {
      font-size: 0.9em;
      line-height: 1.5;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .roleplay_options {
    &_item {
      transition: none;

      &::before,
      &::after {
        transition: none;
      }
    }

    &_content,
    &_title {
      transition: none;
    }
  }
}
</style>
