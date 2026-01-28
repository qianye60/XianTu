import { buildBackendUrl, isBackendConfigured } from '@/services/backendConfig';

type PendingTravelNoteV1 = {
  v: 1;
  sessionId: number;
  note: string;
  meta?: unknown;
  createdAt: string;
  retryCount: number;
};

const STORAGE_KEY = 'dad_pending_travel_notes_v1';
export const TRAVEL_NOTE_EVENT = 'dad:travel-note-posted';

function readQueue(): PendingTravelNoteV1[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => x as PendingTravelNoteV1)
      .filter((x) => x.v === 1 && Number.isFinite(x.sessionId) && typeof x.note === 'string')
      .slice(-200);
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingTravelNoteV1[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-200)));
  } catch {
    // ignore
  }
}

export function enqueueTravelNote(sessionId: number, note: string, meta?: unknown) {
  const sid = Number(sessionId);
  if (!Number.isFinite(sid) || sid <= 0) return;
  const trimmed = String(note ?? '').trim();
  if (!trimmed) return;

  const item: PendingTravelNoteV1 = {
    v: 1,
    sessionId: sid,
    note: trimmed.slice(0, 600),
    meta,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
  notifyTravelNoteChanged(sid);
}

function notifyTravelNoteChanged(sessionId: number) {
  try {
    window.dispatchEvent(new CustomEvent(TRAVEL_NOTE_EVENT, { detail: { sessionId } }));
  } catch {
    // ignore
  }
}

async function postTravelNoteSilent(sessionId: number, note: string, meta?: unknown): Promise<void> {
  if (!isBackendConfigured()) throw new Error('backend_not_configured');
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('no_token');

  const url = buildBackendUrl('/api/v1/travel/note');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId, note, meta }),
    keepalive: true,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`http_${response.status}:${text.substring(0, 120)}`);
  }
}

let flushing: Promise<void> | null = null;

export async function flushPendingTravelNotes(options?: { sessionId?: number; max?: number }) {
  if (flushing) return flushing;

  flushing = (async () => {
    const max = typeof options?.max === 'number' && Number.isFinite(options.max) ? Math.max(1, Math.min(50, options.max)) : 15;
    const filterSessionId =
      options?.sessionId != null && Number.isFinite(Number(options.sessionId)) ? Number(options.sessionId) : null;

    const queue = readQueue();
    if (queue.length === 0) return;

    let processed = 0;
    const remaining: PendingTravelNoteV1[] = [];

    for (const item of queue) {
      if (processed >= max) {
        remaining.push(item);
        continue;
      }
      if (filterSessionId != null && item.sessionId !== filterSessionId) {
        remaining.push(item);
        continue;
      }

      try {
        await postTravelNoteSilent(item.sessionId, item.note, item.meta);
        processed++;
        notifyTravelNoteChanged(item.sessionId);
      } catch {
        const next: PendingTravelNoteV1 = { ...item, retryCount: (item.retryCount || 0) + 1 };
        remaining.push(next);
        // 避免在网络不可用时把队列全部打满错误：本轮直接停止
        remaining.push(...queue.slice(queue.indexOf(item) + 1));
        break;
      }
    }

    writeQueue(remaining);
  })().finally(() => {
    flushing = null;
  });

  return flushing;
}

export async function tryPostTravelNoteWithQueue(sessionId: number, note: string, meta?: unknown): Promise<void> {
  const sid = Number(sessionId);
  const trimmed = String(note ?? '').trim();
  if (!Number.isFinite(sid) || sid <= 0 || !trimmed) return;

  try {
    await postTravelNoteSilent(sid, trimmed.slice(0, 600), meta);
    notifyTravelNoteChanged(sid);
    void flushPendingTravelNotes({ sessionId: sid, max: 10 });
  } catch {
    enqueueTravelNote(sid, trimmed, meta);
  }
}

