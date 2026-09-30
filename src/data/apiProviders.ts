/**
 * API 管理用到的静态数据：服务商图标与选项、常用模型预设、功能名称与说明。
 */
import type { APIProvider } from '@/services/aiService';
import type { APIUsageType } from '@/stores/apiManagementStore';
import openaiIcon from '@/assets/provider-icons/openai-green.png';
import anthropicIcon from '@/assets/provider-icons/anthropic.png';
import geminiIcon from '@/assets/provider-icons/gemini.png';
import deepseekIcon from '@/assets/provider-icons/deepseek.png';
import zhipuIcon from '@/assets/provider-icons/zhipu.png';
import doubaoIcon from '@/assets/provider-icons/doubao.png';
import siliconcloudIcon from '@/assets/provider-icons/siliconcloud.png';

export interface ModelPreset {
  id: string;
  name: string;
  context: string;
  maxOutput: string;
  description: string;
  maxTokens: number;
  temperature?: number;
  json?: boolean;
}

export const PROVIDER_ICONS: Partial<Record<APIProvider, string>> = {
  openai: openaiIcon,
  claude: anthropicIcon,
  gemini: geminiIcon,
  deepseek: deepseekIcon,
  zhipu: zhipuIcon,
  volcengine: doubaoIcon,
  'siliconflow-embedding': siliconcloudIcon,
};

export const PROVIDER_OPTIONS: Array<{ value: APIProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'zhipu', label: '智谱 AI' },
  { value: 'volcengine', label: '豆包' },
  { value: 'siliconflow-embedding', label: '硅基流动' },
  { value: 'nai', label: 'NAI 生图' },
  { value: 'gpt-image', label: 'GPT 生图' },
  { value: 'custom', label: '自定义' },
];

/** 只发向量、不走对话接口的渠道 */
export const isEmbeddingProvider = (provider?: APIProvider) => provider === 'siliconflow-embedding';

/** 只生生图、不走对话接口的渠道 */
export const isImageProvider = (provider?: APIProvider) => provider === 'nai' || provider === 'gpt-image';

export const CHAT_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter((p) => !isEmbeddingProvider(p.value) && !isImageProvider(p.value));
export const EMBEDDING_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter((p) => isEmbeddingProvider(p.value));
export const IMAGE_PROVIDER_OPTIONS = PROVIDER_OPTIONS.filter((p) => isImageProvider(p.value));

