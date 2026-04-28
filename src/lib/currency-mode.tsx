'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CurrencyMode } from './types';

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
  const [mode, setModeState] = useState<CurrencyMode>('USD');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'USD' || saved === 'EUR') setModeState(saved);
  }, []);

  function setMode(m: CurrencyMode) {
    setModeState(m);
    window.localStorage.setItem(STORAGE_KEY, m);
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
