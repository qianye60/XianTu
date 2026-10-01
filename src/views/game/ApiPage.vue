<template>
  <div class="api-page">
    <div class="a-body">
      <PageTabs :model-value="tab" :tabs="tabs" label="API 管理分类" @update:model-value="onTab" />

      <!-- 公益 API：签到、一键切换、模型状态、提交渠道、排行榜 -->
      <div v-if="tab === 'public'" class="public-wrap">
        <PublicApiHall :loginable="false" />
      </div>

      <!-- API 配置 -->
      <ListDetail v-else-if="tab === 'apis'" class="a-main" :open="!!selected && detailOpen" :detail-width="420" detail-label="API 详情" @close="detailOpen = false">
        <template #list>
          <ul class="gm-list api-list">
            <li v-for="api in ownApis" :key="api.id">
              <div class="gm-row api-row" :class="{ active: selectedId === api.id, off: !api.enabled }">
                <button type="button" class="api-main" @click="pick(api.id)">
                  <span class="p-icon">
                    <img v-if="PROVIDER_ICONS[api.provider]" :src="PROVIDER_ICONS[api.provider]" :alt="providerName(api.provider)" />
                    <Server v-else :size="18" />
                  </span>
                  <span class="gm-row-main">
                    <span class="gm-row-title">
                      {{ m.displayName(api) }}
                      <SealBadge v-if="api.id === 'default'" tone="gold">默认</SealBadge>
                    </span>
                    <span class="gm-row-sub">
                      {{ providerName(api.provider) }} · {{ api.model }}
                      <SealBadge v-if="isEmbeddingProvider(api.provider)" tone="muted">向量</SealBadge>
                      <SealBadge v-else-if="isImageProvider(api.provider)" tone="muted">生图</SealBadge>
                    </span>
                  </span>
                  <span class="status" :class="m.testResults.value[api.id] || 'unknown'" :title="statusText(api.id)"></span>
                </button>
                <label v-if="api.id !== 'default'" class="gm-switch row-switch" :title="api.enabled ? '已启用' : '已停用'">
                  <input type="checkbox" :checked="api.enabled" :aria-label="`启用 ${api.name}`" @change="m.store.toggleAPI(api.id)" />
                  <span></span>
                </label>
              </div>
            </li>
          </ul>
          <button type="button" class="cc-btn add-btn" @click="openEditor(null)"><Plus :size="15" /><span>新增 API</span></button>
        </template>

        <template #detail>
          <div v-if="selected" class="detail">
            <div class="gm-detail-body">
              <header class="d-head">
                <span class="p-icon lg">
                  <img v-if="PROVIDER_ICONS[selected.provider]" :src="PROVIDER_ICONS[selected.provider]" :alt="providerName(selected.provider)" />
                  <Server v-else :size="22" />
                </span>
                <div>
                  <h2 class="d-name">{{ m.displayName(selected) }}</h2>
                  <p class="d-sub">{{ providerName(selected.provider) }} · {{ channelKind(selected.provider) }}</p>
                </div>
              </header>

              <p v-if="m.inTavern.value && selected.id === 'default'" class="d-note"><Beer :size="14" />酒馆环境下，默认 API 由酒馆管理。</p>
              <dl class="gm-kv d-kv">
                <dt>模型</dt><dd>{{ selected.model }}</dd>
                <template v-if="preset(selected)"><dt>规格</dt><dd>{{ preset(selected)!.context }} · 输出 {{ preset(selected)!.maxOutput }}</dd></template>
                <dt>地址</dt><dd class="mono">{{ selected.url || '—' }}</dd>
                <dt>请求接口</dt>
                <dd class="mono ep">
                  <span v-if="endpointOf(selected).base" class="ep-base">{{ endpointOf(selected).base }}</span><span class="ep-path">{{ endpointOf(selected).path }}</span>
                </dd>
                <dt>温度</dt><dd v-if="isChatProvider(selected.provider)">{{ selected.temperature }}</dd><dd v-else>—</dd>
                <dt>最大 Token</dt><dd v-if="isChatProvider(selected.provider)">{{ selected.maxTokens }}</dd><dd v-else>—</dd>
              </dl>
              <p v-if="preset(selected)" class="gm-muted">{{ preset(selected)!.description }}</p>

              <div v-if="JSON_CAPABLE.includes(selected.provider)" class="gm-form-row">
                <div class="gm-form-info">
                  <span class="gm-form-name">强制 JSON 输出</span>
                </div>
                <label class="gm-switch"><input type="checkbox" :checked="!!selected.forceJsonOutput" @change="setJson(selected, ($event.target as HTMLInputElement).checked)" /><span></span></label>
              </div>

              <section class="gm-section">
                <h4 class="gm-label">已分配功能</h4>
                <div v-if="m.assignedTo(selected.id).length" class="chips">
                  <span v-for="f in m.assignedTo(selected.id)" :key="f" class="gm-chip gold">{{ FUNCTION_NAMES[f] }}</span>
                </div>
                <p v-else class="gm-muted">暂未分配功能，可在「功能分配」里指定。</p>
              </section>
            </div>
            <footer class="gm-detail-foot">
              <button v-if="canSwitchTo(selected)" type="button" class="cc-btn primary" :disabled="isCurrentMain(selected)" @click="m.useForChat(selected)">
                <ArrowLeftRight :size="15" /><span>{{ isCurrentMain(selected) ? '当前主流程' : '一键切换' }}</span>
              </button>
              <button type="button" class="cc-btn" :disabled="!!m.testing.value" @click="m.test(selected)">
                <Loader2 v-if="m.testing.value === selected.id" :size="15" class="cc-spin" /><FlaskConical v-else :size="15" /><span>测试连接</span>
              </button>
              <button type="button" class="cc-btn" @click="openEditor(selected)"><Pencil :size="15" /><span>编辑</span></button>
              <button v-if="selected.id !== 'default'" type="button" class="cc-btn danger" @click="removeApi(selected)"><Trash2 :size="15" /><span>删除</span></button>
            </footer>
          </div>
          <EmptyState v-else glyph="契" title="选择一个 API" compact />
        </template>
      </ListDetail>

      <!-- 生成方式 -->
      <div v-else class="split">
        <div v-if="tab === 'gen'" class="form-col">
          <div class="gm-form-row">
            <div class="gm-form-info"><span class="gm-form-name">流式输出</span><span class="gm-form-desc">AI 回复边生成边显示，不用等整段写完</span></div>
            <label class="gm-switch"><input v-model="m.streaming.value" type="checkbox" /><span></span></label>
          </div>
          <div class="gm-form-row">
            <div class="gm-form-info">
              <span class="gm-form-name">分步生成</span>
              <span class="gm-form-desc">{{ m.split.value ? '每回合调用两次：第 1 步写正文和行动选项，第 2 步单独生成游戏指令' : '每回合调用一次，正文和指令一起生成。开启后更稳定，但多一次调用' }}</span>
            </div>
            <label class="gm-switch"><input v-model="m.split.value" type="checkbox" @change="m.saveSplit" /><span></span></label>
          </div>
          <template v-if="m.split.value">
            <div class="gm-form-row nested">
              <div class="gm-form-info"><span class="gm-form-name">第 2 步使用的 API</span><span class="gm-form-desc">负责输出结构化指令（JSON），可选更擅长 JSON 的模型</span></div>
              <select class="gm-field" :value="m.assignmentOf('instruction_generation')" @change="m.assign('instruction_generation', ($event.target as HTMLSelectElement).value)">
                <option value="default">沿用主流程 API</option>
                <optgroup v-if="ownChatOthers.length" label="我的 API">
                  <option v-for="api in ownChatOthers" :key="api.id" :value="api.id" :disabled="!api.enabled">{{ m.displayName(api) }}{{ api.enabled ? '' : '（未启用）' }}</option>
                </optgroup>
                <optgroup v-if="publicApis.length" label="公益模型">
                  <option v-for="api in publicApis" :key="api.id" :value="api.id">{{ publicLabel(api) }}</option>
                </optgroup>
              </select>
            </div>
            <div class="gm-form-row nested">
              <div class="gm-form-info"><span class="gm-form-name">第 2 步流式传输</span><span class="gm-form-desc">部分 API 不支持，第 2 步报错时请关闭</span></div>
              <label class="gm-switch">
                <input type="checkbox" :checked="m.store.aiGenerationSettings.splitStep2Streaming" @change="m.store.updateAIGenerationSettings({ splitStep2Streaming: ($event.target as HTMLInputElement).checked })" />
                <span></span>
              </label>
            </div>
          </template>
          <div class="gm-form-row">
            <div class="gm-form-info"><span class="gm-form-name">失败重试</span><span class="gm-form-desc">API 调用失败后自动重试的次数，0 为不重试</span></div>
            <div class="inline">
              <input class="gm-field num" type="number" min="0" max="5" :value="m.retry.value" aria-label="重试次数" @change="m.saveRetry(Number(($event.target as HTMLInputElement).value))" />
              <span>次</span>
            </div>
          </div>
          <template v-if="m.inTavern.value">
            <div class="gm-form-row">
              <div class="gm-form-info"><span class="gm-form-name">成人内容模式</span><span class="gm-form-desc">启用后 NPC 可能产生成人向互动内容</span></div>
              <label class="gm-switch"><input v-model="m.nsfw.value" type="checkbox" @change="m.saveNsfw" /><span></span></label>
            </div>
            <div v-if="m.nsfw.value" class="gm-form-row nested">
              <div class="gm-form-info"><span class="gm-form-name">性别偏好</span><span class="gm-form-desc">只让所选性别的 NPC 参与成人互动</span></div>
              <select v-model="m.nsfwGender.value" class="gm-field" @change="m.saveNsfw">
                <option value="female">仅女性</option>
                <option value="male">仅男性</option>
                <option value="all">不限性别</option>
              </select>
            </div>
          </template>
        </div>

        <!-- 功能分配 -->
        <div v-else class="form-col">
          <p class="assign-hint">
            <component :is="m.inTavern.value ? Beer : Globe" :size="14" />
            <span v-if="m.inTavern.value">主流程固定走酒馆的 API；辅助功能可单独指定 API，不指定同样走酒馆。</span>
            <span v-else>每个功能都可以指定用哪个 API；指定同一个 API 的功能会合并请求。</span>
          </p>

          <div class="gm-form-row">
            <div class="gm-form-info">
              <span class="gm-form-name">主流程 <SealBadge v-if="m.inTavern.value" tone="muted"><Lock :size="11" />酒馆</SealBadge></span>
              <span class="gm-form-desc">{{ m.split.value ? '生成正文和行动选项（分步生成的第 1 步）' : FUNCTION_DESCS.main }}</span>
            </div>
            <span v-if="m.inTavern.value" class="gm-muted">使用酒馆配置</span>
            <select v-else class="gm-field" :value="m.assignmentOf('main')" @change="pub.selectMain(($event.target as HTMLSelectElement).value)">
              <optgroup v-if="ownChatEnabled.length" label="我的 API">
                <option v-for="api in ownChatEnabled" :key="api.id" :value="api.id">{{ m.displayName(api) }}</option>
              </optgroup>
              <optgroup v-if="publicApis.length" label="公益模型">
                <option v-for="api in publicApis" :key="api.id" :value="api.id">{{ publicLabel(api) }}</option>
              </optgroup>
            </select>
          </div>

          <h4 class="gm-label group">辅助功能 <small>不指定时使用主流程 API</small></h4>
          <div v-for="f in AUX_FUNCTIONS" :key="f" class="gm-form-row">
            <div class="gm-form-info">
              <span class="gm-form-name">
                {{ FUNCTION_NAMES[f] }}
                <SealBadge v-if="m.inTavern.value && m.isActive(f)" tone="muted">{{ m.store.getFunctionMode(f) === 'raw' ? 'Raw' : '标准' }}</SealBadge>
              </span>
              <span class="gm-form-desc">{{ FUNCTION_DESCS[f] }}</span>
            </div>
            <div class="inline">
              <label v-if="f === 'text_optimization'" class="gm-switch" title="启用">
                <input type="checkbox" :checked="m.store.isFunctionEnabled('text_optimization')" @change="m.store.setFunctionEnabled('text_optimization', ($event.target as HTMLInputElement).checked)" />
                <span></span>
              </label>
              <template v-if="m.isActive(f)">
                <select class="gm-field" :value="m.assignmentOf(f)" @change="m.assign(f, ($event.target as HTMLSelectElement).value)">
                  <option value="default">沿用主流程 API</option>
                  <optgroup v-if="ownChatOthers.length" label="我的 API">
                    <option v-for="api in ownChatOthers" :key="api.id" :value="api.id" :disabled="!api.enabled">{{ m.displayName(api) }}{{ api.enabled ? '' : '（未启用）' }}</option>
                  </optgroup>
                  <optgroup v-if="publicApis.length" label="公益模型">
                    <option v-for="api in publicApis" :key="api.id" :value="api.id">{{ publicLabel(api) }}</option>
                  </optgroup>
                </select>
                <select
                  v-if="m.inTavern.value"
                  class="gm-field mode"
                  title="Raw：直接发送任务提示词；标准：附带酒馆预设"
                  :value="m.store.getFunctionMode(f)"
                  @change="setMode(f, ($event.target as HTMLSelectElement).value as 'raw' | 'standard')"
                >
                  <option value="raw">Raw</option>
                  <option value="standard">标准</option>
                </select>
              </template>
            </div>
          </div>

          <h4 class="gm-label group">叙事检索 <small>关闭时不检索，也不调用 Embedding</small></h4>
          <div class="gm-form-row">
            <div class="gm-form-info">
              <span class="gm-form-name">Embedding API</span>
              <span class="gm-form-desc">先打开开关才会启用。需要单独的向量模型，不能沿用主流程的聊天模型。召回条数和同步在「记忆档案 → 检索」。</span>
            </div>
            <div class="inline">
              <label class="gm-switch" title="启用叙事检索">
                <input type="checkbox" :checked="m.store.isFunctionEnabled('embedding')" aria-label="启用叙事检索" @change="m.setEmbeddingEnabled(($event.target as HTMLInputElement).checked)" />
                <span></span>
              </label>
              <select v-if="m.store.isFunctionEnabled('embedding')" class="gm-field" :value="m.assignmentOf('embedding')" @change="m.assign('embedding', ($event.target as HTMLSelectElement).value)">
                <option value="default">未指定向量模型</option>
                <option v-for="api in embeddingChoices" :key="api.id" :value="api.id" :disabled="!api.enabled">{{ m.displayName(api) }}{{ api.enabled ? '' : '（未启用）' }}</option>
              </select>
            </div>
          </div>

          <h4 class="gm-label group">剧情生图 <small>关闭时不解析插图，也不调用生图</small></h4>
          <div class="gm-form-row">
            <div class="gm-form-info">
              <span class="gm-form-name">生图渠道</span>
              <span class="gm-form-desc">单独的图片渠道，不能沿用对话模型。正文里出现 [[image prompt="..."]] 时，会把这一段提交给这里选中的 NAI 或 GPT 生图。</span>
            </div>
            <div class="inline">
              <label class="gm-switch" title="启用剧情生图">
                <input type="checkbox" :checked="m.store.isFunctionEnabled('image')" aria-label="启用剧情生图" @change="setImageEnabled(($event.target as HTMLInputElement).checked)" />
                <span></span>
              </label>
              <select v-if="m.store.isFunctionEnabled('image')" class="gm-field" :value="m.assignmentOf('image')" @change="m.assign('image', ($event.target as HTMLSelectElement).value)">
                <option value="default">未选择生图渠道</option>
                <option v-for="api in imageChoices" :key="api.id" :value="api.id" :disabled="!api.enabled">{{ m.displayName(api) }}{{ api.enabled ? '' : '（未启用）' }}</option>
              </select>
            </div>
          </div>
        </div>
        <aside class="overview" aria-label="调用概览">
          <h4 class="gm-label">调用概览</h4>
          <p class="ov-count"><b>{{ callsPerTurn }}</b><span>次调用 / 每回合</span></p>
          <div v-if="turn.total > 0" class="ov-credit">
            <span>公益额度 <b>{{ formatCredit(turn.total) }}</b> / 每回合</span>
            <small>余额 {{ formatCredit(pub.balance.value) }}<template v-if="turn.turnsLeft !== null"> · 约够 {{ turn.turnsLeft }} 回合</template><template v-if="turn.memoryCost"> · 记忆总结触发时另扣 {{ formatCredit(turn.memoryCost) }}</template></small>
          </div>
          <ol class="chain">
            <li v-for="c in chain" :key="c.key" :class="{ off: !c.on }">
              <span class="c-step">{{ c.step }}</span>
              <span class="c-main">
                <span class="c-name">{{ c.name }}</span>
                <span class="c-api">{{ c.on ? c.api : '未启用' }}<em v-if="c.on && c.cost" class="c-cost">{{ formatCredit(c.cost) }} 额度</em></span>
              </span>
            </li>
          </ol>
          <UsageLog dense :limit="8" />
          <dl class="gm-kv ov-kv">
            <dt>流式输出</dt><dd>{{ m.streaming.value ? '开启' : '关闭' }}</dd>
            <dt>失败重试</dt><dd>{{ m.retry.value }} 次</dd>
            <dt>已启用 API</dt><dd>{{ m.store.enabledAPIs.length }} / {{ m.store.apiConfigs.length }}</dd>
          </dl>
        </aside>
      </div>
    </div>

    <!-- 新增 / 编辑 -->
    <Teleport to="body">
      <div v-if="editorOpen" class="cc-modal-overlay editor-layer" @click.self="closeEditor">
        <div class="cc-modal wide solid editor" role="dialog" aria-modal="true" aria-labelledby="api-editor-title" @keydown.esc="closeEditor">
          <header class="cc-modal-head">
            <span class="p-icon lg">
              <img v-if="PROVIDER_ICONS[draft.provider as APIProvider]" :src="PROVIDER_ICONS[draft.provider as APIProvider]" alt="" />
              <Server v-else :size="22" />
            </span>
            <div class="e-title">
              <h3 id="api-editor-title" class="cc-modal-title">{{ editingId ? '编辑 API' : '新增 API' }}</h3>
              <small>{{ providerName(draft.provider as APIProvider) }} · {{ channelKind(draft.provider as APIProvider) }}</small>
            </div>
            <button type="button" class="cc-modal-close" aria-label="关闭" @click="closeEditor"><X :size="18" /></button>
          </header>
          <div class="cc-modal-body">
            <label class="cc-field"><span class="cc-field-label">配置名称</span><input v-model="draft.name" class="cc-input" placeholder="例如：主力 API" /></label>

            <div class="cc-field">
              <span class="cc-field-label">服务商</span>
              <div class="provider-groups">
                <div>
                  <span class="pg-label">对话</span>
                  <div class="providers" role="radiogroup" aria-label="对话服务商">
                    <button
                      v-for="p in CHAT_PROVIDER_OPTIONS"
                      :key="p.value"
                      type="button"
                      role="radio"
                      class="provider"
                      :class="{ active: draft.provider === p.value }"
                      :aria-checked="draft.provider === p.value"
                      @click="pickProvider(p.value)"
                    >
                      <img v-if="PROVIDER_ICONS[p.value]" :src="PROVIDER_ICONS[p.value]" alt="" />
                      <Server v-else :size="18" />
                      <span>{{ p.label }}</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span class="pg-label">向量</span>
                  <div class="providers" role="radiogroup" aria-label="嵌入模型">
                    <button
                      v-for="p in EMBEDDING_PROVIDER_OPTIONS"
                      :key="p.value"
                      type="button"
                      role="radio"
                      class="provider"
                      :class="{ active: draft.provider === p.value }"
                      :aria-checked="draft.provider === p.value"
                      @click="pickProvider(p.value)"
                    >
                      <img v-if="PROVIDER_ICONS[p.value]" :src="PROVIDER_ICONS[p.value]" alt="" />
                      <Server v-else :size="18" />
                      <span>{{ p.label }}</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span class="pg-label">生图</span>
                  <div class="providers" role="radiogroup" aria-label="生图渠道">
                    <button
                      v-for="p in IMAGE_PROVIDER_OPTIONS"
                      :key="p.value"
                      type="button"
                      role="radio"
                      class="provider"
                      :class="{ active: draft.provider === p.value }"
                      :aria-checked="draft.provider === p.value"
                      @click="pickProvider(p.value)"
                    >
                      <img v-if="PROVIDER_ICONS[p.value]" :src="PROVIDER_ICONS[p.value]" alt="" />
                      <Server v-else :size="18" />
                      <span>{{ p.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <label class="cc-field"><span class="cc-field-label">API 地址</span><input v-model="draft.url" class="cc-input" :placeholder="providerPreset(draft.provider as APIProvider)?.url" /></label>
            <div class="endpoint-preview" aria-live="polite">
              <div class="ep-row">
                <span class="ep-method">POST</span>
                <code class="ep-url"><span class="ep-base">{{ draftEndpoint.base || '（填写上面的地址）' }}</span><span class="ep-path">{{ draftEndpoint.path }}</span></code>
              </div>
              <p class="ep-format">{{ draftEndpoint.format }}。金色部分是程序拼在地址后面的路径。</p>
              <div v-if="draftEndpoint.streamPath" class="ep-row sub">
                <span class="ep-method">流式</span>
                <code class="ep-url"><span class="ep-base">{{ draftEndpoint.base || '（地址）' }}</span><span class="ep-path">{{ draftEndpoint.streamPath }}</span></code>
              </div>
              <div v-if="draftEndpoint.modelsPath" class="ep-row sub">
                <span class="ep-method">GET</span>
                <code class="ep-url"><span class="ep-base">{{ draftEndpoint.base || '（地址）' }}</span><span class="ep-path">{{ draftEndpoint.modelsPath }}</span></code>
                <span class="ep-hint">获取模型</span>
              </div>
              <p v-if="draftEndpoint.warning" class="ep-warn">{{ draftEndpoint.warning }}</p>
            </div>
            <label class="cc-field"><span class="cc-field-label">API 密钥</span><input v-model="draft.apiKey" class="cc-input" type="password" placeholder="sk-..." autocomplete="off" /></label>

            <div class="cc-field model-field">
              <span class="cc-field-label">
                模型
                <small>{{ fetched.length ? `已从当前 API 获取 ${fetched.length} 个模型` : '点右侧按钮读取当前 API 的最新模型' }}</small>
              </span>
              <div class="model-input">
                <input v-model="draft.model" class="cc-input" :placeholder="providerPreset(draft.provider as APIProvider)?.defaultModel" @focus="dropdown = true" @blur="hideDropdown" @input="dropdown = true" />
                <button type="button" class="cc-icon-btn fetch" title="获取模型列表" aria-label="获取模型列表" :disabled="fetching" @click="loadModels">
                  <RefreshCw :size="15" :class="{ 'cc-spin': fetching }" />
                </button>
                <ul v-if="dropdown && modelMatches.length" class="dropdown">
                  <li v-for="mm in modelMatches" :key="mm"><button type="button" :class="{ active: draft.model === mm }" @mousedown.prevent="draft.model = mm; dropdown = false">{{ mm }}</button></li>
                </ul>
              </div>
              <div v-if="presets.length" class="presets">
                <button v-for="p in presets" :key="p.id" type="button" class="preset" :class="{ active: draft.model === p.id }" @click="applyPreset(p)">
                  <b>{{ p.name }}</b><small>{{ p.context }}</small>
                </button>
              </div>
              <p v-if="currentPreset" class="preset-desc">{{ currentPreset.description }} · 最大输出 {{ currentPreset.maxOutput }}</p>
            </div>

            <div v-if="draft.provider === 'nai'" class="two">
              <label class="cc-field"><span class="cc-field-label">步数</span><input v-model.number="draft.imageSteps" class="cc-input" type="number" min="1" max="28" /></label>
              <label class="cc-field"><span class="cc-field-label">提示词强度</span><input v-model.number="draft.imageScale" class="cc-input" type="number" min="0" max="10" step="0.5" /></label>
            </div>
            <label v-if="draft.provider === 'nai'" class="cc-field"><span class="cc-field-label">负面提示词</span><input v-model="draft.negativePrompt" class="cc-input" placeholder="low quality, blurry" /></label>

            <div v-if="isChatProvider(draft.provider as APIProvider)" class="two">
              <label class="cc-field"><span class="cc-field-label">温度</span><input v-model.number="draft.temperature" class="cc-input" type="number" min="0" max="2" step="0.1" /></label>
              <label class="cc-field"><span class="cc-field-label">最大 Token</span><input v-model.number="draft.maxTokens" class="cc-input" type="number" min="100" :max="providerPreset(draft.provider as APIProvider)?.maxOutputTokens || 384000" /></label>
            </div>

            <div v-if="JSON_CAPABLE.includes(draft.provider as APIProvider)" class="gm-form-row json-row">
              <div class="gm-form-info"><span class="gm-form-name">强制 JSON 输出</span></div>
              <label class="gm-switch"><input v-model="draft.forceJsonOutput" type="checkbox" /><span></span></label>
            </div>
          </div>
          <footer class="cc-modal-foot">
            <button type="button" class="cc-btn" @click="closeEditor">取消</button>
            <button type="button" class="cc-btn primary" @click="saveEditor">保存</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ArrowLeftRight, Beer, Download, FlaskConical, Globe, Loader2, Lock, Pencil, Plus, RefreshCw, Server, Trash2, Upload, X } from 'lucide-vue-next';
import type { APIConfig, APIUsageType } from '@/stores/apiManagementStore';
import type { APIProvider } from '@/services/aiService';
import {
  AUX_FUNCTIONS, CHAT_PROVIDER_OPTIONS, EMBEDDING_PROVIDER_OPTIONS, EMBEDDING_USABLE, FUNCTION_DESCS, FUNCTION_NAMES, IMAGE_PROVIDER_OPTIONS, JSON_CAPABLE, MODEL_PRESETS, PROVIDER_ICONS, findModelPreset, isEmbeddingProvider, isImageProvider, type ModelPreset,
} from '@/data/apiProviders';
import { providerName, providerPreset, useApiManager } from '@/composables/useApiManager';
import { previewApiRequest } from '@/utils/apiEndpoint';
import { usePageActions } from '@/composables/usePageActions';
import { confirmDialog } from '@/composables/useDialog';
import { downloadText } from '@/utils/gameDisplay';
import { toast } from '@/utils/toast';
import PageTabs from '@/components/game/PageTabs.vue';
import ListDetail from '@/components/game/ListDetail.vue';
import EmptyState from '@/components/game/EmptyState.vue';
import SealBadge from '@/components/game/SealBadge.vue';
import PublicApiHall from '@/components/publicApi/PublicApiHall.vue';
import UsageLog from '@/components/publicApi/UsageLog.vue';
import { usePublicApi } from '@/composables/usePublicApi';
import { formatCredit } from '@/services/builtinApi';
import { enableStoryImage, resolveImageApi } from '@/services/storyImageRunner';

defineOptions({ name: 'ApiPage' });

const m = useApiManager();

const setImageEnabled = (on: boolean) => {
  if (!on) {
    m.store.setFunctionEnabled('image', false);
    toast.success('剧情生图已关闭');
    return;
  }
  const result = enableStoryImage();
  if (result.ok) toast.success(result.message);
  else toast.warning(result.message);
};
const pub = usePublicApi();
onMounted(() => {
  void m.load();
  void pub.refreshWallet();
});

const tab = ref<'public' | 'apis' | 'gen' | 'assign'>('apis');
const onTab = (value: string) => {
  if (value === 'public' || value === 'apis' || value === 'gen' || value === 'assign') tab.value = value;
};
const tabs = computed(() => [
  { key: 'apis', label: '我的 API', count: ownApis.value.length },
  { key: 'public', label: '公益 API', count: publicApis.value.length || null },
  { key: 'gen', label: '生成方式' },
  { key: 'assign', label: '功能分配' },
]);

const ownApis = computed(() => m.store.apiConfigs.filter((a) => !a.builtin));
const publicApis = computed(() => m.store.apiConfigs.filter((a) => a.builtin));
const others = computed(() => ownApis.value.filter((a) => a.id !== 'default'));
const isChatProvider = (provider?: APIProvider) => !isEmbeddingProvider(provider) && !isImageProvider(provider);
const channelKind = (provider?: APIProvider) => (isImageProvider(provider) ? '生图渠道' : isEmbeddingProvider(provider) ? '向量模型' : '对话模型');
const chatEnabled = computed(() => m.store.enabledAPIs.filter((a) => isChatProvider(a.provider)));
const ownChatEnabled = computed(() => chatEnabled.value.filter((a) => !a.builtin));
const ownChatOthers = computed(() => others.value.filter((a) => isChatProvider(a.provider)));
const publicLabel = (api: APIConfig) => {
  const cost = `${formatCredit(api.cost ?? 1)} 额度/次`;
  if (!api.model || api.name.includes(api.model)) return `${api.name} · ${cost}`;
  return `${api.name} · ${api.model} · ${cost}`;
};
const embeddingChoices = computed(() => others.value.filter((a) => !a.builtin && EMBEDDING_USABLE.includes(a.provider)));
const imageChoices = computed(() => others.value.filter((a) => isImageProvider(a.provider)));
const canSwitchTo = (api: APIConfig) => isChatProvider(api.provider) && !(m.inTavern.value && api.id === 'default');
const isCurrentMain = (api: APIConfig) => !m.inTavern.value && m.assignmentOf('main') === api.id;

// ─── 调用概览 ───
/** 显示功能实际走的 API：沿用主流程的功能显示主流程那个 */
const apiLabel = (type: APIUsageType) => {
  const api = pub.resolveApi(type);
  if (m.inTavern.value && (!api || api.id === 'default')) return '酒馆 API';
  return api ? `${m.displayName(api)} · ${api.model}` : '默认 API';
};
const costFor = (type: APIUsageType) => pub.costOf(pub.resolveApi(type));
const turn = computed(() => pub.turnCost(m.split.value));
const chain = computed(() => {
  const split = m.split.value;
  const polish = m.store.isFunctionEnabled('text_optimization');
  const ragOn = m.store.isFunctionEnabled('embedding');
  const ragReady = ragOn && m.assignmentOf('embedding') !== 'default';
  const imageOn = m.store.isFunctionEnabled('image');
  const imageApi = resolveImageApi();
  const imageReady = !!imageApi;
  return [
    { key: 'main', step: '1', name: split ? '正文与选项' : '正文、选项与指令', api: apiLabel('main'), cost: costFor('main'), on: true },
    { key: 'instruction_generation', step: '2', name: '游戏指令', api: apiLabel('instruction_generation'), cost: costFor('instruction_generation'), on: split },
    { key: 'text_optimization', step: split ? '3' : '2', name: '文本润色', api: apiLabel('text_optimization'), cost: costFor('text_optimization'), on: polish },
    { key: 'embedding', step: '检', name: '叙事检索', api: ragReady ? apiLabel('embedding') : '未指定向量模型', cost: 0, on: ragOn },
    { key: 'image', step: '图', name: '剧情生图', api: imageReady ? `${m.displayName(imageApi)} · ${imageApi.model}` : (imageOn ? '未选择生图渠道' : '未启用'), cost: 0, on: imageReady },
    { key: 'memory_summary', step: '忆', name: '记忆总结（按需）', api: apiLabel('memory_summary'), cost: costFor('memory_summary'), on: true },
  ];
});
const callsPerTurn = computed(() => 1 + (m.split.value ? 1 : 0) + (m.store.isFunctionEnabled('text_optimization') ? 1 : 0));

// ─── 列表 / 详情 ───
const selectedId = ref('default');
const detailOpen = ref(false);
const selected = computed(() => ownApis.value.find((a) => a.id === selectedId.value) || ownApis.value[0] || null);
const pick = (id: string) => {
  selectedId.value = id;
  detailOpen.value = true;
};
const statusText = (id: string) => ({ success: '连接正常', fail: '连接失败' })[m.testResults.value[id] as 'success' | 'fail'] || '未测试';
const preset = (api: APIConfig) => findModelPreset(api.provider, api.model);

const setJson = (api: APIConfig, on: boolean) => {
  m.store.updateAPI(api.id, { forceJsonOutput: on });
  if (api.id === 'default') m.syncDefault();
  toast.success(on ? '已启用强制 JSON' : '已关闭强制 JSON');
};
const setMode = (f: APIUsageType, mode: 'raw' | 'standard') => {
  m.store.setFunctionMode(f, mode);
  toast.success(`${FUNCTION_NAMES[f]} 模式已设为 ${mode === 'raw' ? 'Raw' : '标准'}`);
};

const removeApi = async (api: APIConfig) => {
  const ok = await confirmDialog({ title: '删除 API', message: `删除「${api.name}」？使用它的功能会自动回退到默认 API。`, confirmText: '删除', danger: true });
  if (!ok) return;
  try {
    m.remove(api.id);
    selectedId.value = 'default';
    toast.success('已删除');
  } catch (e) {
    toast.error((e as Error).message);
  }
};

// ─── 编辑器 ───
const editorOpen = ref(false);
const editingId = ref<string | null>(null);
const blank = (): Partial<APIConfig> => ({
  name: '', provider: 'openai', url: providerPreset('openai')?.url || '', apiKey: '', model: 'gpt-6-astra', temperature: 0.7, maxTokens: providerPreset('openai')?.defaultMaxTokens || 16000, enabled: true, forceJsonOutput: false,
});
const draft = ref<Partial<APIConfig>>(blank());
const fetched = ref<string[]>([]);
const fetching = ref(false);
const dropdown = ref(false);

const openEditor = (api: APIConfig | null) => {
  editingId.value = api?.id ?? null;
  draft.value = api ? { ...api } : blank();
  fetched.value = [];
  editorOpen.value = true;
};
const closeEditor = () => {
  editorOpen.value = false;
};
const pickProvider = (p: APIProvider) => {
  draft.value.provider = p;
  if (!JSON_CAPABLE.includes(p)) draft.value.forceJsonOutput = false;
  const pre = providerPreset(p);
  if (pre) {
    draft.value.url = pre.url;
    draft.value.model = pre.defaultModel;
    draft.value.maxTokens = pre.defaultMaxTokens || 16000;
  }
  if (p === 'nai') {
    draft.value.imageSteps = draft.value.imageSteps || 23;
    draft.value.imageScale = draft.value.imageScale || 5;
    draft.value.negativePrompt = draft.value.negativePrompt || 'low quality, blurry';
  }
};
const presets = computed(() => MODEL_PRESETS[draft.value.provider as APIProvider] || []);
const currentPreset = computed(() => presets.value.find((p) => p.id === draft.value.model?.trim()));
const endpointOf = (api: { provider?: APIProvider; url?: string; model?: string }) =>
  previewApiRequest((api.provider || 'openai') as APIProvider, api.url || '', api.model);
const draftEndpoint = computed(() => endpointOf(draft.value));
const applyPreset = (p: ModelPreset) => {
  draft.value.model = p.id;
  draft.value.maxTokens = p.maxTokens;
  if (p.temperature !== undefined) draft.value.temperature = p.temperature;
};
const modelMatches = computed(() => {
  const q = (draft.value.model || '').toLowerCase();
  return (q ? fetched.value.filter((x) => x.toLowerCase().includes(q)) : fetched.value).slice(0, 80);
});
const hideDropdown = () => setTimeout(() => (dropdown.value = false), 120);
const loadModels = async () => {
  fetching.value = true;
  try {
    fetched.value = await m.fetchModels(draft.value);
    dropdown.value = true;
    toast.success(`获取到 ${fetched.value.length} 个模型`);
  } catch (e) {
    toast.error(`获取模型列表失败：${(e as Error).message}`);
  } finally {
    fetching.value = false;
  }
};
const saveEditor = () => {
  try {
    m.save(editingId.value, draft.value);
    toast.success(editingId.value ? 'API 配置已更新' : 'API 配置已添加');
    editorOpen.value = false;
  } catch (e) {
    toast.warning((e as Error).message);
  }
};

// ─── 导入导出 ───
const exportCfg = () => {
  downloadText(`仙途-API配置-${new Date().toISOString().split('T')[0]}.json`, JSON.stringify(m.store.exportConfig(), null, 2));
  toast.success('API 配置已导出');
};
const importCfg = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      m.store.importConfig(JSON.parse(await f.text()));
      m.syncDefault();
      toast.success('API 配置已导入');
    } catch {
      toast.error('导入失败，请检查文件格式');
    }
  };
  input.click();
};

