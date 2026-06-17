/**
 * 简易事件总线 — 替代 Web 端的 window.dispatchEvent(CustomEvent)
 * 使用 mitt 的极简实现
 */

type Handler = (data?: any) => void;

const listeners: Record<string, Set<Handler>> = {};

export const eventBus = {
  on(event: string, handler: Handler): void {
    if (!listeners[event]) {
      listeners[event] = new Set();
    }
    listeners[event].add(handler);
  },

  off(event: string, handler: Handler): void {
    listeners[event]?.delete(handler);
  },

  emit(event: string, data?: any): void {
    listeners[event]?.forEach((handler) => {
      try {
        handler(data);
      } catch (e) {
        console.warn(`Event handler error for "${event}":`, e);
      }
    });
  },
};

// 事件名称常量
export const Events = {
  MESSAGE_DATA_CHANGED: 'messageDataChanged',
  MESSAGE_UNREAD_STATE_CHANGED: 'messageUnreadStateChanged',
  NOTIFICATION_READ: 'notificationRead',
  GROUP_MUTE_CHANGED: 'groupMuteChanged',
};
