'use client';

import { useSyncExternalStore } from 'react';

const LOCAL_STORAGE_EVENT = 'probook:local-storage';

type LocalStorageEvent = CustomEvent<{ key: string }>;

function emitStorageChange(key: string) {
  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } }));
}

function subscribeToKey(key: string, onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === key) onStoreChange();
  }

  function handleLocalStorage(event: Event) {
    if ((event as LocalStorageEvent).detail?.key === key) onStoreChange();
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage);
  };
}

export function useLocalStorageValue(key: string, serverSnapshot: string | null = null) {
  return useSyncExternalStore(
    onStoreChange => subscribeToKey(key, onStoreChange),
    () => window.localStorage.getItem(key),
    () => serverSnapshot
  );
}

export function setLocalStorageItem(key: string, value: string) {
  window.localStorage.setItem(key, value);
  emitStorageChange(key);
}

export function removeLocalStorageItem(key: string) {
  window.localStorage.removeItem(key);
  emitStorageChange(key);
}