const actions = computed(() => [
  { key: 'import', title: '导入', icon: Upload, onClick: importCfg },
  { key: 'export', title: '导出', icon: Download, onClick: exportCfg },
  { key: 'add', title: '新增 API', icon: Plus, onClick: () => openEditor(null), primary: true },
]);
usePageActions(actions);
</script>

<style scoped>
.api-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--cc-text);
}

.a-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  padding-top: 0.5rem;
}


.a-main {
  min-height: 0;
}

.api-list {
  padding-right: 0.25rem;
}

.api-row {
  padding: 0 0.6rem 0 0;
  gap: 0;
}

.api-row.off .gm-row-title {
  color: var(--cc-text-3);
}

.api-main {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
  min-width: 0;
  padding: 0.6rem 0.85rem;
  border: none;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.gm-row-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.p-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--cc-border);
  color: var(--cc-text-2);
  overflow: hidden;
}

.p-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.p-icon.lg {
  width: 48px;
  height: 48px;
}

.p-icon.lg img {
  width: 32px;
  height: 32px;
}

.status {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--cc-text-3);
  opacity: 0.5;
}

.status.success {
  background: var(--cc-success);
  opacity: 1;
}

.status.fail {
  background: var(--cc-danger);
  opacity: 1;
}

.public-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.row-switch {
  transform: scale(0.85);
}

