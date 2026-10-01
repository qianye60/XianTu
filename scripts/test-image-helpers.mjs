import {
  takeImagePlaceholders,
  harvestStoryImages,
  ensureStoryImages,
  buildFallbackStoryImage,
  parseStoryImagesFromObject,
  naiGenerateUrl,
  naiModelsUrl,
  gptImagesUrl,
  gptModelsUrl,
  buildNaiBody,
  buildGptImageBody,
  snapNaiSize,
  normalizeImageSize,
} from '../src/services/imagePlaceholders.ts';

const peeled = takeImagePlaceholders("先写。\n[[image prompt='1girl, garden' size='832x1216']]\n再写。");
if (peeled.images.length !== 1) throw new Error('parse images single-quote');
if (peeled.images[0].size !== '832x1216') throw new Error('parse size');
if (peeled.text.includes('[[image')) throw new Error('strip failed');

const legacy = takeImagePlaceholders('旧写法\n[[image prompt="swordfight" size="1024x1024"]]');
if (legacy.images[0]?.prompt !== 'swordfight') throw new Error('legacy double-quote');

const pipe = takeImagePlaceholders('管道\n[[image|misty mountain temple|1216x832]]');
if (pipe.images[0]?.prompt !== 'misty mountain temple') throw new Error('pipe prompt');
if (pipe.images[0]?.size !== '1216x832') throw new Error('pipe size');

// 双引号标记嵌在破损 JSON 里时，仍能从 raw 捞回
const broken = '{"text":"山门大开\\n[[image prompt="a Daoist at the gate" size="1024x1024"]]"}';
const recovered = harvestStoryImages({ text: '', raw: broken });
if (recovered.images[0]?.prompt !== 'a Daoist at the gate') {
  throw new Error(`recover from broken json: ${JSON.stringify(recovered.images)}`);
}

const fromObj = parseStoryImagesFromObject({
  story_image: { prompt: 'crimson lotus', size: '832x1216' },
});
if (fromObj[0]?.prompt !== 'crimson lotus') throw new Error('story_image field');

const ensured = ensureStoryImages([], '雾气散去，青衣女子立于断桥之上，手中长剑映出冷光，远处山门隐约可见，松涛阵阵，鹤影掠过云端。');
if (!ensured.length) throw new Error('fallback missing');
if (buildFallbackStoryImage('太短了') !== null) throw new Error('short should be null');

if (naiGenerateUrl('https://create.suanbohe.com') !== 'https://create.suanbohe.com/api/ai/generate-image') {
  throw new Error('nai generate url');
}
if (naiModelsUrl('https://create.suanbohe.com/api') !== 'https://create.suanbohe.com/api/models') {
  throw new Error('nai models url');
}
if (gptImagesUrl('https://api.openai.com') !== 'https://api.openai.com/v1/images/generations') {
  throw new Error('gpt images url');
}
if (gptModelsUrl('https://api.openai.com/v1') !== 'https://api.openai.com/v1/models') {
  throw new Error('gpt models url');
}

const nai = buildNaiBody({
  prompt: 'a',
  model: 'nai-diffusion-4-5-full',
  size: '1024x1024',
  steps: 23,
  scale: 7,
  negative: 'low quality',
});
if (nai.action !== 'generate') throw new Error('nai action');
if (nai.parameters.n_samples !== 1) throw new Error('nai n_samples');

const gpt = buildGptImageBody({ prompt: 'a', model: 'gpt-image-1', size: '832x1216' });
if (gpt.size !== '1024x1536') throw new Error(`gpt size ${gpt.size}`);
if (gpt.output_format !== 'png') throw new Error('gpt output_format');

if (snapNaiSize(1000, 1000).width % 64 !== 0) throw new Error('snap');
if (normalizeImageSize('bad') !== '1024x1024') throw new Error('normalize');

console.log('PASS image helpers');
