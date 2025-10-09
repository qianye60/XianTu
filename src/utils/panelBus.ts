type PanelAction = 'refresh' | 'save' | 'test' | 'clear' | 'export' | 'stats' | 'memory-settings-updated';

type Handler = (payload?: any) => void | Promise<void>;

class PanelBus {
  private listeners: Map<PanelAction, Set<Handler>> = new Map();

  on(action: PanelAction, handler: Handler) {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action)!.add(handler);
  }

  off(action: PanelAction, handler: Handler) {
    this.listeners.get(action)?.delete(handler);
  }

  async emit(action: PanelAction, payload?: any) {
    const handlers = Array.from(this.listeners.get(action) || []);
    for (const h of handlers) {
      await h(payload);
    }
  }
}

export const panelBus = new PanelBus();
export type { PanelAction };