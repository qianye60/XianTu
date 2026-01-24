/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const content = fs.readFileSync('src/i18n/index.ts', 'utf8');
const lines = content.split('\n');
const keys = {};

lines.forEach((line, idx) => {
  const match = line.match(/^\s+'([^']+)':/);
  if (match) {
    const key = match[1];
    if (keys[key]) {
      console.log(`Duplicate key '${key}' at lines ${keys[key]} and ${idx + 1}`);
    } else {
      keys[key] = idx + 1;
    }
  }
});
