'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Nav from '@/components/nav';
import { useProfile } from '@/lib/profile';

export default function AuthShell({ children }: { children: ReactNode }) {
  const { profile, ready } = useProfile();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (!ready) return;
    if (!profile && !isLogin) router.replace('/login');
  }, [ready, profile, isLogin, router]);

  if (!ready) return null;

  if (isLogin) {
    return <main className="flex-1 overflow-auto bg-background w-full min-w-0">{children}</main>;
  }

  if (!profile) return null;

  return (
    <>
      <Nav />
      <main className="app-shell-surface flex-1 overflow-auto min-w-0">{children}</main>
    </>
  );
}
