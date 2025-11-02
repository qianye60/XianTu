<template>
  <div class="relationship-network-panel">
    <div class="panel-content">
      <!-- 人物关系列表 -->
      <div class="relationships-container" :class="{ 'details-active': isDetailViewActive }">
        <!-- 左侧：人物列表 -->
        <div class="relationship-list">
          <div class="list-header">
            <h3 class="panel-title">人物关系</h3>
            <div class="search-bar">
              <Search :size="16" />
              <input
                v-model="searchQuery"
                placeholder="搜索人物..."
                class="search-input"
              />
            </div>
          </div>

          <div class="list-content">
            <div v-if="isLoading" class="loading-state">
              <Loader2 :size="32" class="animate-spin" />
              <p>{{ t('正在读取人际关系...') }}</p>
            </div>
            <div v-else-if="filteredRelationships.length === 0" class="empty-state">
              <Users2 :size="48" class="empty-icon" />
              <p class="empty-text">{{ t('尚未建立人际关系') }}</p>
              <p class="empty-hint">{{ t('在游戏中与更多人物互动建立关系') }}</p>
            </div>
            <div v-else class="person-list">
              <div
                v-for="person in filteredRelationships"
                :key="person.名字"
                class="person-card"
                :class="{ selected: selectedPerson?.名字 === person.名字 }"
                @click="selectPerson(person)"
              >
                <div class="person-avatar">
                  <span class="avatar-text">{{ person.名字.charAt(0) }}</span>
                </div>

                <div class="person-info">
                  <div class="person-name">{{ person.名字 }}</div>
                  <div class="person-meta">
                    <span class="relationship-type">{{ person.与玩家关系 || '相识' }}</span>
                    <div class="card-actions" @click.stop>
                      <button class="attention-toggle" @click.stop="toggleAttention(person)" :title="isAttentionEnabled(person) ? '取消关注' : '添加关注'">
                        <Eye v-if="isAttentionEnabled(person)" :size="14" class="attention-icon active" />
                        <EyeOff v-else :size="14" class="attention-icon inactive" />
                      </button>
                      <button @click.stop="confirmDeleteNpc(person)" class="delete-btn-card" title="删除人物">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                  <div class="person-realm" v-if="getNpcRealm(person) !== '未知'">
                    <span class="realm-label">境界:</span>
                    <span class="realm-value">{{ getNpcRealm(person) }}</span>
                  </div>
                  <div class="intimacy-info">
                    <div class="intimacy-bar">
                      <div
                        class="intimacy-fill"
                        :class="getIntimacyClass(person.好感度)"
                        :style="{ width: Math.max(5, Math.abs(person.好感度 || 0)) + '%' }"
                      ></div>
                    </div>
                    <span class="intimacy-value">{{ person.好感度 || 0 }}</span>
                  </div>
                </div>
                <ChevronRight :size="16" class="arrow-icon" />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：人物详情 -->
        <div class="relationship-detail">
          <template v-if="selectedPerson">
            <!-- 详情头部 -->
            <div class="detail-header">
               <button @click="isDetailViewActive = false" class="back-to-list-btn">
                 <ArrowLeft :size="20" />
               </button>
              <div class="detail-avatar">
                <span class="avatar-text">{{ selectedPerson.名字.charAt(0) }}</span>
              </div>
              <div class="detail-info">
                <div class="name-and-actions">
                  <h3 class="detail-name">{{ selectedPerson.名字 }}</h3>
                  <button v-if="selectedPerson" @click.stop="confirmDeleteNpc(selectedPerson)" class="delete-npc-btn" title="删除此人物">
                    <Trash2 :size="16" />
                  </button>
                </div>
                <div class="detail-badges">
                  <span class="relationship-badge">{{ selectedPerson.与玩家关系 || '相识' }}</span>
                  <span class="intimacy-badge" :class="getIntimacyClass(selectedPerson.好感度)">
                    好感 {{ selectedPerson.好感度 || 0 }}
                  </span>
                  <span class="race-badge">{{ selectedPerson.种族 || '人族' }}</span>
                  <span v-if="selectedPerson.势力归属" class="faction-badge">{{ selectedPerson.势力归属 }}</span>
                </div>
              </div>
            </div>

            <!-- 详情主体 -->
            <div class="detail-body">
              <!-- 选项卡导航 -->
              <div class="detail-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  :class="['tab-btn', { active: activeTab === tab.id }]"
                  @click="activeTab = tab.id"
                >
                  {{ tab.icon }} {{ tab.label }}
                </button>
              </div>

              <!-- 选项卡内容 -->
              <div class="tab-content">
                <!-- Tab 1: 基本信息 -->
                <div v-show="activeTab === 'basic'" class="tab-panel">
                  <!-- 基础档案 -->
                  <div class="detail-section">
                  <h5 class="section-title">基础档案</h5>
                  <div class="info-grid-responsive">
                    <div class="info-item-row"><span class="info-label">境界</span><span class="info-value">{{ getNpcRealm(selectedPerson) }}</span></div>
                    <div class="info-item-row"><span class="info-label">性别</span><span class="info-value">{{ selectedPerson.性别 || '未知' }}</span></div>
                    <div class="info-item-row"><span class="info-label">年龄</span><span class="info-value">{{ getNpcAge(selectedPerson) }}</span></div>
                    <div class="info-item-row"><span class="info-label">灵根</span><span class="info-value">{{ getNpcSpiritRoot(selectedPerson) }}</span></div>
                    <div class="info-item-row" v-if="selectedPerson.当前位置"><span class="info-label">位置</span><span class="info-value">{{ selectedPerson.当前位置.描述 }}</span></div>
                    <div class="info-item-row" v-if="selectedPerson.出生"><span class="info-label">出生</span><span class="info-value">{{ getNpcOrigin(selectedPerson.出生) }}</span></div>
                  </div>
                </div>

                <!-- 外貌与性格 -->
                <div class="detail-section" v-if="selectedPerson.外貌描述 || selectedPerson.性格特征?.length">
                  <h5 class="section-title">外貌与性格</h5>
                  <div v-if="selectedPerson.外貌描述" class="appearance-description">
                    <p class="description-text">{{ selectedPerson.外貌描述 }}</p>
                  </div>
                   <div v-if="selectedPerson.性格特征?.length" class="talents-grid" style="margin-top: 1rem;">
                      <span v-for="trait in selectedPerson.性格特征" :key="trait" class="talent-tag">{{ trait }}</span>
                    </div>
                </div>

                <!-- 天赋与六司 -->
                <div class="detail-section" v-if="selectedPerson.天赋?.length || selectedPerson.先天六司">
                   <h5 class="section-title">天赋与六司</h5>
                   <div v-if="selectedPerson.天赋?.length">
                      <h6 class="subsection-title">天赋能力</h6>
                      <div class="talents-grid">
                        <span v-for="(talent, index) in selectedPerson.天赋" :key="index" class="talent-tag" @click="showTalentDetail(talent)" style="cursor: pointer;">
                          {{ getTalentName(talent) }}
                        </span>
                      </div>
                   </div>
                   <div v-if="selectedPerson.先天六司" style="margin-top: 1rem;">
                      <h6 class="subsection-title">先天六司</h6>
                      <div class="attributes-grid">
                        <div class="attribute-item"><span class="attr-label">根骨</span><span class="attr-value">{{ selectedPerson.先天六司.根骨 || 0 }}</span></div>
                        <div class="attribute-item"><span class="attr-label">灵性</span><span class="attr-value">{{ selectedPerson.先天六司.灵性 || 0 }}</span></div>
                        <div class="attribute-item"><span class="attr-label">悟性</span><span class="attr-value">{{ selectedPerson.先天六司.悟性 || 0 }}</span></div>
                        <div class="attribute-item"><span class="attr-label">气运</span><span class="attr-value">{{ selectedPerson.先天六司.气运 || 0 }}</span></div>
                        <div class="attribute-item"><span class="attr-label">魅力</span><span class="attr-value">{{ selectedPerson.先天六司.魅力 || 0 }}</span></div>
                        <div class="attribute-item"><span class="attr-label">心性</span><span class="attr-value">{{ selectedPerson.先天六司.心性 || 0 }}</span></div>
                      </div>
                   </div>
                </div>

                <!-- 最近记忆 -->
                <div class="detail-section" v-if="getNpcRecentMemories(selectedPerson).length > 0">
                  <h5 class="section-title">📝 最近记忆</h5>
                  <div class="npc-memories-list">
                    <div v-for="(memory, index) in getNpcRecentMemories(selectedPerson)" :key="index" class="npc-memory-item">
                      <div class="npc-memory-content">{{ memory }}</div>
                    </div>
                  </div>
                </div>

                <!-- 人格底线（所有NPC都有）-->
                <div class="detail-section personality-section">
                  <h5 class="section-title">⚠️ 人格底线</h5>
                  <div class="personality-bottomlines">
                    <div v-if="selectedPerson.人格底线?.length" class="bottomline-tags">
                      <span v-for="(line, index) in selectedPerson.人格底线" :key="index" class="bottomline-tag">{{ line }}</span>
                    </div>
                    <div v-else class="bottomline-empty">未记录人格底线</div>
                  </div>
                  <div class="bottomline-warning">
                    <span class="warning-icon">⚡</span>
                    <span class="warning-text">触犯人格底线将导致好感度断崖式下跌（-30 ~ -60），关系破裂且极难修复</span>
                  </div>
                </div>
                </div>

                <!-- Tab 2: 实时状态 -->
                <div v-show="activeTab === 'status'" class="tab-panel">
                <div class="detail-section highlight-section">
                  <h5 class="section-title">💭 当前状态（实时）</h5>
                  <div class="realtime-status">
                    <div class="status-item">
                      <span class="status-icon">😶</span>
                      <div class="status-content">
                        <div class="status-label">外貌状态</div>
                        <div class="status-text">{{ selectedPerson.当前外貌状态 || '神态自然，衣衫整洁' }}</div>
                      </div>
                    </div>
                    <div class="status-item">
                      <span class="status-icon">💭</span>
                      <div class="status-content">
                        <div class="status-label">内心想法</div>
                        <div class="status-text">{{ selectedPerson.当前内心想法 || '心如止水，平静无波' }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <!-- Tab 3: 私密资料 (NSFW) -->
                <div v-show="activeTab === 'nsfw'" class="tab-panel" v-if="selectedPerson.私密信息">
                <div class="detail-section nsfw-section">
                  <h5 class="section-title">🔞 私密信息</h5>

                  <!-- 性欲与状态 -->
                  <div class="nsfw-subsection">
                    <h6 class="subsection-title">状态与欲望</h6>
                    <div class="info-grid">
                      <div class="info-item"><span class="info-label">性状态</span><span class="info-value status-badge" :class="'status-' + selectedPerson.私密信息.当前性状态">{{ selectedPerson.私密信息.当前性状态 }}</span></div>
                      <div class="info-item">
                        <span class="info-label">性渴望</span>
                        <span class="info-value">{{ selectedPerson.私密信息.性渴望程度 || 0 }}%</span>
                      </div>
                    </div>
                    <div class="dev-bar-item" style="margin-top: 0.5rem;">
                      <div class="dev-bar-track">
                        <div class="dev-bar-fill desire-fill" :style="{ width: (selectedPerson.私密信息.性渴望程度 || 0) + '%' }"></div>
                      </div>
                    </div>
                  </div>

                  <!-- 基础信息 -->
                  <div class="nsfw-subsection">
                    <h6 class="subsection-title">基础信息</h6>
                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">贞洁</span>
                        <span class="info-value">
                          {{ selectedPerson.性别 === '女' || selectedPerson.性别 === '其他'
                            ? (selectedPerson.私密信息.是否为处女 ? '✓ 处女' : '✗ 非处')
                            : (selectedPerson.私密信息.是否为处女 ? '✓ 处男' : '✗ 非处') }}
                        </span>
                      </div>
                      <div class="info-item"><span class="info-label">性格倾向</span><span class="info-value">{{ selectedPerson.私密信息.性格倾向 || '未知' }}</span></div>
                      <div class="info-item"><span class="info-label">性取向</span><span class="info-value">{{ selectedPerson.私密信息.性取向 || '异性恋' }}</span></div>
                    </div>
                    <!-- 性伴侣名单 -->
                    <div v-if="selectedPerson.私密信息.性伴侣名单?.length" class="partner-list">
                      <div class="mini-label">性伴侣名单 ({{ selectedPerson.私密信息.性伴侣名单?.length || 0 }}人)</div>
                      <div class="talents-grid">
                        <span v-for="(partner, index) in [...new Set(selectedPerson.私密信息.性伴侣名单)]" :key="index" class="partner-tag">{{ partner }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 性经验统计 -->
                  <div class="nsfw-subsection">
                    <h6 class="subsection-title">性经验统计</h6>
                    <div class="experience-grid">
                      <div class="exp-item">
                        <div class="exp-icon">💕</div>
                        <div class="exp-content">
                          <div class="exp-label">性交总次数</div>
                          <div class="exp-value">{{ selectedPerson.私密信息.性交总次数 || 0 }}次</div>
                        </div>
                      </div>
                      <div class="exp-item">
                        <div class="exp-icon">👥</div>
                        <div class="exp-content">
                          <div class="exp-label">性伴侣数量</div>
                          <div class="exp-value">{{ selectedPerson.私密信息.性伴侣名单?.length || 0 }}人</div>
                        </div>
                      </div>
                    </div>
                    <div v-if="(selectedPerson.私密信息.性交总次数 || 0) > 0 && selectedPerson.私密信息.最近一次性行为时间" class="last-time-info">
                      <span class="last-time-label">最近一次：</span>
                      <span class="last-time-value">{{ selectedPerson.私密信息.最近一次性行为时间 }}</span>
                    </div>
                  </div>

                  <!-- 身体部位开发 -->
                  <div class="nsfw-subsection" v-if="selectedPerson.私密信息.身体部位?.length">
                    <h6 class="subsection-title">身体部位开发</h6>
                    <div class="body-parts-list">
                      <div v-for="part in selectedPerson.私密信息.身体部位" :key="part.部位名称" class="body-part-item">
                        <div class="part-header">
                          <span class="part-name">{{ part.部位名称 }}</span>
                          <span v-if="part.特殊印记 && part.特殊印记 !== '无'" class="part-mark">{{ part.特殊印记 }}</span>
                        </div>
                        <div v-if="part.特征描述" class="part-description">{{ part.特征描述 }}</div>
                        <div class="part-stats">
                          <div class="part-stat">
                            <span class="stat-label">敏感度</span>
                            <div class="stat-bar-mini">
                              <div class="stat-bar-fill sensitivity" :style="{ width: (part.敏感度 || 0) + '%' }"></div>
                            </div>
                            <span class="stat-value">{{ part.敏感度 || 0 }}%</span>
                          </div>
                          <div class="part-stat">
                            <span class="stat-label">开发度</span>
                            <div class="stat-bar-mini">
                              <div class="stat-bar-fill development" :style="{ width: (part.开发度 || 0) + '%' }"></div>
                            </div>
                            <span class="stat-value">{{ part.开发度 || 0 }}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


                  <!-- 体液状态 -->
                  <div class="nsfw-subsection" v-if="selectedPerson.私密信息.体液分泌状态">
                    <h6 class="subsection-title">体液状态</h6>
                    <div class="fluid-status">💧 {{ selectedPerson.私密信息.体液分泌状态 }}</div>
                  </div>

                  <!-- 性癖好与体质 -->
                  <div class="nsfw-subsection" v-if="selectedPerson.私密信息.性癖好?.length || selectedPerson.私密信息.特殊体质?.length">
                    <h6 class="subsection-title">癖好与体质</h6>
                    <div v-if="selectedPerson.私密信息.性癖好?.length" style="margin-bottom: 0.75rem;">
                      <div class="mini-label">性癖好</div>
                      <div class="talents-grid">
                        <span v-for="fetish in selectedPerson.私密信息.性癖好" :key="fetish" class="fetish-tag">{{ fetish }}</span>
                      </div>
                    </div>
                    <div v-if="selectedPerson.私密信息.特殊体质?.length">
                      <div class="mini-label">特殊体质</div>
                      <div class="talents-grid">
                        <span v-for="trait in selectedPerson.私密信息.特殊体质" :key="trait" class="special-trait-tag">{{ trait }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                </div>

                <!-- Tab 4: 记忆档案 -->
                <div v-show="activeTab === 'memory'" class="tab-panel">
                <div class="detail-section" v-if="selectedPerson.记忆?.length || selectedPerson.记忆总结?.length">
                  <div class="memory-header">
                    <h5 class="section-title" style="border: none; padding: 0; margin: 0;">记忆</h5>
                    <div class="memory-actions-header">
                      <div class="memory-count" v-if="totalMemoryPages > 1">{{ selectedPerson.记忆?.length || 0 }} 条</div>
                      <div v-if="(selectedPerson.记忆?.length || 0) >= 3" class="summarize-controls">
                        <input
                          type="number"
                          v-model.number="memoriesToSummarize"
                          :min="3"
                          :max="selectedPerson.记忆?.length || 3"
                          class="summarize-input"
                          placeholder="条数"
                          title="从最旧开始总结的记忆条数"
                        />
                        <button class="summarize-btn" @click="summarizeMemories" :disabled="isSummarizing" title="总结最旧的记忆">
                          {{ isSummarizing ? '总结中...' : '📝 总结' }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="memory-summary-list" v-if="selectedPerson.记忆总结?.length">
                    <div v-for="(summary, index) in selectedPerson.记忆总结" :key="index" class="memory-summary-item">
                      <div class="summary-icon">📜</div>
                      <div class="summary-text">{{ summary }}</div>
                    </div>
                  </div>
                  <div class="memory-list" v-if="selectedPerson.记忆?.length">
                    <div v-for="(memory, index) in paginatedMemory" :key="index" class="memory-item">
                      <div class="memory-content">
                        <div v-if="getMemoryTime(memory)" class="memory-time">{{ getMemoryTime(memory) }}</div>
                        <div class="memory-event">{{ getMemoryEvent(memory) }}</div>
                      </div>
                      <div class="memory-actions">
                        <button class="memory-btn edit" @click="editMemory((currentMemoryPage - 1) * memoryPageSize + index)">编辑</button>
                        <button class="memory-btn delete" @click="deleteMemory((currentMemoryPage - 1) * memoryPageSize + index)">删除</button>
                      </div>
                    </div>
                  </div>
                  <div class="memory-pagination" v-if="totalMemoryPages > 1">
                    <button class="pagination-btn" :disabled="currentMemoryPage <= 1" @click="goToMemoryPage(currentMemoryPage - 1)">上一页</button>
                    <div class="pagination-info">{{ currentMemoryPage }} / {{ totalMemoryPages }}</div>
                    <button class="pagination-btn" :disabled="currentMemoryPage >= totalMemoryPages" @click="goToMemoryPage(currentMemoryPage + 1)">下一页</button>
                  </div>
                  <div v-if="!selectedPerson.记忆?.length && !selectedPerson.记忆总结?.length" class="empty-state-small">此人暂无记忆</div>
                </div>

                <!-- 原始数据 -->
                <div class="detail-section">
                   <h5 class="section-title">原始数据 (JSON)</h5>
                   <div class="raw-data-container">
                     <pre><code>{{ JSON.stringify(selectedPerson, null, 2) }}</code></pre>
                   </div>
                </div>
                </div>
                <!-- End of Tab 4: 记忆档案 -->

                <!-- Tab 5: 背包 -->
                <div v-show="activeTab === 'inventory'" class="tab-panel">
                <div class="detail-section">
                  <h5 class="section-title">背包</h5>
                  <div v-if="selectedPerson.背包?.灵石" class="spirit-stones-grid">
                    <div class="spirit-stone-item"><span>下品灵石</span><span>{{ selectedPerson.背包.灵石.下品 || 0 }}</span></div>
                    <div class="spirit-stone-item"><span>中品灵石</span><span>{{ selectedPerson.背包.灵石.中品 || 0 }}</span></div>
                    <div class="spirit-stone-item"><span>上品灵石</span><span>{{ selectedPerson.背包.灵石.上品 || 0 }}</span></div>
                    <div class="spirit-stone-item"><span>极品灵石</span><span>{{ selectedPerson.背包.灵石.极品 || 0 }}</span></div>
                  </div>
                  <div class="npc-inventory" style="margin-top: 1rem;">
                    <div v-if="hasNpcItems(selectedPerson)" class="npc-items-grid">
                      <div v-for="(item, itemId) in selectedPerson.背包.物品" :key="itemId" class="npc-item-card" :class="getItemQualityClass(item.品质?.quality)">
                        <div class="item-header">
                          <span class="item-name">{{ item.名称 || itemId }}</span>
                          <span class="item-type">{{ item.类型 || '其他' }}</span>
                        </div>
                        <div class="item-quality" v-if="item.品质"><span class="quality-text">{{ item.品质?.quality || '未知' }}{{ item.品质?.grade ? getGradeText(item.品质.grade) : '' }}</span></div>
                        <div class="item-quantity" v-if="item.数量 > 1"><span>x{{ item.数量 }}</span></div>
                        <div class="item-description" v-if="item.描述"><p>{{ item.描述 }}</p></div>
                        <div class="item-actions">
                          <button class="trade-btn" @click="initiateTradeWithNpc(selectedPerson, item)" title="尝试交易此物品"><ArrowRightLeft :size="12" />交易</button>
                          <button class="request-btn" @click="requestItemFromNpc(selectedPerson, item)" title="请求获得此物品">🙏 索要</button>
                          <button class="steal-btn" @click="attemptStealFromNpc(selectedPerson, item)" title="尝试偷取此物品">🥷 偷窃</button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="empty-inventory"><Package :size="24" class="empty-icon" /><p>此人身上没有物品</p></div>
                  </div>
                </div>
                </div>
                <!-- End of Tab 5: 背包 -->
              </div>
              <!-- End of tab-content -->
            </div>
            <!-- End of detail-body -->
          </template>
         <div v-else class="no-selection">
           <Users2 :size="64" class="placeholder-icon" />
            <p class="placeholder-text">选择一个人物查看详细信息</p>
            <p class="placeholder-hint">在游戏中与人物互动会建立关系记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useActionQueueStore } from '@/stores/actionQueueStore';
import { useI18n } from '@/i18n';
import type { NpcProfile, Item } from '@/types/game';
import type { SpiritRoot } from '@/types';
import {
  Users2, Search,
  Loader2, ChevronRight, Package, ArrowRightLeft, Eye, EyeOff, Trash2, ArrowLeft
} from 'lucide-vue-next';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { getMemoryTime, getMemoryEvent } from '@/utils/memoryUtils';



// 🔥 新架构：从 gameStateStore 获取数据
const gameStateStore = useGameStateStore();
const { t } = useI18n();
const characterData = computed(() => gameStateStore.getCurrentSaveData());
const actionQueue = useActionQueueStore();
const uiStore = useUIStore();
const characterStore = useCharacterStore();
const isLoading = ref(false);
const selectedPerson = ref<NpcProfile | null>(null);
const searchQuery = ref('');
const isDetailViewActive = ref(false); // 用于移动端视图切换

// Tab管理
const activeTab = ref('basic');
const tabs = computed(() => {
  const baseTabs = [
    { id: 'basic', label: '基本信息', icon: '📋' },
    { id: 'status', label: '实时状态', icon: '💭' },
  ];

  // 如果有NSFW信息，添加私密资料tab
  if (selectedPerson.value?.私密信息) {
    baseTabs.push({ id: 'nsfw', label: '私密资料', icon: '🔞' });
  }

  // 添加记忆档案tab
  baseTabs.push({ id: 'memory', label: '记忆档案', icon: '📝' });

  // 添加背包tab
  baseTabs.push({ id: 'inventory', label: '背包', icon: '🎒' });

  return baseTabs;
});

// 记忆总结状态
const isSummarizing = ref(false);
// 要总结的记忆条数（从最旧开始）
const memoriesToSummarize = ref(10);

// 记忆分页相关
const memoryPageSize = ref(5); // 每页显示的记忆数量
const currentMemoryPage = ref(1); // 当前页码

// 计算分页后的记忆
const paginatedMemory = computed(() => {
  if (!selectedPerson.value?.记忆?.length) return [];
  const memories = selectedPerson.value.记忆;
  const startIndex = (currentMemoryPage.value - 1) * memoryPageSize.value;
  const endIndex = startIndex + memoryPageSize.value;
  return memories.slice(startIndex, endIndex);
});

// 计算总页数
const totalMemoryPages = computed(() => {
  if (!selectedPerson.value?.记忆?.length) return 0;
  return Math.ceil(selectedPerson.value.记忆.length / memoryPageSize.value);
});

// 切换记忆页面
const goToMemoryPage = (page: number) => {
  if (page >= 1 && page <= totalMemoryPages.value) {
    currentMemoryPage.value = page;
  }
};

// 重置分页状态当选择新人物时
const resetMemoryPagination = () => {
  currentMemoryPage.value = 1;
};


// 获取NPC境界信息
const getNpcRealm = (npc: NpcProfile): string => {
  const realmField = npc.境界;
  if (!realmField) return '未知';

  if (typeof realmField === 'object' && realmField !== null) {
    const name = realmField.名称 || '';
    const stage = realmField.阶段 || '';
    if (name) {
      return stage ? `${name}${stage}` : name;
    }
  }

  if (typeof realmField === 'string') {
    return realmField;
  }

  return '未知';
};

// 获取NPC灵根信息
const getNpcSpiritRoot = (npc: NpcProfile): string => {
  return formatSpiritRoot(npc.灵根);
};

// 获取NPC出生信息
const getNpcOrigin = (origin: string | { 名称?: string; 描述?: string; name?: string; description?: string } | undefined): string => {
  if (!origin) return '未知';
  if (typeof origin === 'string') return origin;
  if (typeof origin === 'object') {
    return origin.描述 || origin.description || origin.名称 || origin.name || '未知';
  }
  return '未知';
};

// 获取NPC最近三条记忆
const getNpcRecentMemories = (npc: NpcProfile): string[] => {
  if (!npc.记忆) return [];

  // 如果记忆是数组格式
  if (Array.isArray(npc.记忆)) {
    return npc.记忆
      .slice(-3)
      .reverse()
      .map(m => {
        if (typeof m === 'string') return m;
        if (typeof m === 'object' && m.事件) return m.事件;
        return '';
      })
      .filter(m => m.length > 0);
  }

  return [];
};

// 格式化灵根显示
const formatSpiritRoot = (spiritRoot: string | SpiritRoot | { 名称?: string; 品级?: string; 描述?: string } | undefined): string => {
  if (!spiritRoot) return '未知';
  if (typeof spiritRoot === 'string') return spiritRoot;
  // 兼容中英文字段名
  if (typeof spiritRoot === 'object') {
    const typedSpiritRoot = spiritRoot as { name?: string; 名称?: string; tier?: string; 品级?: string };
    const name = typedSpiritRoot.name || typedSpiritRoot.名称;
    const tier = typedSpiritRoot.tier || typedSpiritRoot.品级;
    if (name && tier) {
      return `${name}(${tier})`;
    }
    if (name) {
      return `${name}(未知品级)`;
    }
  }
  return '格式错误';
};

// 计算NPC年龄
const getNpcAge = (npc: NpcProfile | null): string => {
  if (!npc || !npc.出生日期 || !characterData.value?.游戏时间) {
    return '未知';
  }
  const birthYear = npc.出生日期.年;
  const currentYear = characterData.value.游戏时间.年;
  const age = currentYear - birthYear;
  return age > 0 ? `${age}岁` : '1岁以内';
};

// 类型守卫：判断值是否为有效的NpcProfile
const isNpcProfile = (val: unknown): val is NpcProfile => {
  if (!val || typeof val !== 'object' || val === null) {
    return false;
  }
  const obj = val as Record<string, unknown>;
  // 核心校验：只要有名字，就认为是有效的NPC Profile，以增强容错性
  // 修复：使用更健壮的检查，防止原型链上的属性或非字符串类型导致问题
  const isValid = Object.prototype.hasOwnProperty.call(obj, '名字') &&
                  typeof obj.名字 === 'string' &&
                  (obj.名字 as string).length > 0;

  if (!isValid) {
    console.warn('[人脉系统] 检测到无效的人物关系条目，已自动过滤:', val);
  }
  return isValid;
};

const relationships = computed<NpcProfile[]>(() => {
  if (!characterData.value?.人物关系 || typeof characterData.value.人物关系 !== 'object') {
    return [];
  }
  // 仅保留有效NPC
  return Object.values(characterData.value.人物关系)
    .filter(isNpcProfile);
});

// 过滤后的关系列表（只保留搜索功能）
const filteredRelationships = computed<NpcProfile[]>(() => {
  let filtered = [...relationships.value];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(person =>
      person.名字.toLowerCase().includes(query) ||
      (person.与玩家关系 || '').toLowerCase().includes(query)
    );
  }

  // 按好感度排序
  return filtered.sort((a, b) => (b.好感度 || 0) - (a.好感度 || 0));
});

// 工具函数
const getIntimacyLevel = (intimacy: number | undefined): string => {
  const value = intimacy || 0;
  if (value >= 80) return 'high';
  if (value >= 60) return 'good';
  if (value >= 40) return 'medium';
  if (value >= 20) return 'low';
  if (value >= 0) return 'neutral';
  if (value >= -20) return 'dislike';
  if (value >= -40) return 'hostile';
  return 'enemy';
};

const getIntimacyClass = (intimacy: number | undefined): string => {
  return `intimacy-${getIntimacyLevel(intimacy)}`;
};

const selectPerson = (person: NpcProfile) => {
  const isNewSelection = selectedPerson.value?.名字 !== person.名字;

  // 🔧 数据规范化：确保记忆总结是数组
  if (person && person.记忆总结) {
    if (typeof person.记忆总结 === 'string') {
      // 如果是字符串，转换为数组
      person.记忆总结 = [person.记忆总结];
    } else if (!Array.isArray(person.记忆总结)) {
      // 如果既不是字符串也不是数组，设为空数组
      person.记忆总结 = [];
    }
  }

  selectedPerson.value = selectedPerson.value?.名字 === person.名字
    ? null
    : person;

  // 如果选择了新的人物，重置记忆分页和tab
  if (isNewSelection && selectedPerson.value) {
    resetMemoryPagination();
    activeTab.value = 'basic';
  }

  if (selectedPerson.value) {
    isDetailViewActive.value = true;
  } else {
    isDetailViewActive.value = false;
  }
};

watch(selectedPerson, (newPerson) => {
  if (newPerson) {
    resetMemoryPagination();
  }
});

onMounted(async () => {
  console.log('[人脉系统] 人物关系面板已载入，开始同步数据');
  isLoading.value = true;
  try {
    // 默认选择第一个人物
    if (filteredRelationships.value.length > 0) {
      selectedPerson.value = filteredRelationships.value[0];
    }
  } catch (error) {
    console.error('[人脉系统] 同步数据失败:', error);
    uiStore.showToast('人脉数据同步失败', { type: 'error' });
  } finally {
    isLoading.value = false;
  }
});
// -- 记忆编辑与删除 --
const findRelationshipKeyByName = (name: string): string | null => {
  if (!characterData.value?.人物关系) return null;
  return Object.keys(characterData.value.人物关系).find(key => characterData.value!.人物关系[key]?.名字 === name) || null;
};

const editMemory = async (index: number) => {
  if (!selectedPerson.value) return;
  const name = selectedPerson.value.名字;
  const key = findRelationshipKeyByName(name);
  if (!key) return;

  // 🔴 修复：直接从 gameStateStore.relationships 获取记忆
  if (!gameStateStore.relationships?.[key]?.记忆) return;

  const current = gameStateStore.relationships[key].记忆[index];

  // 新格式：字符串记忆
  if (typeof current === 'string') {
    const newEvent = window.prompt('编辑记忆内容', current);
    if (newEvent === null || newEvent.trim() === '') return;

    // 🔴 修复：直接修改 gameStateStore.relationships
    gameStateStore.relationships[key].记忆[index] = newEvent.trim();
    selectedPerson.value = { ...gameStateStore.relationships[key] };

    await gameStateStore.saveGame();
    uiStore.showToast('记忆已更新', { type: 'success' });
    return;
  }

  // 旧格式兼容：对象记忆
  if (current && typeof current === 'object') {
    const currentTime = (current as { 时间?: string }).时间 || '未知时间';
    const currentEvent = (current as { 事件?: string }).事件 || '';

    const newTime = window.prompt('编辑记忆时间', currentTime);
    if (newTime === null) return;

    const newEvent = window.prompt('编辑记忆事件', currentEvent);
    if (newEvent === null) return;

    // 🔴 修复：直接修改 gameStateStore.relationships
    gameStateStore.relationships[key].记忆[index] = {
      时间: newTime.trim(),
      事件: newEvent.trim()
    };

    selectedPerson.value = { ...gameStateStore.relationships[key] };

    await gameStateStore.saveGame();
    uiStore.showToast('记忆已更新', { type: 'success' });
  }
};

const deleteMemory = async (index: number) => {
  if (!selectedPerson.value) return;
  uiStore.showRetryDialog({
    title: '删除记忆',
    message: '确定要删除这条记忆吗？',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      const name = selectedPerson.value!.名字;
      const key = findRelationshipKeyByName(name);
      if (!key) return;

      // 🔴 修复：直接修改 gameStateStore.relationships，而不是 characterData
      if (!gameStateStore.relationships?.[key]?.记忆) return;

      // 删除记忆
      gameStateStore.relationships[key].记忆.splice(index, 1);

      // 更新选中的人物
      selectedPerson.value = { ...gameStateStore.relationships[key] };

      // 保存到数据库
      await gameStateStore.saveGame();

      uiStore.showToast('记忆已删除', { type: 'success' });
    },
    onCancel: () => {}
  });
};

// NPC物品相关函数
const hasNpcItems = (person: NpcProfile): boolean => {
  const items = person.背包?.物品;
  return items ? Object.keys(items).length > 0 : false;
};

const getItemQualityClass = (quality?: string): string => {
  if (!quality) return 'quality-unknown';
  return `quality-${quality.toLowerCase()}`;
};

const getGradeText = (grade?: number): string => {
  if (grade === undefined || grade === null) return '';
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '下品';
  if (grade >= 4 && grade <= 6) return '中品';
  if (grade >= 7 && grade <= 9) return '上品';
  if (grade === 10) return '极品';
  return '';
};

const initiateTradeWithNpc = (npc: NpcProfile, item: Item) => {
  const actionDescription = `尝试与 ${npc.名字} 交易 ${item.名称}`;
  actionQueue.addAction({
    type: 'npc_trade',
    itemName: item.名称,
    itemType: 'NPC交易',
    description: actionDescription,
    npcName: npc.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'trade'
  });
  uiStore.showToast(`已将与 ${npc.名字} 的交易请求加入动作队列`, { type: 'success' });
};

// 向NPC索要物品
const requestItemFromNpc = (npc: NpcProfile, item: Item) => {
  const actionDescription = `向 ${npc.名字} 索要 ${item.名称}`;
  actionQueue.addAction({
    type: 'npc_request',
    itemName: item.名称,
    itemType: 'NPC索要',
    description: actionDescription,
    npcName: npc.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'request'
  });
  uiStore.showToast(`已将向 ${npc.名字} 索要物品的请求加入动作队列`, { type: 'success' });
};

// 切换NPC关注状态
const toggleAttention = async (person: NpcProfile) => {
  console.log('[关注按钮] 点击了关注按钮，人物:', person.名字);
  const npcName = person.名字;

  try {
    // 🔥 直接访问 gameStateStore 的响应式数据，而不是副本
    const relationships = gameStateStore.relationships;
    if (!relationships) {
      uiStore.showToast('人物关系数据不存在', { type: 'error' });
      return;
    }

    const npcKey = Object.keys(relationships).find(
      key => relationships[key]?.名字 === npcName
    );

    if (!npcKey) {
      uiStore.showToast(`找不到名为 ${npcName} 的人物`, { type: 'error' });
      return;
    }

    // 直接修改 gameStateStore.relationships（响应式数据）
    const npcProfile = relationships[npcKey];
    const newState = !(npcProfile.实时关注 || false);
    npcProfile.实时关注 = newState;

    console.log('[关注按钮] 切换状态:', newState, '保存前的数据:', npcProfile.实时关注);

    // 通过 gameStateStore 保存，这将处理所有持久化逻辑
    await gameStateStore.saveGame();

    console.log('[关注按钮] 保存完成');

    uiStore.showToast(newState ? `已关注 ${npcName}` : `已取消关注 ${npcName}`, { type: 'success' });

    // 强制更新选中的人物（触发响应式）
    if (selectedPerson.value?.名字 === npcName) {
      selectedPerson.value = { ...relationships[npcKey] };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    uiStore.showToast(`操作失败: ${errorMsg}`, { type: 'error' });
    console.error('[关注按钮] 错误:', error);
  }
};

// 检查NPC是否被关注
const isAttentionEnabled = (person: NpcProfile): boolean => {
  return person.实时关注 || false;
};

// 尝试从NPC身上偷窃物品
const attemptStealFromNpc = (npc: NpcProfile, item: Item) => {
  const actionDescription = `尝试从 ${npc.名字} 身上偷取 ${item.名称}`;
  actionQueue.addAction({
    type: 'npc_steal',
    itemName: item.名称,
    itemType: 'NPC偷窃',
    description: actionDescription,
    npcName: npc.名字,
    itemId: item.物品ID || item.名称,
    tradeType: 'steal'
  });
  uiStore.showToast(`已将偷窃 ${npc.名字} 物品的计划加入动作队列`, { type: 'success' });
};

// 总结NPC记忆
const summarizeMemories = async () => {
  if (!selectedPerson.value) return;
  const npcName = selectedPerson.value.名字;
  isSummarizing.value = true;

  try {
    const memories = selectedPerson.value.记忆 || [];
    if (memories.length < 3) {
      uiStore.showToast('至少需要3条记忆才能进行总结', { type: 'warning' });
      return;
    }

    const countToSummarize = Math.min(
      Math.max(3, memoriesToSummarize.value || 10),
      memories.length
    );

    // 提取最旧的N条记忆
    const memoriesToSummarizeList = memories.slice(0, countToSummarize);
    const remainingMemories = memories.slice(countToSummarize);

    // 构建AI提示词 - 使用标准JSON格式
    const memoriesText = memoriesToSummarizeList.map((m, i) => `${i + 1}. ${m}`).join('\n');

    const systemPrompt = `# NPC记忆总结任务

你需要将【${npcName}】的记忆总结成一条简洁的摘要。

## 🔴 核心要求（必须遵守）
1. **这是${npcName}自己的记忆**，不是玩家关于${npcName}的记忆
2. **必须从${npcName}的第一人称视角**总结（使用"我"）
3. **只总结记忆中的事实**，不要编造、推测或添加未出现的情节
4. **不要写成故事**，要写成记忆摘要

## 总结要求
1. 使用第一人称（"我"）的视角，站在${npcName}的角度回忆
2. 按时间顺序梳理事件脉络
3. 保留关键信息：时间、地点、人物、事件、情感变化
4. 🔴 字数严格控制在50-80字，超过80字将被拒绝
5. 使用简洁的记忆摘要风格，不要写成叙事故事
6. 只保留最核心的事件，删除所有修饰词和细节描述

## 示例对比
❌ 错误（故事风格）："那是一个月明星稀的夜晚，${npcName}独自站在山巅..."
✅ 正确（记忆摘要）："我在【时间】与玩家在【地点】相遇，当时我正在..."

## 内容处理规范
- 如果记忆中包含亲密关系内容，使用委婉、文学化的表达
- 使用"云雨之欢"、"鱼水之欢"、"共度良宵"等古典词汇
- 侧重情感层面和关系发展，淡化具体细节

## 输出格式（严格遵守）
\`\`\`json
{
  "text": "总结的记忆内容（50-80字，第一人称，简洁）",
  "mid_term_memory": "",
  "tavern_commands": []
}
\`\`\`

注意：
- text字段必须是第一人称视角的记忆摘要
- 🔴 字数必须在50-80字之间，不能超过80字
- 只写核心事件，删除所有修饰词
- mid_term_memory留空
- tavern_commands留空数组
- 不要在JSON外添加任何说明文字`;

    const userPrompt = `请从【${npcName}】的第一人称视角，总结以下记忆：

${memoriesText}

🔴 重要提醒：
1. 你是${npcName}，用"我"来总结这些记忆
2. 字数必须严格控制在50-80字，不能超过80字
3. 只写核心事件，删除所有修饰词和细节描述`;

    uiStore.showToast('正在调用AI总结记忆...', { type: 'info' });

    // 🔴 使用 Raw 模式，完全不加载角色卡和聊天历史
    const tavernHelper = (await import('@/utils/tavern')).getTavernHelper();
    if (!tavernHelper) {
      throw new Error('TavernHelper 未初始化');
    }

    // 构建完整的提示词（system + user）
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // 使用 generateRaw 直接调用 AI
    const response = await tavernHelper.generateRaw({
      prompt: fullPrompt,
      use_mancer: false,
      api: 'openai',
      model: '',  // 使用默认模型
      max_length: 500,  // 限制生成长度
      temperature: 0.7,
      top_p: 1,
      top_k: 0,
      rep_pen: 1,
      rep_pen_range: 0,
      rep_pen_slope: 0,
      streaming: false,
    });

    // 解析响应（Raw 模式）
    let summary: string;
    const responseText = String(response).trim();
    console.log('[NPC记忆总结] Raw响应:', responseText.substring(0, 200));

    // 1. 尝试提取 JSON 代码块
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        const jsonObj = JSON.parse(jsonBlockMatch[1].trim());
        summary = (jsonObj.text || jsonObj.summary || jsonObj.content || '').trim();
        console.log('[NPC记忆总结] 从JSON代码块提取成功');
      } catch (e) {
        console.error('[NPC记忆总结] JSON代码块解析失败:', e);
        summary = '';
      }
    } else {
      // 2. 尝试直接解析为 JSON
      try {
        const jsonObj = JSON.parse(responseText);
        summary = (jsonObj.text || jsonObj.summary || jsonObj.content || '').trim();
        console.log('[NPC记忆总结] 直接JSON解析成功');
      } catch {
        // 3. 直接使用响应文本
        summary = responseText.trim();
        console.log('[NPC记忆总结] 使用原始文本');
      }
    }

    if (!summary || summary.length === 0) {
      throw new Error('AI返回了空的总结结果');
    }

    // 更新NPC数据
    const currentSaveData = gameStateStore.getCurrentSaveData();
    if (!currentSaveData?.人物关系) {
      throw new Error('人物关系数据不存在');
    }

    const npcKey = Object.keys(currentSaveData.人物关系).find(
      key => currentSaveData.人物关系[key]?.名字 === npcName
    );

    if (!npcKey) {
      throw new Error(`找不到名为 ${npcName} 的人物`);
    }

    const npcProfile = currentSaveData.人物关系[npcKey];

    // 添加到记忆总结数组
    if (!npcProfile.记忆总结) {
      npcProfile.记忆总结 = [];
    }
    npcProfile.记忆总结.push(summary.trim());

    // 更新记忆数组（删除已总结的记忆）
    npcProfile.记忆 = remainingMemories;

    // 🔥 先更新Pinia状态
    if (gameStateStore.relationships && gameStateStore.relationships[npcKey]) {
      gameStateStore.relationships[npcKey] = { ...npcProfile };
    }

    // 🔥 然后保存到存档
    await gameStateStore.saveGame();

    // 更新选中的人物（触发UI刷新）
    if (selectedPerson.value?.名字 === npcName) {
      selectedPerson.value = { ...npcProfile };
    }

    uiStore.showToast(`✅ 已成功总结 ${countToSummarize} 条记忆`, { type: 'success' });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    uiStore.showToast(`总结失败: ${errorMsg}`, { type: 'error' });
    console.error(`[RelationshipNetworkPanel] 记忆总结失败:`, error);
  } finally {
    isSummarizing.value = false;
  }
};

