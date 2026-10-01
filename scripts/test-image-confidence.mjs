import {
  harvestStoryImages,
  ensureStoryImages,
  parseStoryImagesFromObject,
  IMAGE_PROMPT_RULES,
} from '../src/services/imagePlaceholders.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) 双引号破 JSON：必须能捞回
const broken = '{"text":"开场\\n[[image prompt="hero on cliff" size="1024x1024"]]"}';
const a = harvestStoryImages({ text: '', raw: broken });
assert(a.images[0]?.prompt === 'hero on cliff', 'recover broken json');

// 2) story_image 字段
const b = parseStoryImagesFromObject({ story_image: { prompt: 'lotus', size: '832x1216' } });
assert(b[0]?.prompt === 'lotus' && b[0]?.size === '832x1216', 'story_image field');

// 3) 单引号安全写法
const c = harvestStoryImages({ text: "正文\n[[image prompt='mist temple' size='1216x832']]" });
assert(c.images[0]?.prompt === 'mist temple', 'single quote prompt');
assert(!c.text.includes('[[image'), 'strip marker');

// 4) 无标记兜底
const d = ensureStoryImages([], '青衣女子立于断桥之上，手中长剑映出冷光，山门隐于雾中，鹤影掠过松涛之间。');
assert(d.length === 1 && d[0].prompt.includes('xianxia'), `fallback got ${JSON.stringify(d)}`);

// 5) 已有标记不重复兜底
const e = ensureStoryImages([{ prompt: 'keep', size: '1024x1024' }], '很长的正文用来触发兜底但是不应覆盖已有标记内容啊啊啊啊啊啊啊啊');
assert(e[0]?.prompt === 'keep', 'keep existing');

// 6) 规则已改掉双引号推荐
assert(IMAGE_PROMPT_RULES.includes('story_image'), 'rules mention story_image');
assert(IMAGE_PROMPT_RULES.includes("prompt='画面描述'"), 'rules prefer single quotes');

console.log('PASS image confidence checks');