.add-btn {
  align-self: flex-start;
  margin-top: 0.8rem;
}

.detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.d-head {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.d-name {
  margin: 0;
  font-family: var(--cc-calligraphy);
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.d-sub {
  margin: 0.2rem 0 0;
  font-size: 13px;
  color: var(--cc-text-2);
}

.d-note {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.8rem 0 0;
  font-size: 13px;
  color: var(--cc-warning);
}

.d-kv {
  margin: 1rem 0 0.6rem;
}

.d-kv .mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.ep-base {
  color: var(--cc-text-2);
}

.ep-path {
  color: var(--cc-gold);
  font-weight: 650;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail .gm-section {
  margin-top: 1rem;
}

.gm-detail-foot {
  flex-wrap: wrap;
}

/* ---------- 表单 ---------- */
.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 2rem;
  flex: 1;
  min-height: 0;
}

.form-col {
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 1.5rem;
}

/* ---------- 调用概览 ---------- */
.overview {
  align-self: start;
  padding: 1rem 1.1rem;
  border: 1px solid var(--gm-line);
  border-radius: 8px;
  background: var(--cc-inset);
}

.ov-count {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.8rem 0 0.9rem;
  color: var(--cc-text-2);
  font-size: 13px;
}

.ov-credit {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin: -0.4rem 0 0.9rem;
  padding: 0.55rem 0.7rem;
  border-left: 2px solid var(--cc-gold);
  background: rgba(var(--cc-gold-rgb), 0.08);
  font-size: 13px;
  color: var(--cc-text-2);
}

.ov-credit b {
  color: var(--cc-gold);
}

.ov-credit small {
  font-size: 12px;
  color: var(--cc-text-3);
}

.c-cost {
  margin-left: 0.4rem;
  font-style: normal;
  color: var(--cc-gold);
}

.ov-count b {
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
  color: var(--cc-gold);
}

.chain {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chain li {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.45rem 0;
}

.chain li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 2rem;
  bottom: -0.35rem;
  left: 11px;
  border-left: 1px dashed var(--gm-line);
}

.c-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 23px;
  height: 23px;
  border: 1px solid rgba(var(--cc-gold-rgb), 0.55);
  border-radius: 50%;
  color: var(--cc-gold);
  font-size: 12px;
}

.c-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.c-name {
  font-size: 14px;
}

.c-api {
  font-size: 12px;
  color: var(--cc-text-2);
  overflow-wrap: anywhere;
}

.chain li.off {
  opacity: 0.45;
}

.ov-kv {
  margin: 0.9rem 0 0;
  padding-top: 0.8rem;
  border-top: 1px solid var(--gm-line);
}

.inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 1 280px;
  min-width: 0;
  max-width: 100%;
  font-size: 14px;
  color: var(--cc-text-2);
}

