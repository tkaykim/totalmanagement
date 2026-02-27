'use client';

import { create } from 'zustand';

interface BackHandlerEntry {
  id: symbol;
  handler: () => void;
}

interface BackHandlerStore {
  handlers: BackHandlerEntry[];
  push: (handler: () => void) => () => void;
  getTop: () => (() => void) | null;
}

export const useBackHandlerStore = create<BackHandlerStore>((set, get) => ({
  handlers: [],

  push: (handler) => {
    const id = Symbol();
    set((s) => ({ handlers: [...s.handlers, { id, handler }] }));
    return () => {
      set((s) => ({
        handlers: s.handlers.filter((h) => h.id !== id),
      }));
    };
  },

  getTop: () => {
    const { handlers } = get();
    if (handlers.length === 0) return null;
    return handlers[handlers.length - 1]!.handler;
  },
}));