export const MODEL_PRESETS: Record<APIProvider, ModelPreset[]> = {
  openai: [
    { id: 'gpt-6-astra', name: 'GPT-6 Astra', context: '1.05M 上下文', maxOutput: '128K', maxTokens: 32000, description: '旗舰推理模型，适合主流程与复杂剧情', json: true },
    { id: 'gpt-6-sol', name: 'GPT-6 Sol', context: '1.05M 上下文', maxOutput: '128K', maxTokens: 24000, description: '质量与成本平衡，适合日常游戏流程', temperature: 0.7, json: true },
    { id: 'gpt-6-luna', name: 'GPT-6 Luna', context: '1.05M 上下文', maxOutput: '128K', maxTokens: 16000, description: '高吞吐轻量模型，适合总结与辅助功能', temperature: 0.7, json: true },
  ],
  claude: [
    { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', context: '1M 上下文', maxOutput: '128K', maxTokens: 32000, description: '当前最新旗舰，适合长程剧情与复杂推理', json: true },
    { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', context: '1M 上下文', maxOutput: '128K', maxTokens: 24000, description: '高质量推理与长文叙事模型', json: true },
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', context: '1M 上下文', maxOutput: '128K', maxTokens: 20000, description: '速度与质量平衡，适合主流程', json: true },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', context: '200K 上下文', maxOutput: '64K', maxTokens: 12000, description: '轻量快速，适合摘要和文本润色', json: true },
  ],
  gemini: [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', context: '1M 上下文', maxOutput: '65K', maxTokens: 32000, description: '高级推理与复杂任务，适合主流程', json: true },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', context: '1M 上下文', maxOutput: '65K', maxTokens: 16000, description: '最新稳定 Flash，适合日常游戏流程', json: true },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', context: '1M 上下文', maxOutput: '32K', maxTokens: 12000, description: '高吞吐低成本，适合辅助功能', json: true },
  ],
  deepseek: [
    { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', context: '1M 上下文', maxOutput: '384K', maxTokens: 64000, description: '最新多模态 Flash，适合主流程与高吞吐任务', json: true },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', context: '1M 上下文', maxOutput: '384K', maxTokens: 64000, description: '旗舰推理模型，适合复杂剧情和指令生成', json: true },
  ],
  zhipu: [
    { id: 'glm-5.3', name: 'GLM-5.3', context: '256K 上下文', maxOutput: '64K', maxTokens: 32000, description: '旗舰中文推理模型，适合主流程', json: true },
    { id: 'glm-5.3-flash', name: 'GLM-5.3 Flash', context: '256K 上下文', maxOutput: '64K', maxTokens: 24000, description: '最新高性价比模型，适合日常游戏流程', json: true },
  ],
  volcengine: [
    { id: 'doubao-seed-evolving', name: '豆包 Seed Evolving', context: '1M 上下文', maxOutput: '256K', maxTokens: 64000, description: '持续升级的 Agent 模型，适合长程剧情', json: true },
    { id: 'doubao-seed-2-1-pro-260915', name: '豆包 Seed 2.1 Pro', context: '1M 上下文', maxOutput: '256K', maxTokens: 64000, description: '旗舰多模态与推理模型', json: true },
    { id: 'doubao-seed-2-1-lite-260915', name: '豆包 Seed 2.1 Lite', context: '1M 上下文', maxOutput: '256K', maxTokens: 32000, description: '高吞吐低成本，适合辅助功能', json: true },
  ],
  'siliconflow-embedding': [
    { id: 'BAAI/bge-m3', name: 'BAAI/bge-m3', context: '8192 token', maxOutput: '1024 维', maxTokens: 1024, description: '多语种向量，适合叙事检索' },
    { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', context: '8192 token', maxOutput: '1024 维', maxTokens: 1024, description: 'bge-m3 的 Pro 线路' },
    { id: 'BAAI/bge-large-zh-v1.5', name: 'BAAI/bge-large-zh-v1.5', context: '512 token', maxOutput: '1024 维', maxTokens: 1024, description: '中文向量。超过约 480 字会被接口拒绝' },
    { id: 'BAAI/bge-large-en-v1.5', name: 'BAAI/bge-large-en-v1.5', context: '512 token', maxOutput: '1024 维', maxTokens: 1024, description: '英文向量，长度上限与中文版相同' },
    { id: 'Qwen/Qwen3-Embedding-0.6B', name: 'Qwen3-Embedding-0.6B', context: '32768 token', maxOutput: '1024 维', maxTokens: 1024, description: '默认 1024 维。dimensions 只能用文档列出的档位' },
    { id: 'Qwen/Qwen3-Embedding-4B', name: 'Qwen3-Embedding-4B', context: '32768 token', maxOutput: '2560 维', maxTokens: 1024, description: '默认 2560 维' },
    { id: 'Qwen/Qwen3-Embedding-8B', name: 'Qwen3-Embedding-8B', context: '32768 token', maxOutput: '最高 4096 维', maxTokens: 1024, description: 'Qwen3 向量。不传 dimensions 时用模型默认维度' },
  ],
  nai: [
    { id: 'nai-diffusion-4-5-full', name: 'NAI 4.5 Full', context: '文生图', maxOutput: '1024²', maxTokens: 1, description: 'NovelAI 4.5 完整模型' },
    { id: 'nai-diffusion-4-5-curated', name: 'NAI 4.5 Curated', context: '文生图', maxOutput: '1024²', maxTokens: 1, description: 'NovelAI 4.5 精选模型' },
    { id: 'nai-diffusion-5-full', name: 'NAI 5 Full', context: '文生图', maxOutput: '1024²', maxTokens: 1, description: 'NovelAI 5 完整模型' },
    { id: 'nai-diffusion-5-curated', name: 'NAI 5 Curated', context: '文生图', maxOutput: '1024²', maxTokens: 1, description: 'NovelAI 5 精选模型' },
  ],
  'gpt-image': [
    { id: 'gpt-image-1', name: 'GPT Image 1', context: '文生图', maxOutput: '1536px', maxTokens: 1, description: 'OpenAI 兼容 images/generations，和织界的 GPT 生图同一条协议' },
    { id: 'gpt-image-1.5', name: 'GPT Image 1.5', context: '文生图', maxOutput: '1536px', maxTokens: 1, description: '较新的 GPT 图片模型，仍走 images/generations' },
  ],
  custom: [],
};

export const findModelPreset = (provider: APIProvider | undefined, model: string | undefined) =>
  provider ? (MODEL_PRESETS[provider] || []).find((p) => p.id === model) : undefined;

export const FUNCTION_NAMES: Record<APIUsageType, string> = {
  main: '主流程',
  memory_summary: '记忆总结',
  embedding: '叙事检索 Embedding',
  text_optimization: '文本润色',
  instruction_generation: '指令生成（分步）',
  world_generation: '世界生成',
  event_generation: '事件生成',
  sect_generation: '宗门生成',
  crafting: '炼丹炼器',
  image: '剧情生图',
};

export const FUNCTION_DESCS: Record<APIUsageType, string> = {
  main: '生成正文、行动选项和游戏指令',
  memory_summary: '把较早的对话和 NPC 记忆压缩成摘要，可用便宜的快速模型',
  embedding: '把历史叙事转成向量，用于长程剧情检索',
  text_optimization: '对 AI 写出的正文再润色一遍（开启后每回合多一次调用）',
  instruction_generation: '分步生成的第 2 步：输出结构化游戏指令',
  world_generation: '开局与探索时生成世界、地点',
  event_generation: '生成世界大事件',
  sect_generation: '生成宗门的藏经阁、贡献商店等内容',
  crafting: '炼丹、炼器时的结果判定',
  image: '正文里出现插图标记时，把那一段交给生图渠道。不沿用对话模型',
};

/** 辅助功能（叙事检索的 Embedding 单独一组） */
export const AUX_FUNCTIONS: APIUsageType[] = ['memory_summary', 'text_optimization', 'world_generation', 'event_generation', 'sect_generation', 'crafting'];

/**
 * 会在请求里打开 JSON 模式的渠道。
 * OpenAI 兼容格式（OpenAI / 自定义 / 智谱 / 豆包）不提供这个开关。
 * DeepSeek 用 response_format，Gemini 用 response_mime_type。
 */
export const JSON_CAPABLE: APIProvider[] = ['deepseek', 'gemini'];

/** createEmbeddings 能发出请求的渠道。其余对话渠道没有向量接口。 */
export const EMBEDDING_USABLE: APIProvider[] = ['siliconflow-embedding', 'openai', 'deepseek', 'custom'];
