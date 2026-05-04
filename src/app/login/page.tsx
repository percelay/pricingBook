'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
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
    <div className="login-stage min-h-screen w-full overflow-hidden px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <main className="relative z-10 max-w-xl">
          <div className="mb-10 space-y-3">
            <h1 className="display-type text-5xl font-normal text-balance sm:text-6xl lg:text-7xl">
              ProBook
            </h1>
            <p className="text-xl font-medium lowercase text-[#e0f6ff] sm:text-2xl">
              pricing made precise
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROFILES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[20px] bg-white p-5 text-left text-card-foreground shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[#d0f100] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#001033] text-sm font-semibold text-white">
                    {p.initials}
                  </span>
                  <ArrowRight className="mt-1 h-5 w-5 text-[#6b7184] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#0050f8]" />
                </span>
                <span className="space-y-4">
                  <span>
                    <span className="block truncate text-lg font-medium text-[#1b2540]">{p.name}</span>
                    <span className="mt-1 block truncate text-sm text-[#6b7184]">{p.role}</span>
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
