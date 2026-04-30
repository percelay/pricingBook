'use client';

import { createContext, useContext, ReactNode } from 'react';
import { CurrencyMode } from './types';
import { setLocalStorageItem, useLocalStorageValue } from './local-storage';

const STORAGE_KEY = 'pb:currency_mode';

interface CurrencyModeContextValue {
  mode: CurrencyMode;
  setMode: (mode: CurrencyMode) => void;
}

const CurrencyModeContext = createContext<CurrencyModeContextValue>({
  mode: 'USD',
  setMode: () => {},
});

export function CurrencyModeProvider({ children }: { children: ReactNode }) {
  const saved = useLocalStorageValue(STORAGE_KEY);
  const mode: CurrencyMode = saved === 'USD' || saved === 'EUR' ? saved : 'USD';

  function setMode(m: CurrencyMode) {
    setLocalStorageItem(STORAGE_KEY, m);
  }

  return (
    <CurrencyModeContext.Provider value={{ mode, setMode }}>
      {children}
    </CurrencyModeContext.Provider>
  );
}

export function useCurrencyMode() {
  return useContext(CurrencyModeContext);
}
