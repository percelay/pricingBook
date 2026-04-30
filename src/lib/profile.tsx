'use client';

import { createContext, useContext, ReactNode } from 'react';
import { removeLocalStorageItem, setLocalStorageItem, useLocalStorageValue } from './local-storage';

export interface Profile {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export const PROFILES: Profile[] = [
  { id: 'helena', name: 'Helena Reyes', role: 'Partner', initials: 'HR' },
  { id: 'tom', name: "Tom O'Brien", role: 'Senior Manager', initials: 'TO' },
];

const STORAGE_KEY = 'probook:active_profile';
const PENDING_PROFILE = '__profile_pending__';

interface ProfileContextValue {
  profile: Profile | null;
  ready: boolean;
  signIn: (id: string) => void;
  signOut: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  ready: false,
  signIn: () => {},
  signOut: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const storedId = useLocalStorageValue(STORAGE_KEY, PENDING_PROFILE);
  const ready = storedId !== PENDING_PROFILE;
  const profile = ready ? PROFILES.find(p => p.id === storedId) ?? null : null;

  function signIn(id: string) {
    const found = PROFILES.find(p => p.id === id);
    if (!found) return;
    setLocalStorageItem(STORAGE_KEY, found.id);
  }

  function signOut() {
    removeLocalStorageItem(STORAGE_KEY);
  }

  return (
    <ProfileContext.Provider value={{ profile, ready, signIn, signOut }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