// 删除NPC
// 获取天赋名称的辅助函数
const getTalentName = (talent: string | { 名称?: string; name?: string } | undefined): string => {
  if (typeof talent === 'string') return talent;
  if (typeof talent === 'object' && talent !== null) {
    return talent.名称 || talent.name || talent['名称'] || talent['name'] || '未知天赋';
  }
  return '未知天赋';
};

// 获取天赋描述的辅助函数
const getTalentDescription = (talent: string | { 描述?: string; description?: string } | undefined): string => {
  if (typeof talent === 'string') return '';
  if (typeof talent === 'object' && talent !== null) {
    return talent.描述 || talent.description || talent['描述'] || talent['description'] || '';
  }
  return '';
};

// 显示天赋详情
const showTalentDetail = (talent: string | { 名称?: string; name?: string; 描述?: string; description?: string } | undefined) => {
  const name = getTalentName(talent);
  const desc = getTalentDescription(talent);
  if (desc) {
    uiStore.showDetailModal({ title: name, content: desc });
  }
};

const confirmDeleteNpc = (person: NpcProfile) => {
  if (!person) return;
  uiStore.showRetryDialog({
    title: '删除人物',
    message: `你确定要从这个世界中永久删除【${person.名字}】吗？此操作无法撤销，所有与该人物相关的数据都将消失。`,
    confirmText: '确认删除',
    cancelText: '取消',
    onConfirm: async () => {
      // 🔥 提前清空选择，避免删除后UI尝试渲染不存在的NPC
      const npcNameToDelete = person.名字;
      const wasSelected = selectedPerson.value?.名字 === npcNameToDelete;

      if (wasSelected) {
        selectedPerson.value = null;
        isDetailViewActive.value = false;
      }

      try {
        // deleteNpc 内部会自动保存到存档
        await characterStore.deleteNpc(npcNameToDelete);
        // 删除成功，无需额外操作（已提前清空选择）
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        uiStore.showToast(`删除失败: ${errorMsg}`, { type: 'error' });
        console.error('删除NPC失败:', error);

        // 🔥 如果删除失败且之前清空了选择，尝试重新从人物列表中找到该NPC并恢复选择
        // （因为deleteNpc函数会回滚数据）
        if (wasSelected) {
          const restoredNpc = relationships.value.find(npc => npc.名字 === npcNameToDelete);
          if (restoredNpc) {
            selectedPerson.value = restoredNpc;
            isDetailViewActive.value = true;
          }
        }
      }
    },
    onCancel: () => {}
  });
};
</script>

