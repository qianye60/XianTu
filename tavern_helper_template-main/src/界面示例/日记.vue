<template>
  <div class="clickdiv" tabindex="1" @click="$router.push('/选择框')">
    <span class="message-content font-bold underline">{{ display_text }}</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const display_text = ref('');

function captureDisplayText() {
  // 通过 substitudeMacros 我们可以解析酒馆宏
  const character_name = substitudeMacros('{{char}}');

  // 通过 getCurrentMessageId 我们可以获取界面所在的楼层号
  const message_id = getCurrentMessageId();
  // 通过 getChatMessages 我们可以获取楼层内容
  const chat_message = getChatMessages(message_id)[0];
  // 我们可以从楼层的消息中通过正则提取出对话内容, 由于这是在代码中做, 相比起直接用酒馆正则会更加方便: 我们完全可以用其他代码对文本进行更多处理
  const dialogue = chat_message.message.match(/\[查看日记[:：]\s*(.+)\]/)?.[1] ?? '';

  const text = `${character_name}: ${dialogue}`;
  display_text.value = text;
}

onMounted(() => {
  captureDisplayText();
});
</script>

<style lang="scss" scoped>
body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  margin: 0;
  padding: 0;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: 0.7px;
  color: #7d6b6e;
  font-weight: bold;
  text-shadow: 0px 1px 1px rgba(255, 255, 255, 0.5);
}

.clickdiv {
  position: relative;
  margin: 10px;
  max-width: 150px;
  padding: 0.8em 1.2em;
  background: linear-gradient(135deg, rgba(255, 235, 240, 0.62), rgba(255, 202, 215, 0.62));
  border-radius: 16px;
  cursor: pointer;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(145, 125, 138, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 -3px 3px rgba(255, 255, 255, 0.25) inset;
  backdrop-filter: blur(13px);
  -webkit-backdrop-filter: blur(13px);
  transition: all 0.3s ease;
  overflow: hidden;

  &:after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 65%);
    opacity: 0.4;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 15px rgba(145, 125, 138, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
      0 -3px 3px rgba(255, 255, 255, 0.35) inset;
    background: linear-gradient(135deg, rgba(255, 235, 240, 0.7), rgba(255, 202, 215, 0.7));
  }

  &:active {
    transform: translateY(0);
    box-shadow:
      0 2px 8px rgba(145, 125, 138, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.4) inset;
  }

  @media (max-width: 999px) {
    padding: 0.7em 1em;
    font-size: 13px;
    max-width: 240px;
  }
}
</style>
