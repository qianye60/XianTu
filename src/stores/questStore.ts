import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { get } from 'lodash';
import { useGameStateStore } from './gameStateStore';
import { generateQuest, completeQuest } from '@/utils/generators/questGenerators';
import type { Quest, QuestObjective, QuestType } from '@/types/game';
import { toast } from '@/utils/toast';

interface QuestConfig {
  启用系统任务: boolean;
  系统任务类型: string;
  系统任务提示词: string;
  自动刷新: boolean;
  默认任务数量: number;
}

export const useQuestStore = defineStore('quest', () => {
  const gameStateStore = useGameStateStore();
  const isGenerating = ref(false);

  // 清理无效任务数据
  if (gameStateStore.questSystem?.当前任务列表) {
    const before = gameStateStore.questSystem.当前任务列表.length;
    gameStateStore.questSystem.当前任务列表 = gameStateStore.questSystem.当前任务列表.filter(
      (q: Quest) => q && q.任务ID && q.任务名称
    );
    const after = gameStateStore.questSystem.当前任务列表.length;
    if (before !== after) {
      console.log(`[任务系统] 已清理 ${before - after} 个无效任务`);
      gameStateStore.saveGame();
    }
  }

  // 任务配置
  const questConfig = computed<QuestConfig>(() => {
    const config = gameStateStore.questSystem?.配置;
    return {
      启用系统任务: config?.启用系统任务 ?? false,
      系统任务类型: config?.系统任务类型 ?? '修仙辅助系统',
      默认任务数量: config?.默认任务数量 ?? 3,
      自动刷新: config?.自动刷新 ?? true,
      系统任务提示词: config?.系统任务提示词 ?? ''
    };
  });

  // 所有任务的单一真实来源（过滤掉null和无效任务）
  const currentQuests = computed<Quest[]>(() =>
    (gameStateStore.questSystem?.当前任务列表 || []).filter((q: Quest) => q && q.任务ID && q.任务名称)
  );

  // 已完成的任务列表 (动态计算)
  const completedQuests = computed(() =>
    currentQuests.value.filter((q: Quest) => q && q.任务状态 === '已完成')
  );

  // 进行中的任务 (动态计算)
  const activeQuests = computed(() =>
    currentQuests.value.filter((q: Quest) => q && (q.任务状态 === '进行中' || !q.任务状态)) // 兼容没有状态的旧任务
  );

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
      if (!gameStateStore.questSystem) {
        console.error('[任务系统] 任务系统未初始化');
        toast.error('任务系统未初始化', { id: toastId });
        return;
      }

      gameStateStore.questSystem.当前任务列表.push(quest);
      console.log('[任务系统] 任务已添加到列表:', quest.任务名称);

      // 保存到存档
      await gameStateStore.saveGame();
      console.log('[任务系统] 任务已保存到存档');

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
    if (!gameStateStore.questSystem) return;

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
    if (!gameStateStore.questSystem) {
      console.error('[任务系统] 任务系统未初始化');
      toast.error('任务系统未初始化');
      return;
    }

    const quest = gameStateStore.questSystem.当前任务列表.find((q: Quest) => q.任务ID === questId);
    if (!quest) {
      console.error('[任务系统] 未找到任务:', questId);
      return;
    }

    // 强制更新所有已达到进度的目标状态
    quest.目标列表.forEach((obj: QuestObjective) => {
      if (obj.当前进度 >= obj.需求数量) {
        obj.已完成 = true;
      }
    });

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

      // 更新任务状态，不再移动任务
      quest.任务状态 = '已完成';
      quest.完成时间 = new Date().toISOString();

      // 更新统计
      gameStateStore.questSystem.任务统计.完成总数 += 1;
      // 按类型统计
      if (!gameStateStore.questSystem.任务统计.各类型完成) {
        gameStateStore.questSystem.任务统计.各类型完成 = {} as Record<QuestType, number>;
      }
      const currentCount = gameStateStore.questSystem.任务统计.各类型完成[quest.任务类型] || 0;
      gameStateStore.questSystem.任务统计.各类型完成[quest.任务类型] = currentCount + 1;

      // 🔥 保存到存档
      await gameStateStore.saveGame();
      console.log('[任务系统] 任务完成状态已保存到存档');

      toast.success(`任务完成：${quest.任务名称}`, { id: toastId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`完成任务失败：${errorMessage}`, { id: toastId });
    }
  }

  /**
   * 更新任务配置
   */
  async function updateQuestConfig(config: QuestConfig) {
    if (!gameStateStore.questSystem) {
      gameStateStore.questSystem = {
        当前任务列表: [],
        任务统计: {
          完成总数: 0,
          各类型完成: {} as Record<QuestType, number>
        },
        配置: config
      };
    } else {
      gameStateStore.questSystem.配置 = config;
    }

    await gameStateStore.saveGame();
    toast.success('任务配置已保存');
  }

  /**
   * 删除任务
   */
  async function deleteQuest(questId: string) {
    if (!gameStateStore.questSystem) {
      console.error('[任务系统] 任务系统未初始化');
      toast.error('任务系统未初始化');
      return;
    }

    const questIndex = gameStateStore.questSystem.当前任务列表.findIndex((q: Quest) => q.任务ID === questId);

    if (questIndex === -1) {
      console.error('[任务系统] 未找到任务:', questId);
      toast.error('未找到该任务');
      return;
    }

    const quest = gameStateStore.questSystem.当前任务列表[questIndex];

    try {
      // 从单一列表中移除
      gameStateStore.questSystem.当前任务列表.splice(questIndex, 1);

      // 保存到存档
      await gameStateStore.saveGame();

      toast.success(`已删除任务：${quest.任务名称}`);
      console.log('[任务系统] 任务已删除:', quest.任务名称);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[任务系统] 删除任务失败:', error);
      toast.error(`删除任务失败：${errorMessage}`);
    }
  }

  /**
   * 接取任务
   */
  async function acceptQuest(questId: string) {
    if (!gameStateStore.questSystem) {
      console.error('[任务系统] 任务系统未初始化');
      toast.error('任务系统未初始化');
      return;
    }

    const quest = gameStateStore.questSystem.当前任务列表.find((q: Quest) => q.任务ID === questId);

    if (!quest) {
      console.error('[任务系统] 未找到任务:', questId);
      toast.error('未找到该任务');
      return;
    }

    quest.任务状态 = '进行中';
    await gameStateStore.saveGame();
    console.log('[任务系统] 任务已接取:', quest.任务名称);
  }

  /**
   * 放弃任务
   */
  async function abandonQuest(questId: string) {
    if (!gameStateStore.questSystem) {
      console.error('[任务系统] 任务系统未初始化');
      toast.error('任务系统未初始化');
      return;
    }

    const quest = gameStateStore.questSystem.当前任务列表.find((q: Quest) => q.任务ID === questId);

    if (!quest) {
      console.error('[任务系统] 未找到任务:', questId);
      toast.error('未找到该任务');
      return;
    }

    // 重置任务状态和进度
    quest.任务状态 = undefined;
    quest.目标列表.forEach((obj: QuestObjective) => {
      obj.当前进度 = 0;
      obj.已完成 = false;
    });

    await gameStateStore.saveGame();
    console.log('[任务系统] 任务已放弃:', quest.任务名称);
  }

  /**
   * 设置追踪任务
   */
  const trackedQuestId = ref<string | null>(null);

  function setTrackedQuest(questId: string | null) {
    trackedQuestId.value = questId;
  }

  const trackedQuest = computed(() => {
    if (!trackedQuestId.value) return null;
    return currentQuests.value.find((q: Quest) => q.任务ID === trackedQuestId.value) || null;
  });

  return {
    currentQuests,
    activeQuests,
    completedQuests,
    questConfig,
    isGenerating,
    trackedQuestId,
    trackedQuest,
    generateNewQuest,
    checkQuestObjective,
    finishQuest,
    updateQuestConfig,
    deleteQuest,
    acceptQuest,
    abandonQuest,
    setTrackedQuest,
  };
});
