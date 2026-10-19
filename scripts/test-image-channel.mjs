import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import {
  buildGptImageBody,
  buildNaiBody,
  gptImagesUrl,
  gptModelsUrl,
  imageErrorMessage,
  naiGenerateUrl,
  naiModelsUrl,
  parseImagePlaceholders,
  readNaiPayload,
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

assert.equal(naiGenerateUrl('https://create.suanbohe.com'), 'https://create.suanbohe.com/ai/generate-image');
assert.equal(naiGenerateUrl('https://dangao.iisbo.com/'), 'https://dangao.iisbo.com/ai/generate-image');
assert.equal(naiGenerateUrl('https://create.suanbohe.com/api'), 'https://create.suanbohe.com/api/ai/generate-image');
assert.equal(naiModelsUrl('https://create.suanbohe.com/api'), 'https://create.suanbohe.com/api/models');
assert.equal(gptImagesUrl('https://api.openai.com'), 'https://api.openai.com/v1/images/generations');
assert.equal(gptImagesUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1/images/generations');
assert.equal(gptModelsUrl('https://example.com/v1'), 'https://example.com/v1/models');
assert.match(imageErrorMessage({ statusCode: 402, message: '额度不足', code: 'NO_CREDIT' }, 402), /额度不足/);

function zipLocal(name, raw, method, compressed) {
  const nameBuf = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const localRecord = Buffer.concat([local, nameBuf, compressed]);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + nameBuf.length, 12);
  end.writeUInt32LE(localRecord.length, 16);
  return Buffer.concat([localRecord, central, nameBuf, end]);
}

function asArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 8, 7]);
const zipped = await readNaiPayload(asArrayBuffer(zipLocal('image_0.png', png, 8, deflateRawSync(png))));
assert.deepEqual(Buffer.from(zipped.bytes), png);
assert.equal(zipped.mime, 'image/png');

const jsonPayload = Buffer.from(JSON.stringify({ images: [{ image: 'QUJD', seed: 7 }] }));
const parsed = await readNaiPayload(asArrayBuffer(jsonPayload));
assert.equal(parsed.base64, 'QUJD');
assert.equal(parsed.seed, 7);

const live = await fetch('https://create.suanbohe.com/api/models');
assert.ok(live.status === 401 || live.status === 403, `models endpoint status ${live.status}`);

console.log('image channel checks passed');
