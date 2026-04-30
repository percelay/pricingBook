'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Lock, ShieldCheck } from 'lucide-react';
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
    <div className="login-stage min-h-screen w-full overflow-hidden bg-white px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <main className="relative z-10 max-w-xl">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-foreground bg-foreground text-background shadow-[6px_6px_0_0_#77BB91]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold lowercase">probook</p>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                pricing command
              </p>
            </div>
          </div>

          <div className="mb-10 space-y-5">
            <div className="inline-flex items-center gap-2 border border-accent/60 bg-[#f3fbf6] px-3 py-2 text-xs font-semibold uppercase text-[#225c37] shadow-[4px_4px_0_0_rgba(119,187,145,0.28)]">
              <ShieldCheck className="h-4 w-4" />
              demo access
            </div>
            <h1 className="text-5xl font-semibold text-balance sm:text-6xl lg:text-7xl">
              Choose your profile.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Same workspace, same permissions, two executive views ready for the room.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROFILES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden border border-foreground/15 bg-white p-5 text-left text-card-foreground shadow-[8px_8px_0_0_rgba(17,24,39,0.08)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[12px_12px_0_0_rgba(119,187,145,0.24)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-foreground text-sm font-semibold text-background">
                    {p.initials}
                  </span>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" />
                </span>
                <span className="space-y-4">
                  <span>
                    <span className="block truncate text-lg font-semibold text-foreground">{p.name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{p.role}</span>
                  </span>
                  <span className="flex items-center gap-2 border-t border-foreground/10 pt-4 text-xs font-medium text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-accent" />
                    Full access now. RBAC-ready.
                  </span>
                </span>
              </button>
            ))}
          </div>
        </main>

        <KineticPricingGraphic />
      </div>
    </div>
  );
}

function KineticPricingGraphic() {
  return (
    <aside className="login-kinetic-graphic relative min-h-[300px] sm:min-h-[380px] lg:min-h-[560px]" aria-hidden="true">
      <div className="login-sheet login-sheet-back" />
      <div className="login-sheet login-sheet-front">
        <div className="login-sheet-title">
          <span />
          <span />
          <span />
        </div>
        <div className="login-ledger-grid">
          {Array.from({ length: 30 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="login-total-panel">
          <span>GROSS MARGIN</span>
          <strong>62.7%</strong>
        </div>
      </div>
      <div className="login-ribbon login-ribbon-a" />
      <div className="login-ribbon login-ribbon-b" />
      <div className="login-ribbon login-ribbon-c" />
      <div className="login-glint" />
      <div className="login-axis login-axis-x" />
      <div className="login-axis login-axis-y" />
    </aside>
  );
}
