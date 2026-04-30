'use client';

import { createContext, useContext, ReactNode } from 'react';
import { RateMode } from './types';
import { setLocalStorageItem, useLocalStorageValue } from './local-storage';

const STORAGE_KEY = 'pb:rate_mode';

interface RateModeContextValue {
  mode: RateMode;
  setMode: (mode: RateMode) => void;
}

const RateModeContext = createContext<RateModeContextValue>({
  mode: 'daily',
  setMode: () => {},
});

export function RateModeProvider({ children }: { children: ReactNode }) {
  const saved = useLocalStorageValue(STORAGE_KEY);
  const mode: RateMode = saved === 'hourly' || saved === 'daily' ? saved : 'daily';

  function setMode(m: RateMode) {
    setLocalStorageItem(STORAGE_KEY, m);
  }

  return (
    <RateModeContext.Provider value={{ mode, setMode }}>
      {children}
    </RateModeContext.Provider>
  );
}

export function useRateMode() {
  return useContext(RateModeContext);
}
