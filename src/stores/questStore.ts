import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { get } from 'lodash';
import { useGameStateStore } from './gameStateStore';
import { generateQuest, completeQuest } from '@/utils/generators/questGenerators';
import type { Quest, QuestObjective } from '@/types/game';
import { toast } from '@/utils/toast';

export const useQuestStore = defineStore('quest', () => {
  const gameStateStore = useGameStateStore();
  const isGenerating = ref(false);

  // 当前任务列表
  const currentQuests = computed(() => gameStateStore.任务系统?.当前任务列表 || []);

  // 已完成的任务列表
  const completedQuests = computed(() => gameStateStore.任务系统?.已完成任务 || []);

  // 进行中的任务
  const activeQuests = computed(() => {
    return currentQuests.value.filter((q: Quest) => q.任务状态 === '进行中');
  });

  /**
   * 生成新任务
   */
  async function generateNewQuest() {
    if (isGenerating.value) return;
    const saveData = gameStateStore.toSaveData();
    if (!saveData) {
      toast.error('请先加载存档');
      return;
    }

    isGenerating.value = true;
    const toastId = toast.loading('天机运转中，正在推演机缘...');

    try {
      const quest = await generateQuest(saveData);

      if (!quest) {
        toast.error('天机混沌，暂无机缘', { id: toastId });
        return;
      }

      // 添加到存档
      gameStateStore.任务系统?.当前任务列表.push(quest);

      toast.success(`新任务：${quest.任务名称}`, { id: toastId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`生成任务失败：${errorMessage}`, { id: toastId });
    } finally {
      isGenerating.value = false;
    }
  }

  /**
   * 检查任务目标完成情况
   */
  function checkQuestObjective(questId: string, objectiveType: string, targetId: string) {
    if (!gameStateStore.任务系统) return;

    const quest = currentQuests.value.find((q: Quest) => q.任务ID === questId);
    if (!quest) return;

    const objective = quest.目标列表.find(
      (obj: QuestObjective) => obj.类型 === objectiveType && obj.目标ID === targetId
    );

    if (objective && !objective.已完成) {
      objective.当前进度 += 1;

      if (objective.当前进度 >= objective.需求数量) {
        objective.已完成 = true;
        toast.success(`任务目标完成：${objective.描述}`);

        // 检查是否所有目标都已完成
        const allCompleted = quest.目标列表.every((obj: QuestObjective) => obj.已完成);
        if (allCompleted) {
          finishQuest(questId);
        }
      }
    }
  }

  /**
   * 完成任务并领取奖励
   */
  async function finishQuest(questId: string) {
    if (!gameStateStore.任务系统) return;

    const questIndex = currentQuests.value.findIndex((q: Quest) => q.任务ID === questId);
    const quest = currentQuests.value[questIndex];
    if (!quest) return;

    const toastId = toast.loading('正在结算任务奖励...');

    try {
      const result = await completeQuest(quest);

      // 执行奖励指令
      if (result?.tavern_commands) {
        for (const cmd of result.tavern_commands) {
          if (cmd.action === 'set') {
            gameStateStore.updateState(cmd.key, cmd.value);
          } else if (cmd.action === 'add') {
            const current = get(gameStateStore, cmd.key, 0) as number;
            gameStateStore.updateState(cmd.key, current + Number(cmd.value));
          }
        }
      }

      // 更新任务状态并移动到已完成列表
      quest.任务状态 = '已完成';
      quest.完成时间 = new Date().toISOString();
      gameStateStore.任务系统.已完成任务.push(quest);
      gameStateStore.任务系统.当前任务列表.splice(questIndex, 1);

      // 更新统计
      gameStateStore.任务系统.任务统计.完成总数 += 1;
      if (quest.任务类型 === '主线') {
        gameStateStore.任务系统.任务统计.主线完成 += 1;
      } else {
        gameStateStore.任务系统.任务统计.支线完成 += 1;
      }

      toast.success(`任务完成：${quest.任务名称}`, { id: toastId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`完成任务失败：${errorMessage}`, { id: toastId });
    }
  }

  return {
    currentQuests,
    activeQuests,
    completedQuests,
    isGenerating,
    generateNewQuest,
    checkQuestObjective,
    finishQuest,
  };
});