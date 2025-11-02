const fs = require('fs');

const content = fs.readFileSync('src/i18n/index.ts', 'utf-8');

// 提取映射表部分
const start = content.indexOf('const autoTranslateMap');
const end = content.indexOf('\n}', start) + 2;
const before = content.slice(0, start);
const after = content.slice(end);
let mapSection = content.slice(start, end);

// 反转所有 'key': 'value' 为 'value': 'key'
mapSection = mapSection.replace(/'([^']+)':\s*'([^']+)'/g, (match, key, value) => {
  return `'${value}': '${key}'`;
});

// 写回文件
fs.writeFileSync('src/i18n/index.ts', before + mapSection + after, 'utf-8');
console.log('✅ 映射表已反转');
