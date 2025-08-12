// A simple event bus using the browser's CustomEvent API.
// This allows for decoupled communication between components and services.

type EventCallback<T = unknown> = (data: T) => void

class EventBus {
  private eventTarget: EventTarget

  constructor() {
    this.eventTarget = new EventTarget()
  }

  on<T>(eventName: string, callback: EventCallback<T>) {
    const handler = (event: Event) => {
      callback((event as CustomEvent<T>).detail)
    }
    this.eventTarget.addEventListener(eventName, handler)
    // We could return a function to unsubscribe, making 'off' more robust.
  }

  emit<T>(eventName: string, data?: T) {
    const event = new CustomEvent(eventName, { detail: data })
    this.eventTarget.dispatchEvent(event)
  }

  // The 'off' method remains complex to implement correctly without managing listeners.
  // For now, we will leave it as is, but a full implementation would require
  // storing callbacks to remove them accurately.
  off(eventName: string, callback: EventCallback<unknown>) {
    console.warn(`EventBus 'off' for event "${eventName}" is not fully implemented.`, callback)
  }
}

const eventBus = new EventBus()

export function useEventBus() {
  return eventBus
}

export const AppEvents = {
  CHARACTER_CREATED: 'character:created',
  STATE_UPDATED: 'state:updated',
  RULE_RECEIVED: 'rule:received', // 天机降临之法旨
}
