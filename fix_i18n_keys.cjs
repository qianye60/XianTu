const fs = require('fs');
const path = require('path');

// 英文key到中文key的映射
const keyMap = {
  'characterStatus': '角色状态',
  'cultivationStatus': '修行状态',
  'qi': '气血',
  'spiritual': '灵气',
  'consciousness': '神识',
  'lifespan': '寿元',
  'realmStatus': '境界状态',
  'memorySystemSettings': '记忆系统设置',
  'exportNovelDescription': '将完整的游戏对话历史（基于叙事历史）导出为小说格式，方便阅读和分享。',
  'exportAsNovel': '📖 导出为小说',
  'memorySystemConfig': '记忆系统配置',
  'addTestMemory': '添加测试中期记忆',
  'test': '测试',
  'shortTermMemoryLimit': '短期记忆上限（条）：',
  'default': '默认',
  'mediumTermMemoryThreshold': '中期记忆转化阈值（条）：',
  'mediumTermMemoryThresholdHint': '中期记忆达到此数量时，转化为长期记忆。默认：25',
  'mediumTermMemoryRetention': '中期记忆保留数量（条）：',
  'mediumTermMemoryRetentionHint': '转化为长期记忆时，保留最新的这么多条中期记忆。默认：8',
  'enableAutoMemoryConversion': '启用自动记忆转化',
  'autoMemoryConversionHint': '启用后，自动将中期记忆转化为长期记忆。禁用则不转化。',
  'customMediumTermFormat': '自定义中期记忆格式：',
  'customMemoryFormatPlaceholder': '留空使用默认格式。可自定义AI提示词来控制记忆的生成格式...',
  'customMediumTermFormatHint': '自定义中期记忆的AI提示词格式。留空使用系统默认。',
  'customLongTermFormat': '自定义长期记忆格式：',
  'customLongTermFormatHint': '自定义长期记忆的AI提示词格式。留空使用系统默认。',
  'saveConfiguration': '保存配置',
  'resetToDefault': '重置为默认',
  'currentMediumTermMemories': '当前中期记忆：',
  'items': '条',
  'autoSummaryTriggerHint': '（达到 {count} 条时将自动触发总结）',
  'manualSummaryRequirement': '至少需要 {count} 条中期记忆才能总结',
  'manualTriggerAISummary': '手动触发AI总结',
  'manualSummarize': '手动总结中期记忆',
  'readingMemories': '正在读取记忆...',
  'paginationInfo': '第 {currentPage} / {totalPages} 页，共 {total} 条记忆',
  'firstPage': '首页',
  'previousPage': '上一页',
  'nextPage': '下一页',
  'lastPage': '末页',
  'page': '页',
  'go': '跳转',
  'deleteThisMemory': '删除此记忆',
  'all': '全部',
  'shortTerm': '短期',
  'mediumTerm': '中期',
  'longTerm': '长期',
  'noCultivationInsights': '心如明镜，尚未记录任何修行感悟',
  'noMemoryOfType': '暂无{type}记忆',
  'shortTermMemory': '短期记忆',
  'mediumTermMemory': '中期记忆',
  'longTermMemory': '长期记忆',
  'unknown': '未知',
  'convertedAt': '转化于 {time}',
  'archivedAt': '归档于 {time}',
  'memoriesReorganized': '记忆已重新整理，旧记忆已转化',
  'clearMemories': '清空记忆',
  'confirmClearMemories': '确定要清空所有记忆吗？此操作不可撤销，同时会清空酒馆数据。',
  'confirmClear': '确认清空',
  'cancel': '取消',
  'memoriesCleared': '记忆已清空并同步到酒馆',
  'clearMemoriesFailed': '清空记忆失败，请重试',
  'insufficientMemoriesForSummary': '中期记忆不足，至少需要 {minRequired} 条才能总结',
  'deleteMemory': '删除记忆',
  'confirmDeleteMemory': '确定要删除这条{type}吗？此操作不可撤销。\n\n内容：{content}...',
  'delete': '删除',
  'memoryNotFound': '未找到要删除的记忆',
  'memoryDeleted': '已删除{type}',
  'deleteFailed': '删除失败：{error}',
  'cultivator': '修仙者',
  'cultivationWorld': '修仙世界',
  'noNarrativeHistoryToExport': '没有叙事历史可导出',
  'novelTitle': '《{characterName}的修仙历程》',
  'worldArchive': '世界档案',
  'exportTime': '导出时间',
  'totalParagraphs': '总段落数',
  'iSaid': '我说',
  'chapter': '第',
  'narrativeHistoryExported': '成功导出 {count} 条叙事历史',
  'exportFailed': '导出失败，请查看控制台',
  'testMemoryAdded': '✅ 测试记忆已添加！当前中期记忆：{count} 条',
  'addTestMemoryFailed': '添加测试记忆失败'
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [enKey, zhKey] of Object.entries(keyMap)) {
    // 替换 t('englishKey') 为 t('中文key')
    const regex1 = new RegExp(`t\\('${enKey}'\\)`, 'g');
    if (regex1.test(content)) {
      content = content.replace(regex1, `t('${zhKey}')`);
      changed = true;
    }

    // 替换 t("englishKey") 为 t('中文key')
    const regex2 = new RegExp(`t\\("${enKey}"\\)`, 'g');
    if (regex2.test(content)) {
      content = content.replace(regex2, `t('${zhKey}')`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 已更新: ${filePath}`);
    return true;
  }
  return false;
}

// 处理指定文件
const files = [
  'src/components/dashboard/RightSidebar.vue',
  'src/components/dashboard/MemoryCenterPanel.vue'
];

let totalUpdated = 0;
files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    if (replaceInFile(fullPath)) {
      totalUpdated++;
    }
  } else {
    console.log(`⚠️  文件不存在: ${file}`);
  }
});

console.log(`\n✅ 完成！共更新 ${totalUpdated} 个文件`);
