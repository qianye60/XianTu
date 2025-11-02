const fs = require('fs');

const files = [
  'src/components/dashboard/QuestPanel.vue',
  'src/components/dashboard/RelationshipNetworkPanel.vue',
  'src/components/dashboard/SavePanel.vue',
  'src/components/dashboard/SectPanel.vue',
  'src/components/dashboard/SkillsPanel.vue',
  'src/components/dashboard/ThousandDaoPanel.vue',
  'src/components/dashboard/WorldMapPanel.vue'
];

const allTexts = new Set();

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');

    // 查找模板中的中文文本（不在 t() 或 $t() 中）
    // 匹配 >中文< 或 "中文" 或 '中文' 但不在 t( 或 $t( 后面
    const patterns = [
      />([^<]*[\u4e00-\u9fa5]+[^<]*)</g,  // >中文<
      /"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g,  // "中文"
      /'([^']*[\u4e00-\u9fa5]+[^']*)'/g   // '中文'
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1].trim();
        // 排除已经在 t() 或 $t() 中的
        const before = content.substring(Math.max(0, match.index - 10), match.index);
        if (!before.includes('t(') && !before.includes('$t(') && text.length > 0) {
          // 只提取纯中文部分
          const chineseOnly = text.match(/[\u4e00-\u9fa5]+/g);
          if (chineseOnly) {
            chineseOnly.forEach(t => {
              if (t.length >= 2) allTexts.add(t);
            });
          }
        }
      }
    });
  } catch (e) {
    console.error('Error reading', file, e.message);
  }
});

console.log('需要翻译的文本（共', allTexts.size, '个）：');
Array.from(allTexts).sort().forEach(text => {
  console.log(text);
});
