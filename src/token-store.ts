const _memory = new Map<string, string | null>();

export function createTokenStore(storageKey: string) {
  const memKey = `__token_${storageKey}`;

  return {
    get(): string | null {
      if (_memory.has(memKey)) {
        return _memory.get(memKey) ?? null;
      }
      const stored = localStorage.getItem(storageKey);
      _memory.set(memKey, stored);
      return stored;
    },

    set(token: string | null) {
      _memory.set(memKey, token);
      if (token) {
        localStorage.setItem(storageKey, token);
      } else {
        localStorage.removeItem(storageKey);
      }
    },

    clear() {
      _memory.set(memKey, null);
      localStorage.removeItem(storageKey);
    },
  };
}
