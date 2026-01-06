export type ChatBusAction = 'prefill' | 'send';

export type ChatBusPayload = {
  text: string;
  focus?: boolean;
};

type Handler = (payload: ChatBusPayload) => void | Promise<void>;

class ChatBus {
  private listeners: Map<ChatBusAction, Set<Handler>> = new Map();

  on(action: ChatBusAction, handler: Handler) {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action)!.add(handler);
  }

  off(action: ChatBusAction, handler: Handler) {
    this.listeners.get(action)?.delete(handler);
  }

  async emit(action: ChatBusAction, payload: ChatBusPayload) {
    const handlers = Array.from(this.listeners.get(action) || []);
    for (const h of handlers) {
      await h(payload);
    }
  }
}

export const chatBus = new ChatBus();

export function prefillChat(text: string, focus: boolean = true) {
  return chatBus.emit('prefill', { text, focus });
}

export function sendChat(text: string, focus: boolean = true) {
  return chatBus.emit('send', { text, focus });
}