.inline select.gm-field {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gm-field.num {
  width: 70px;
  text-align: center;
}

.gm-field.mode {
  min-width: 0;
  width: 84px;
}

.assign-hint {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.4rem;
  font-size: 13px;
  color: var(--cc-text-2);
}

.gm-label.group {
  margin: 1.5rem 0 0.2rem;
}

.gm-label small {
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--cc-text-3);
}

.gm-form-name {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

/* ---------- 编辑器 ---------- */
.editor-layer {
  z-index: 2600;
}

.editor .cc-modal-head {
  justify-content: flex-start;
}

.e-title {
  flex: 1;
}

.e-title small {
  font-size: 12px;
  color: var(--cc-text-2);
}

.providers {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.provider-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pg-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 12px;
  color: var(--cc-text-3);
}

.json-row {
  margin-top: 0.2rem;
}

.provider {
  display: flex;
  font-family: inherit;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--cc-inset);
  color: var(--cc-text-2);
  font-size: 13px;
  cursor: pointer;
}

.provider img {
  width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 4px;
  background: #fff;
  object-fit: contain;
}

.provider.active {
  border-color: rgba(var(--cc-gold-rgb), 0.7);
  background: rgba(var(--cc-gold-rgb), 0.14);
  color: var(--cc-text);
}

