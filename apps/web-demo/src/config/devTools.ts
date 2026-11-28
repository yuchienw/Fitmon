import { useSyncExternalStore } from 'react';

export const DEV_TOOLS_STORAGE_KEY = 'fitmon-dev-tools';
export const DEV_TOOLS_EVENT_NAME = 'fitmon-dev-tools-change';

/**
 * 檢查目前是否已啟用開發者工具。
 * 僅依賴獨立的 localStorage key，不寫入 zustand persist 存檔。
 */
export function isDevToolsEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const val = window.localStorage.getItem(DEV_TOOLS_STORAGE_KEY);
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

/**
 * 設定開發者工具開關，同步至 localStorage 並發送自訂事件讓 hook 監聽更新。
 */
export function setDevToolsEnabled(on: boolean): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(DEV_TOOLS_STORAGE_KEY, on ? '1' : '0');
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event =
        typeof CustomEvent === 'function'
          ? new CustomEvent(DEV_TOOLS_EVENT_NAME, { detail: { enabled: on } })
          : new Event(DEV_TOOLS_EVENT_NAME);
      window.dispatchEvent(event);
    } catch {
      // ignore
    }
  }
}

/**
 * 解析網址查詢參數：?devtools=1 開啟，?devtools=0 關閉，並寫入 localStorage。
 */
export function initDevToolsFromUrl(search?: string): boolean | null {
  let queryString = search;
  if (typeof queryString === 'undefined') {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    queryString = window.location.search;
  }
  try {
    if (queryString && queryString.includes('?')) {
      queryString = queryString.slice(queryString.indexOf('?'));
    }
    const params = new URLSearchParams(queryString);
    const devtools = params.get('devtools');
    if (devtools === '1') {
      setDevToolsEnabled(true);
      return true;
    } else if (devtools === '0') {
      setDevToolsEnabled(false);
      return false;
    }
  } catch {
    // ignore
  }
  return null;
}

// 瀏覽器端模組載入時自動解析 URL 參數
if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
  initDevToolsFromUrl();
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(DEV_TOOLS_EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(DEV_TOOLS_EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): boolean {
  return isDevToolsEnabled();
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * React Hook：監聽開發者工具開關狀態，透過 useSyncExternalStore 在狀態變更時重繪元件。
 */
export function useDevToolsEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
