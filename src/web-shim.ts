/**
 * Shim for Chrome extension APIs to prevent errors when running in a web-only environment
 * such as GitHub Pages. Provides no-op implementations of the most common APIs used in
 * the application so that calls to chrome.runtime or chrome.storage do not throw.
 */
export function installChromeWebShim() {
  const w: any = window as any;
  // If we're actually in a Chrome extension context, do nothing.
  if (w.chrome?.runtime?.id) return;

  // In-memory storage used by the shim
  const memory = new Map<string, any>();
  const storageLocal = {
    get: (keys?: any) => {
      // Return all entries if no key is provided, or the value for a single key
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: memory.get(keys) });
      }
      const obj: Record<string, any> = {};
      for (const [k, v] of memory.entries()) {
        obj[k] = v;
      }
      return Promise.resolve(obj);
    },
    set: (items: Record<string, any>) => {
      for (const [k, v] of Object.entries(items)) {
        memory.set(k, v);
      }
      return Promise.resolve();
    },
    remove: (keys: any) => {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => memory.delete(k));
      return Promise.resolve();
    },
    clear: () => {
      memory.clear();
      return Promise.resolve();
    },
  };

  const onMessage = {
    addListener: (_fn: any) => {},
    removeListener: (_fn: any) => {},
    hasListener: (_fn: any) => false,
  };

  w.chrome = w.chrome ?? {};
  w.chrome.runtime = w.chrome.runtime ?? {};
  w.chrome.runtime.id = 'web-shim';
  w.chrome.runtime.sendMessage = (..._args: any[]) => Promise.resolve(undefined);
  w.chrome.runtime.onMessage = onMessage;

  w.chrome.storage = w.chrome.storage ?? {};
  w.chrome.storage.local = storageLocal;
}