.model-field .cc-field-label small {
  margin-left: 0.4rem;
  font-size: 12px;
  letter-spacing: 0;
  color: var(--cc-text-3);
}

.model-input {
  position: relative;
  display: flex;
  gap: 0.4rem;
}

.model-input .fetch {
  width: 38px;
  height: auto;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 44px;
  z-index: 5;
  max-height: 240px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  border: 1px solid var(--cc-border-strong);
  border-radius: 6px;
  background: var(--cc-solid-bg);
  list-style: none;
}

.dropdown button {
  width: 100%;
  padding: 0.35rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--cc-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.dropdown button:hover,
.dropdown button.active {
  background: rgba(var(--cc-gold-rgb), 0.14);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.preset {
  display: flex;
  font-family: inherit;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--cc-border);
  border-radius: 6px;
  background: var(--cc-inset);
  color: var(--cc-text);
  cursor: pointer;
}

.preset b {
  font-size: 13px;
  font-weight: 500;
}

.preset small {
  font-size: 11px;
  color: var(--cc-text-3);
}

.preset.active {
  border-color: rgba(var(--cc-gold-rgb), 0.7);
  background: rgba(var(--cc-gold-rgb), 0.14);
}

.preset-desc {
  margin: 0.4rem 0 0;
  font-size: 12px;
  color: var(--cc-text-2);
}

.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.endpoint-preview {
  margin: -0.15rem 0 0.15rem;
  padding: 0.65rem 0.75rem;
  border: 1px dashed var(--cc-border);
  border-radius: 6px;
  background: var(--cc-inset);
}

.ep-row {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.ep-row.sub {
  margin-top: 0.35rem;
}

.ep-method,
.ep-hint {
  flex: none;
  font-size: 11px;
  line-height: 1.55;
  color: var(--cc-text-3);
}

.ep-method {
  min-width: 2.2rem;
  letter-spacing: 0.04em;
}

.ep-url {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  word-break: break-all;
}

.ep-format,
.ep-warn {
  margin: 0.4rem 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--cc-text-3);
}

.ep-warn {
  color: var(--cc-warning);
}

@media (max-width: 1100px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 1rem;
  }

  .overview {
    align-self: stretch;
  }
}

@media (max-width: 768px) {
  .split {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .form-col,
  .overview {
    flex-shrink: 0;
    overflow: visible;
  }

  .providers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
