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
  // 每次語言變更時 re-render。
  //
  // 第三個參數（getServerSnapshot）不可省略：`expo export` 會把每個路由
  // 預先渲染成靜態 HTML，該階段沒有瀏覽器端的訂閱來源。少了它，React 會在
  // 預渲染時拋錯（minified error #419），整頁退回客戶端渲染——畫面最終還是
  // 出得來，但 hydration 已經失敗，且 DOM 會短暫留在 0×0 的狀態。
  const snap = useSyncExternalStore(subscribeToLang, getSnapshot, getSnapshot);
  return {
    t,
    lang: getLang(),
    setLang,
    // 每次通知都遞增，包括語言沒變、只是譯文 chunk 載完的那一次。
    // 以翻譯後文字為輸入的 useMemo 要依它重算，只依 lang 會卡在載入前的結果。
    i18nRevision: snap,
  };
}