<style scoped>
.raw-data-container {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1rem;
  max-height: 600px;
  overflow-y: auto;
  font-size: 0.8rem;
}

.raw-data-container pre {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.spirit-stones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.spirit-stone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-surface);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.spirit-stone-item span:first-child {
  color: var(--color-text-secondary);
}

.spirit-stone-item span:last-child {
  font-weight: 600;
  color: var(--color-primary);
}

.relationship-network-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.relationships-container {
  height: 100%;
  display: flex;
  background: var(--color-surface);
  overflow: hidden;
}

.relationship-list {
  width: 280px; /* 窄一点 */
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
}

.search-bar svg {
  color: var(--color-text-secondary);
  margin-right: 0.5rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.875rem;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-text {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.8;
}

.person-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.person-card {
  display: flex;
  align-items: center;
  padding: 0.75rem; /* 更紧凑 */
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.person-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.person-card.selected {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.person-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  margin-right: 0.75rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.avatar-text {
  font-size: 1.2rem;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.person-meta {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.relationship-type {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.attention-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(156, 163, 175, 0.1);
  border: 1px solid rgba(156, 163, 175, 0.2);
  padding: 0;
  outline: none;
  position: relative;
  z-index: 100;
  pointer-events: auto;
}

.attention-toggle:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.1);
}

.attention-icon {
  transition: all 0.2s ease;
}

.attention-icon.active {
  color: #22c55e;
}

.attention-icon.inactive {
  color: #9ca3af;
}

.attention-toggle:hover .attention-icon.inactive {
  color: #3b82f6;
}

.attention-toggle:hover .attention-icon.active {
  color: #16a34a;
}

.person-realm {
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.person-realm .realm-label {
  margin-right: 0.25rem;
}

.person-realm .realm-value {
  color: var(--color-primary);
  font-weight: 600;
}

.intimacy-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.intimacy-bar {
  flex: 1;
  height: 4px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.intimacy-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.intimacy-high { background: linear-gradient(90deg, #22c55e, #16a34a); }
.intimacy-good { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
.intimacy-medium { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
.intimacy-low { background: linear-gradient(90deg, #f59e0b, #d97706); }
.intimacy-neutral { background: linear-gradient(90deg, #6b7280, #4b5563); }
.intimacy-dislike { background: linear-gradient(90deg, #f97316, #ea580c); }
.intimacy-hostile { background: linear-gradient(90deg, #dc2626, #b91c1c); }
.intimacy-enemy { background: linear-gradient(90deg, #ef4444, #dc2626); }

.intimacy-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 30px;
  text-align: right;
}

.arrow-icon {
  color: var(--color-border-hover);
  transition: transform 0.2s;
}

.person-card.selected .arrow-icon {
  transform: rotate(90deg);
  color: var(--color-primary);
}

.relationship-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 关键修复：允许flex项收缩，防止内容溢出 */
  overflow: hidden; /* 隐藏所有溢出，滚动由子元素处理 */
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.detail-info {
  flex: 1;
  min-width: 0; /* 允许flex项收缩，防止长名称撑开容器 */
}

.detail-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  word-break: break-all; /* 强制长名称换行 */
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.relationship-badge, .intimacy-badge, .race-badge, .faction-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.relationship-badge {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.race-badge {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.faction-badge {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 允许收缩 */
  overflow-y: auto; /* 内容溢出时滚动 */
  padding: 1rem;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-state-small {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
}

.detail-section {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.info-grid-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.memory-actions-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.memory-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.summarize-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summarize-input {
  width: 60px;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.75rem;
  text-align: center;
  transition: all 0.2s ease;
}

.summarize-input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
}

.summarize-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.summarize-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.summarize-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.memory-summary-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.memory-summary-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(124, 58, 237, 0.05));
  border-radius: 8px;
  border-left: 3px solid #8b5cf6;
}

.summary-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.summary-text {
  flex: 1;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text);
}

.memory-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  margin-top: 1rem;
}

.pagination-btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.memory-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.memory-time {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
  opacity: 0.8;
}

.memory-event {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.memory-actions { display: flex; gap: 6px; }

.memory-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: var(--color-background);
}
.memory-btn.edit { color: #2563eb; border-color: #bfdbfe; }
.memory-btn.delete { color: #dc2626; border-color: #fecaca; }

/* 简化：外貌描述样式 */
.appearance-description {
  padding: 1rem;
  background: rgba(147, 51, 234, 0.05);
  border-radius: 8px;
  border-left: 3px solid #9333ea;
}

.description-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;
  font-style: italic;
}

.subsection-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.talents-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.talent-tag {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.75rem;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.attr-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.attr-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* NPC物品样式 */
.npc-inventory {
  margin-top: 0.75rem;
}


.npc-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.npc-item-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.npc-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.npc-item-card.quality-凡 {
  border-left: 3px solid #6b7280;
}

.npc-item-card.quality-黄 {
  border-left: 3px solid #f59e0b;
}

.npc-item-card.quality-玄 {
  border-left: 3px solid #8b5cf6;
}

.npc-item-card.quality-地 {
  border-left: 3px solid #06b6d4;
}

.npc-item-card.quality-天 {
  border-left: 3px solid #ec4899;
}

.npc-item-card.quality-仙 {
  border-left: 3px solid #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

.npc-item-card.quality-神 {
  border-left: 3px solid #9333ea;
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.4);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.item-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.item-type {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.item-quality {
  margin-bottom: 0.5rem;
}

.quality-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.item-quantity {
  text-align: right;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  /* 使用主题主色，增强与卡片背景的对比度 */
  color: var(--color-primary);
  font-weight: 700;
}

.item-description {
  margin-bottom: 0.75rem;
}

.item-description p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.trade-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trade-btn:hover {
  background: linear-gradient(135deg, #047857, #065f46);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}

.trade-btn:active {
  transform: translateY(0);
}

.request-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.request-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.request-btn:active {
  transform: translateY(0);
}

.steal-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.steal-btn:hover {
  background: linear-gradient(135deg, #b91c1c, #991b1b);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.steal-btn:active {
  transform: translateY(0);
}

.empty-inventory {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-inventory .empty-icon {
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text-secondary);
}

.placeholder-icon {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.placeholder-text {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.placeholder-hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* === NSFW 私密信息样式 === */
.nsfw-section {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(219, 39, 119, 0.05));
  border: 2px solid rgba(236, 72, 153, 0.3);
}

.nsfw-subsection {
  margin-bottom: 1rem;
}

.nsfw-subsection:last-child {
  margin-bottom: 0;
}

.development-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dev-bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dev-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.dev-label {
  color: var(--color-text);
  font-weight: 500;
}

.dev-value {
  color: #ec4899;
  font-weight: 700;
  font-size: 0.75rem;
}

.dev-bar-track {
  height: 8px;
  background: rgba(236, 72, 153, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.dev-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #db2777);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-正常 {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.status-微湿 {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.status-发情 {
  background: rgba(236, 72, 153, 0.2);
  color: #ec4899;
}

.status-高潮 {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
}

.status-贤者时间 {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.fetish-tag {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.15));
  color: #ec4899;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.partner-tag {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(219, 39, 119, 0.12));
  color: #db2777;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(236, 72, 153, 0.25);
}

.partner-list {
  margin-top: 0.75rem;
}

.pregnancy-info {
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.pregnancy-active {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.pregnancy-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.pregnancy-details {
  flex: 1;
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.6;
}

.pregnancy-inactive {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.first-time-info {
  padding: 0.75rem;
  background: rgba(236, 72, 153, 0.05);
  border-radius: 6px;
  border-left: 3px solid #ec4899;
  font-size: 0.85rem;
  color: var(--color-text);
}

/* 实时状态高亮区域（通用）*/
.highlight-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.realtime-status {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.status-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  line-height: 1;
}

.status-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-text {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
  font-style: italic;
}

.desire-fill {
  background: linear-gradient(90deg, #f59e0b, #dc2626);
}

.mini-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

/* 性经验统计 */
.experience-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.exp-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.exp-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.exp-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.exp-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.exp-value {
  font-size: 0.95rem;
  color: #ec4899;
  font-weight: 700;
}

.last-time-info {
  padding: 0.5rem 0.75rem;
  background: rgba(236, 72, 153, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
  text-align: center;
}

.last-time-label {
  color: var(--color-text-secondary);
  margin-right: 0.5rem;
}

.last-time-value {
  color: var(--color-text);
  font-weight: 600;
}

/* 身体部位列表 */
.body-parts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.body-part-item {
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.part-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.part-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.part-mark {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.2));
  color: #ec4899;
  border-radius: 4px;
  font-weight: 500;
}

.part-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: rgba(236, 72, 153, 0.05);
  border-radius: 4px;
  line-height: 1.4;
}

.part-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.part-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  min-width: 50px;
}

.stat-bar-mini {
  flex: 1;
  height: 6px;
  background: rgba(236, 72, 153, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stat-bar-fill.sensitivity {
  background: linear-gradient(90deg, #f59e0b, #ec4899);
}

.stat-bar-fill.development {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
}

.stat-value {
  font-size: 0.7rem;
  color: #ec4899;
  font-weight: 700;
  min-width: 35px;
  text-align: right;
}

/* 体液状态 */
.fluid-status {
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(236, 72, 153, 0.08));
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  font-size: 0.85rem;
  color: var(--color-text);
  font-style: italic;
}

/* 特殊体质标签 */
.special-trait-tag {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15));
  color: #a855f7;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

/* ========== 人格底线样式 ========== */
.personality-section {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(249, 115, 22, 0.08));
  border-left: 4px solid #ef4444;
}

.personality-bottomlines {
  margin-bottom: 0.75rem;
}

.bottomline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bottomline-tag {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.15));
  color: #ef4444;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1.5px solid rgba(239, 68, 68, 0.4);
  display: inline-flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
  transition: all 0.2s ease;
}

.bottomline-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.6);
}

.bottomline-empty {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

.bottomline-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.warning-icon {
  font-size: 1.1rem;
  color: #f59e0b;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.warning-text {
  color: #dc2626;
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 500;
}

/* ========== Tab导航样式 ========== */
.detail-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0 0 1rem 0;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tab-btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px 8px 0 0;
  padding: 0.5rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;
  outline: none;
}

.tab-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-text);
  transform: translateY(-2px);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

/* ========== 响应式2列布局样式 ========== */
.info-grid-responsive {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* 小屏幕时切换为单列 */
@media (max-width: 500px) {
  .info-grid-responsive {
    grid-template-columns: 1fr;
  }
}

.info-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background 0.2s ease;
}

.info-item-row:hover {
  background: rgba(59, 130, 246, 0.03);
}

.info-item-row .info-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 50px;
}

.info-item-row .info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  text-align: right;
  flex: 1;
  word-break: break-word;
}

/* ========== NPC记忆列表样式 ========== */
.npc-memories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.npc-memory-item {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.05), rgba(249, 115, 22, 0.05));
  border-left: 3px solid #eab308;
  border-radius: 4px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.npc-memory-item:hover {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(249, 115, 22, 0.1));
  transform: translateX(4px);
  box-shadow: 0 2px 6px rgba(234, 179, 8, 0.15);
}

.npc-memory-content {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* ========== NPC六司属性样式 ========== */
.npc-attributes-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.npc-attr-group {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 8px;
  padding: 10px;
}

.npc-attr-group-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.npc-attr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.npc-attr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.npc-attr-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}

.npc-attr-item.final {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
}

.npc-attr-item.final:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
}

.npc-attr-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
  font-weight: 500;
}

.npc-attr-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary);
}

.name-and-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.delete-npc-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.delete-npc-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
  transform: scale(1.1);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 10;
  pointer-events: auto;
}

.delete-btn-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(156, 163, 175, 0.1);
  border: 1px solid rgba(156, 163, 175, 0.2);
  color: #9ca3af;
  padding: 0;
  outline: none;
  position: relative;
  z-index: 100;
  pointer-events: auto;
}

.delete-btn-card:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
  transform: scale(1.1);
}

.back-to-list-btn {
  display: none; /* 默认隐藏 */
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.back-to-list-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .relationships-container {
    position: relative;
    overflow: hidden;
  }

  .relationship-list,
  .relationship-detail {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: transform 0.3s ease-in-out;
    backface-visibility: hidden;
  }

  .relationship-list {
    transform: translateX(0);
    z-index: 10;
  }

  .relationship-detail {
    transform: translateX(100%);
    z-index: 20;
    border-left: none; /* 移除左边框 */
  }

  .relationships-container.details-active .relationship-list {
    transform: translateX(-100%);
  }

  .relationships-container.details-active .relationship-detail {
    transform: translateX(0);
  }

  .back-to-list-btn {
    display: flex; /* 在移动端显示 */
  }

  .detail-header {
    padding: 0.75rem 1rem;
  }
}
</style>
