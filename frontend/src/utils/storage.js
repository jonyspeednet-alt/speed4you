// Storage may be blocked by browser privacy settings. Public browsing should
// still work; keep a tab-local fallback when persistent storage is unavailable.
const memory = new Map();

export function readStorage(key) {
  try { return window.localStorage.getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}

export function writeStorage(key, value) {
  memory.set(key, value);
  try { window.localStorage.setItem(key, value); } catch { /* Tab-local fallback. */ }
}

export function removeStorage(key) {
  memory.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* Storage is unavailable. */ }
}
