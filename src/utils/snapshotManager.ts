/**
 * 轻量级快照管理器 - 支持多次回退
 * 只保存核心数据，不包含叙事历史
 */
import type { SaveData } from '@/types/game';

export interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  data: Partial<SaveData>;
  narrativeLength: number; // 保存叙事历史的长度而不是内容
}

const MAX_SNAPSHOTS = 10;
const snapshots = new Map<string, Snapshot[]>();

function getKey(charId: string, slot: string): string {
  return `${charId}_${slot}`;
}

function extractCoreData(saveData: SaveData): Partial<SaveData> {
  return {
    角色: saveData.角色,
    社交: saveData.社交,
    世界: saveData.世界,
    元数据: saveData.元数据,
    宗门系统: saveData.宗门系统,
    三千大道: saveData.三千大道,
    修炼: saveData.修炼,
    功法系统: saveData.功法系统,
    技能状态: saveData.技能状态,
    效果: saveData.效果,
    事件系统: saveData.事件系统,
    短期记忆: saveData.短期记忆
  };
}

export function createSnapshot(charId: string, slot: string, saveData: SaveData, label?: string): void {
  const key = getKey(charId, slot);
  const list = snapshots.get(key) || [];

  const time = new Date();
  const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  const lastMemory = saveData.短期记忆?.[saveData.短期记忆.length - 1];
  const memoryPreview = lastMemory?.内容?.substring(0, 15) || '对话';

  const snapshot: Snapshot = {
    id: `snap_${Date.now()}`,
    timestamp: Date.now(),
    label: label || `${timeStr} ${memoryPreview}`,
    data: extractCoreData(saveData),
    narrativeLength: saveData.叙事历史?.length || 0
  };

  list.push(snapshot);
  if (list.length > MAX_SNAPSHOTS) list.shift();
  snapshots.set(key, list);
}

export function getSnapshots(charId: string, slot: string): Snapshot[] {
  return snapshots.get(getKey(charId, slot)) || [];
}

export function getSnapshot(charId: string, slot: string, id: string): Snapshot | null {
  const list = getSnapshots(charId, slot);
  return list.find(s => s.id === id) || null;
}

export function clearSnapshots(charId: string, slot: string): void {
  snapshots.delete(getKey(charId, slot));
}

export function deleteSnapshotsFrom(charId: string, slot: string, fromIndex: number): void {
  const key = getKey(charId, slot);
  const list = snapshots.get(key) || [];
  list.splice(fromIndex, 1);
  snapshots.set(key, list);
}

export function restoreSnapshot(currentData: SaveData, snapshot: Snapshot): SaveData {
  return {
    ...currentData,
    ...snapshot.data,
    叙事历史: currentData.叙事历史?.slice(0, snapshot.narrativeLength) || []
  };
}
