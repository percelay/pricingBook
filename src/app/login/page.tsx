'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock } from 'lucide-react';
import { PROFILES, useProfile } from '@/lib/profile';

export default function LoginPage() {
  const router = useRouter();
  const { profile, ready, signIn } = useProfile();

  useEffect(() => {
    if (ready && profile) router.replace('/');
  }, [ready, profile, router]);

  function handleSelect(id: string) {
    signIn(id);
    router.replace('/');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-secondary px-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <BookOpen className="h-6 w-6 text-accent" />
          <span className="text-2xl font-bold tracking-tight lowercase">probook</span>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-10">
          Choose a profile to continue
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROFILES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              className="group flex flex-col gap-4 bg-card p-6 text-left text-card-foreground ring-1 ring-foreground/10 transition-colors hover:ring-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                  {p.initials}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{p.role}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Demo - full access. RBAC coming soon.</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
