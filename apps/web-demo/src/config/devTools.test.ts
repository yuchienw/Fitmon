import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEV_TOOLS_STORAGE_KEY,
  isDevToolsEnabled,
  setDevToolsEnabled,
  initDevToolsFromUrl,
} from './devTools.ts';

describe('devTools config and switch unit tests', () => {
  const storage = new Map<string, string>();
  let dispatchedEvents: any[] = [];

  const originalWindow = (globalThis as any).window;

  test('setup mock window environment', () => {
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, val: string) => storage.set(key, String(val)),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      location: {
        search: '',
      },
      dispatchEvent: (evt: any) => {
        dispatchedEvents.push(evt);
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  test('returns false by default when storage is empty', () => {
    storage.clear();
    assert.equal(isDevToolsEnabled(), false);
  });

  test('setDevToolsEnabled updates storage and dispatches event', () => {
    storage.clear();
    dispatchedEvents = [];

    setDevToolsEnabled(true);
    assert.equal(storage.get(DEV_TOOLS_STORAGE_KEY), '1');
    assert.equal(isDevToolsEnabled(), true);
    assert.equal(dispatchedEvents.length, 1);

    setDevToolsEnabled(false);
    assert.equal(storage.get(DEV_TOOLS_STORAGE_KEY), '0');
    assert.equal(isDevToolsEnabled(), false);
    assert.equal(dispatchedEvents.length, 2);
  });

  test('initDevToolsFromUrl parses ?devtools=1 and ?devtools=0', () => {
    storage.clear();
    assert.equal(initDevToolsFromUrl('?devtools=1'), true);
    assert.equal(isDevToolsEnabled(), true);
    assert.equal(storage.get(DEV_TOOLS_STORAGE_KEY), '1');

    assert.equal(initDevToolsFromUrl('?devtools=0'), false);
    assert.equal(isDevToolsEnabled(), false);
    assert.equal(storage.get(DEV_TOOLS_STORAGE_KEY), '0');

    assert.equal(initDevToolsFromUrl('?other=1'), null);
    assert.equal(isDevToolsEnabled(), false);
  });

  test('initDevToolsFromUrl handles full URL string', () => {
    storage.clear();
    assert.equal(initDevToolsFromUrl('http://localhost:5173/?devtools=1'), true);
    assert.equal(isDevToolsEnabled(), true);
  });

  test('recognizes both "1" and "true" in localStorage', () => {
    storage.set(DEV_TOOLS_STORAGE_KEY, 'true');
    assert.equal(isDevToolsEnabled(), true);

    storage.set(DEV_TOOLS_STORAGE_KEY, '1');
    assert.equal(isDevToolsEnabled(), true);

    storage.set(DEV_TOOLS_STORAGE_KEY, '0');
    assert.equal(isDevToolsEnabled(), false);

    storage.set(DEV_TOOLS_STORAGE_KEY, 'false');
    assert.equal(isDevToolsEnabled(), false);
  });

  test('UnwellSheet does not promise unfulfilled reminder / nudge suppression', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const unwellContent = fs.readFileSync(
      path.resolve(import.meta.dirname, '../components/sheets/UnwellSheet.tsx'),
      'utf-8'
    );
    assert.ok(
      !unwellContent.includes('今天不會跳提醒，隊友也不會催你。已經存的紀錄不受影響。'),
      'UnwellSheet must remove the unfulfilled promise sentence'
    );
    assert.ok(
      unwellContent.includes('// 「今天不會跳提醒，隊友也不會催你」暫時拿掉，T1-D5/D6a 做到後再放回'),
      'UnwellSheet must contain the temporary removal comment'
    );
    assert.ok(
      unwellContent.includes('已經存的紀錄不受影響。'),
      'UnwellSheet must retain the note about existing records'
    );
  });

  test('cleanup mock window environment', () => {
    if (typeof originalWindow === 'undefined') {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
  });
});
