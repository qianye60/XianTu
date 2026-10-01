import assert from 'node:assert/strict';
import {
  buildGptImageBody,
  buildNaiBody,
  gptImagesUrl,
  gptModelsUrl,
  imageErrorMessage,
  naiGenerateUrl,
  naiModelsUrl,
  parseImagePlaceholders,
  stripImagePlaceholders,
  takeImagePlaceholders,
} from '../src/services/imagePlaceholders.ts';

const reply = '山风穿过竹林。\n[[image prompt="1girl, bamboo forest, ink wash" size="832x1216"]]\n她停下脚步。';
const images = parseImagePlaceholders(reply);
assert.equal(images.length, 1);
assert.equal(images[0].prompt, '1girl, bamboo forest, ink wash');
assert.equal(images[0].size, '832x1216');
assert.equal(stripImagePlaceholders(reply).includes('[[image'), false);
assert.equal(takeImagePlaceholders('[[image prompt="only" size="999x999"]]').images[0].size, '1024x1024');
assert.equal(parseImagePlaceholders('前文 [[image prompt="broken').length, 0);

const nai = buildNaiBody({
  prompt: 'garden',
  model: 'nai-diffusion-4-5-full',
  size: '832x1216',
  steps: 99,
  scale: 5,
  negative: 'blurry',
});
assert.equal(nai.action, 'generate');
assert.equal(nai.parameters.n_samples, 1);
assert.equal(nai.parameters.steps, 28);
assert.equal(nai.parameters.width % 64, 0);
assert.ok(nai.parameters.width * nai.parameters.height <= 1048576);

const gpt = buildGptImageBody({ prompt: 'garden', model: 'gpt-image-1', size: '832x1216' });
assert.equal(gpt.size, '1024x1536');
assert.equal(gpt.output_format, 'png');
assert.equal(gpt.n, 1);
assert.equal(buildGptImageBody({ prompt: 'x', model: 'dall-e-3', size: '1216x832' }).response_format, 'b64_json');

assert.equal(naiGenerateUrl('https://create.suanbohe.com'), 'https://create.suanbohe.com/api/ai/generate-image');
assert.equal(naiGenerateUrl('https://create.suanbohe.com/api'), 'https://create.suanbohe.com/api/ai/generate-image');
assert.equal(naiModelsUrl('https://create.suanbohe.com/api'), 'https://create.suanbohe.com/api/models');
assert.equal(gptImagesUrl('https://api.openai.com'), 'https://api.openai.com/v1/images/generations');
assert.equal(gptImagesUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1/images/generations');
assert.equal(gptModelsUrl('https://example.com/v1'), 'https://example.com/v1/models');
assert.match(imageErrorMessage({ statusCode: 402, message: '额度不足', code: 'NO_CREDIT' }, 402), /额度不足/);

const live = await fetch('https://create.suanbohe.com/api/models');
assert.ok(live.status === 401 || live.status === 403, `models endpoint status ${live.status}`);

console.log('image channel checks passed');
