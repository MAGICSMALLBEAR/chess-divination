// i18n Hook - 訂閱語言變更
import { useSyncExternalStore } from 'react';
import { t, getLang, setLang, subscribe, type Lang } from '@/services/i18n';

// 用於強制 re-render 的 counter
let counter = 0;
const listeners = new Set<() => void>();

subscribe(() => {
  counter++;
  listeners.forEach(fn => fn());
});

function subscribeToLang(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return counter;
}

export function useI18n() {
  // 每次語言變更時 re-render
  const snap = useSyncExternalStore(subscribeToLang, getSnapshot);
  void snap; // suppress unused warning

  return {
    t,
    lang: getLang(),
    setLang,
  };
}
