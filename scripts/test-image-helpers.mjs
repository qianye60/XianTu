import {
  takeImagePlaceholders,
  naiGenerateUrl,
  naiModelsUrl,
  gptImagesUrl,
  gptModelsUrl,
  buildNaiBody,
  buildGptImageBody,
  snapNaiSize,
  normalizeImageSize,
} from '../src/services/imagePlaceholders.ts';

const peeled = takeImagePlaceholders('先写。\n[[image prompt="1girl, garden" size="832x1216"]]\n再写。');
if (peeled.images.length !== 1) throw new Error('parse images');
if (peeled.images[0].size !== '832x1216') throw new Error('parse size');
if (peeled.text.includes('[[image')) throw new Error('strip failed');

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
