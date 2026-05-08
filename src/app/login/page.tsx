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

  const demoDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="login-stage flex min-h-screen w-full flex-col overflow-hidden px-5 py-5 text-foreground sm:px-8 lg:px-12">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-foreground/10 pb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span>working demo</span>
        <span className="hidden sm:inline">internal use only</span>
        <span className="hidden md:inline">updates automatically</span>
        <span>{demoDate}</span>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-6xl flex-1 items-center gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,0.9fr)]">
        <main className="relative z-10 max-w-xl">
          <div className="mb-9 space-y-3">
            <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              <span className="text-[#5fa07a]">pro</span>book
            </h1>
            <p className="text-lg font-medium lowercase text-muted-foreground sm:text-xl">
              pricing made simple
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROFILES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="group relative flex min-h-[168px] flex-col justify-between overflow-hidden border border-foreground/15 bg-white p-5 text-left text-card-foreground transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-foreground text-sm font-semibold text-background">
                    {p.initials}
                  </span>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent" />
                </span>
                <span className="space-y-4">
                  <span>
                    <span className="block truncate text-lg font-semibold text-foreground">{p.name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{p.role}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </main>

        <PricingProcessGraphic />
      </div>

      <footer className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-foreground/10 pt-4" aria-hidden="true">
        <div className="h-px bg-foreground/20" />
        <svg viewBox="0 0 180 28" className="h-7 w-44 text-[#5fa07a]" fill="none">
          <path d="M3 16C22 4 34 4 52 16S82 28 101 16s31-12 50 0 20 10 26 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          <path d="M21 20H55M72 8h22M112 21h31" stroke="#111827" strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="square" />
          <circle cx="62" cy="14" r="3.5" fill="#77bb91" />
          <circle cx="104" cy="14" r="3.5" fill="#111827" fillOpacity="0.72" />
        </svg>
        <div className="h-px bg-foreground/20" />
      </footer>
    </div>
  );
}

function PricingProcessGraphic() {
  return (
    <aside className="pricing-process-graphic hidden lg:block" aria-hidden="true">
      <svg viewBox="0 0 520 420" role="img" className="h-auto w-full" fill="none">
        <path className="process-muted" d="M78 330H442" strokeWidth="1.5" />
        <path className="process-muted" d="M118 88V330" strokeWidth="1.5" />
        <path className="process-muted" d="M198 88V330" strokeWidth="1.5" />
        <path className="process-muted" d="M278 88V330" strokeWidth="1.5" />
        <path className="process-muted" d="M358 88V330" strokeWidth="1.5" />
        <path className="process-muted" d="M438 88V330" strokeWidth="1.5" />
        <path className="process-muted" d="M78 250H442" strokeWidth="1.5" />
        <path className="process-muted" d="M78 170H442" strokeWidth="1.5" />
        <rect className="process-soft" x="96" y="240" width="48" height="90" />
        <rect className="process-soft" x="176" y="198" width="48" height="132" />
        <rect className="process-soft" x="256" y="152" width="48" height="178" />
        <rect className="process-soft" x="336" y="118" width="48" height="212" />
        <path className="process-ink" d="M98 276L178 246L258 204L338 156L418 112" strokeWidth="3" strokeLinecap="square" />
        <circle className="process-green" cx="98" cy="276" r="8" />
        <circle className="process-green" cx="178" cy="246" r="8" />
        <circle className="process-green" cx="258" cy="204" r="8" />
        <circle className="process-green" cx="338" cy="156" r="8" />
        <circle className="process-green" cx="418" cy="112" r="8" />
        <path className="process-ink" d="M132 112H192" strokeWidth="2.5" strokeLinecap="square" />
        <path className="process-ink" d="M162 82V142" strokeWidth="2.5" strokeLinecap="square" />
        <path className="process-ink" d="M326 92L390 156" strokeWidth="2.5" strokeLinecap="square" />
        <path className="process-ink" d="M390 92L326 156" strokeWidth="2.5" strokeLinecap="square" />
        <path className="process-green" d="M408 258H456V306H408z" />
      </svg>
    </aside>
  );
}
