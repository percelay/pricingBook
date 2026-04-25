'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RateMode } from './types';

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
  const [mode, setModeState] = useState<RateMode>('daily');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'hourly' || saved === 'daily') setModeState(saved);
  }, []);

  function setMode(m: RateMode) {
    setModeState(m);
    window.localStorage.setItem(STORAGE_KEY, m);
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
