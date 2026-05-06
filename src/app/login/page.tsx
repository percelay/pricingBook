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
    <div className="login-stage min-h-screen w-full overflow-hidden bg-[#ffffff] text-[#292929]">
      {/* Top meta bar — architectural drawing-style header */}
      <header className="border-b border-[#292929] px-6 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-[#292929]">
          <span>PROBOOK / 001 — Pricing</span>
          <span className="hidden sm:block">Architectural Grid · Light</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </header>

      <div className="px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1280px] items-stretch gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <main className="relative z-10 flex flex-col">
            <div className="mb-12 space-y-3 border-b border-[#292929] pb-10">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.3em] text-[#292929]">
                Sign In · 01
              </p>
              <h1 className="text-[64px] font-thin leading-[0.95] tracking-[-0.05em] text-[#292929] sm:text-[80px] lg:text-[112px]">
                ProBook
              </h1>
              <p className="font-mono text-[14px] uppercase tracking-[0.2em] text-[#292929]">
                Pricing — Made Precise
              </p>
            </div>

            <div className="grid grid-cols-1 gap-0 border border-[#292929] sm:grid-cols-2">
              {PROFILES.map((p, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const lastRow = Math.floor((PROFILES.length - 1) / 2);
                const borderRight = col === 0 ? 'sm:border-r sm:border-r-[#292929]' : '';
                const borderBottom = row !== lastRow ? 'border-b border-b-[#292929]' : '';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className={`group relative flex min-h-[180px] flex-col justify-between bg-[#ffffff] p-6 text-left transition-colors hover:bg-[#292929] hover:text-[#ffffff] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#292929] focus-visible:outline-offset-[-1px] ${borderRight} ${borderBottom}`.trim()}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-current font-mono text-[11px] font-medium tracking-[0.1em]">
                        {p.initials}
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
                        / {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[20px] font-light leading-tight tracking-[-0.03em]">
                        {p.name}
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
                        <span>{p.role}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-0 border-t border-[#292929] pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]">
              <div>
                <div className="opacity-60">Mode</div>
                <div className="mt-1">Light</div>
              </div>
              <div>
                <div className="opacity-60">Theme</div>
                <div className="mt-1">Mono X7</div>
              </div>
              <div>
                <div className="opacity-60">Build</div>
                <div className="mt-1">001 / Stable</div>
              </div>
            </div>
          </main>

          <BlueprintGraphic />
        </div>
      </div>
    </div>
  );
}

function BlueprintGraphic() {
  return (
    <aside className="relative min-h-[420px] lg:min-h-[640px]" aria-hidden="true">
      <div className="login-blueprint">
        <span className="login-corner-mark login-corner-tl" />
        <span className="login-corner-mark login-corner-tr" />
        <span className="login-corner-mark login-corner-bl" />
        <span className="login-corner-mark login-corner-br" />

        <span className="login-axis-label" style={{ top: '14px', left: '20px' }}>
          PB.001 / Schematic
        </span>
        <span className="login-axis-label" style={{ bottom: '14px', right: '20px' }}>
          A — A
        </span>
        <span className="login-axis-label" style={{ top: '50%', left: '14px', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'left top' }}>
          Y · Margin %
        </span>
        <span className="login-axis-label" style={{ bottom: '14px', left: '50%', transform: 'translateX(-50%)' }}>
          X · Weeks 0 — 24
        </span>

        <div className="login-blueprint-fig">
          {/* Build a stepped bar pattern: pricing engagement schematic */}
          {Array.from({ length: 80 }, (_, i) => {
            const col = i % 8;
            const row = Math.floor(i / 8);
            // Stepped silhouette of a pricing curve
            const heights = [3, 4, 5, 6, 7, 8, 7, 6];
            const isFill = row >= 10 - heights[col];
            return <span key={i} className={isFill ? 'fill' : ''} />;
          })}
        </div>

        {/* Tracked numeric ticks along right axis */}
        <div className="absolute top-[12%] right-3 flex flex-col gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#292929]/70">
          <span>100%</span>
          <span>075</span>
          <span>050</span>
          <span>025</span>
          <span>000</span>
        </div>
      </div>
    </aside>
  );
}
