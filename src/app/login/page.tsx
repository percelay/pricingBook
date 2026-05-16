'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, Crosshair, LockKeyhole, Menu, Settings, Terminal } from 'lucide-react';
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
    <div className="login-stage terminal-login flex min-h-screen w-full flex-col overflow-hidden p-2 text-[#d8e8ff] sm:p-3">
      <header className="terminal-topbar flex h-8 shrink-0 items-center justify-between border border-[#4d6d89] bg-[#06121c] text-[11px] font-semibold uppercase leading-none">
        <div className="flex h-full min-w-0 items-center">
          <button type="button" className="terminal-symbol flex h-full w-[122px] items-center justify-between border-r border-[#36546f] px-2 text-left text-white">
            <span>PROB</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#f6b600]" />
          </button>
          <div className="flex h-full min-w-0 items-center gap-2 px-2 text-[#f6b600]">
            <span className="hidden text-[#16ff3d] sm:inline">PRICINGBOOK</span>
            <span className="truncate text-[#f6b600]">PROBOOK TERMINAL</span>
          </div>
        </div>
        <div className="flex h-full shrink-0 items-center gap-1 border-l border-[#36546f] px-1 text-[#b7c7d7]">
          <button type="button" className="terminal-tool" aria-label="Terminal menu"><Menu className="h-3.5 w-3.5" /></button>
          <button type="button" className="terminal-tool" aria-label="Session settings"><Settings className="h-3.5 w-3.5" /></button>
          <span className="hidden border-l border-[#36546f] pl-2 text-[#7fb4ff] sm:inline">{demoDate}</span>
        </div>
      </header>

      <div className="terminal-workspace grid min-h-0 flex-1 gap-2 pt-2 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="terminal-chart min-h-[470px] overflow-hidden border border-[#9c7b00] bg-[#07005f]">
          <div className="terminal-panel-label grid grid-cols-[auto_1fr_auto] items-center border-b border-[#9c7b00] bg-[#05001e] px-2 py-1 font-mono text-[11px] leading-none">
            <span className="text-[#00ff41]">PBK 5y D</span>
            <span className="truncate px-2 text-[#8ca8cf]">O: 247.3 H: 312.8 L: 241.9 C: 309.6 R: 8/8</span>
            <span className="text-[#f6b600]">AUTH GATE</span>
          </div>
          <div className="terminal-chart-grid relative h-[62%] min-h-[292px]">
            <div className="terminal-y-axis">
              {['340', '320', '300', '280', '260', '240'].map(value => <span key={value}>{value}</span>)}
            </div>
            <svg viewBox="0 0 980 360" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M18 240 L42 224 L64 250 L92 218 L110 262 L132 238 L154 260 L172 210 L198 232 L220 198 L248 214 L272 172 L302 192 L326 156 L352 180 L378 142 L404 162 L430 118 L456 148 L486 130 L512 106 L538 124 L566 92 L592 108 L620 82 L648 96 L678 78 L704 88 L730 70 L758 82 L784 58 L812 74 L838 54 L866 68 L894 44 L922 56 L956 38" stroke="#00f0ff" strokeWidth="2.5" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M20 260 L54 250 L84 270 L118 242 L148 254 L182 218 L216 232 L250 198 L284 210 L318 176 L352 190 L386 158 L420 172 L454 140 L488 150 L522 122 L556 132 L590 104 L624 112 L658 92 L692 98 L726 80 L760 88 L794 68 L828 76 L862 60 L896 66 L934 52" stroke="#f6d900" strokeWidth="2.5" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M70 274 L136 236 L206 224 L276 178 L346 166 L416 132 L486 128 L556 104 L626 96 L696 78 L766 74 L836 58 L918 48" stroke="#f6b600" strokeWidth="4" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M736 116 H944" stroke="#f6b600" strokeWidth="4" fill="none" vectorEffect="non-scaling-stroke" />
              {Array.from({ length: 42 }).map((_, index) => {
                const x = 26 + index * 22;
                const open = 190 - ((index * 17) % 112);
                const close = open + (index % 3 === 0 ? 28 : -24);
                const high = Math.min(open, close) - 20;
                const low = Math.max(open, close) + 28;
                const color = close < open ? '#00ff41' : '#ff1b14';
                return (
                  <g key={x}>
                    <path d={`M${x} ${high}V${low}`} stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                    <path d={`M${x - 5} ${open}H${x}`} stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                    <path d={`M${x} ${close}H${x + 5}`} stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>
            <div className="terminal-price-tag">309.6</div>
            <div className="terminal-high-tag">Hi: 312.8</div>
          </div>
          <div className="terminal-panel-label grid grid-cols-[auto_auto_auto_1fr] gap-2 border-y border-[#9c7b00] bg-[#05001e] px-2 py-1 font-mono text-[11px] leading-none">
            <span className="text-[#00f0ff]">MESA(Login)</span>
            <span className="text-[#00f0ff]">0.698512</span>
            <span className="text-[#f6d900]">0.999927</span>
            <span className="text-[#ff1b14]">0</span>
          </div>
          <div className="terminal-chart-grid relative h-[28%] min-h-[158px]">
            <svg viewBox="0 0 980 190" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 88 C44 148 74 150 112 62 C150 -16 170 34 196 118 C226 210 272 144 300 60 C332 -36 368 56 394 118 C428 208 468 136 496 54 C528 -34 568 58 594 120 C626 206 670 138 698 54 C730 -26 768 58 798 116 C832 184 872 128 902 54 C930 0 956 44 980 92" stroke="#00f0ff" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M0 116 C42 184 78 160 108 60 C134 -24 174 -4 202 94 C230 196 266 170 296 70 C326 -24 366 16 394 118 C422 196 466 162 494 62 C526 -34 562 10 592 112 C620 188 664 164 694 62 C724 -24 762 8 792 106 C824 188 864 162 894 62 C922 -6 952 20 980 106" stroke="#f6d900" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M0 94H980" stroke="#ff1b14" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <path d="M92 42h36M92 42l14 -9M92 42l14 9M676 42h36M676 42l14 -9M676 42l14 9" stroke="#00ff41" strokeWidth="5" fill="none" vectorEffect="non-scaling-stroke" />
              <path d="M24 164h34M24 164l14 -9M24 164l14 9M480 164h34M514 164l-14 -9M514 164l-14 9" stroke="#ff1b14" strokeWidth="5" fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </main>

        <aside className="terminal-auth-panel flex min-h-[470px] flex-col border border-[#4d6d89] bg-[#03070b]">
          <div className="border-b border-[#4d6d89] bg-[#101820] px-3 py-2 font-mono text-[11px] font-semibold uppercase text-[#f6b600]">
            <span className="text-[#00ff41]">LOGIN</span> / User entitlement
          </div>
          <div className="flex-1 space-y-4 p-3">
            <section className="terminal-module border border-[#2f506b] bg-[#050b12] p-3">
              <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px] uppercase">
                <span className="flex items-center gap-2 text-[#00f0ff]"><Terminal className="h-3.5 w-3.5" /> ProBook</span>
                <span className="text-[#00ff41]">Online</span>
              </div>
              <h1 className="font-mono text-3xl font-bold uppercase tracking-normal text-[#f6b600] sm:text-4xl">ProBook</h1>
              <p className="mt-2 font-mono text-xs uppercase leading-5 text-[#9db3ca]">
                Pricing command center / deal desk access / workbook control
              </p>
            </section>

            <section className="terminal-module border border-[#2f506b] bg-[#050b12] p-2">
              <div className="mb-2 flex items-center justify-between px-1 font-mono text-[11px] uppercase text-[#9db3ca]">
                <span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-[#f6b600]" /> Select operator</span>
                <span>2 records</span>
              </div>
              <div className="space-y-2">
                {PROFILES.map((p, index) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className="terminal-profile group grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 border border-[#25455e] bg-[#060d17] p-2 text-left font-mono transition-colors hover:border-[#f6b600] hover:bg-[#111a08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center border border-[#00ff41] bg-[#001b0a] text-sm font-bold text-[#00ff41]">
                      {p.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold uppercase text-[#d8e8ff]">{index + 1}. {p.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] uppercase text-[#9db3ca]">{p.role} / active rate authority</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#f6b600] transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </section>

            <section className="terminal-module grid grid-cols-3 border border-[#2f506b] bg-[#050b12] font-mono text-[11px] uppercase">
              {[
                ['Books', '024', '#00ff41'],
                ['Cards', '006', '#00f0ff'],
                ['Spread', '1.8%', '#f6b600'],
              ].map(([label, value, color]) => (
                <div key={label} className="border-r border-[#2f506b] p-2 last:border-r-0">
                  <span className="block text-[#7f94ad]">{label}</span>
                  <span style={{ color }} className="mt-1 block text-base font-bold">{value}</span>
                </div>
              ))}
            </section>
          </div>
          <div className="border-t border-[#4d6d89] bg-[#010305] px-3 py-2 font-mono text-[10px] uppercase text-[#7f94ad]">
            <span className="text-[#00ff41]">System:</span> secure demo shell ready <Crosshair className="ml-1 inline h-3 w-3 text-[#f6b600]" />
          </div>
        </aside>
      </div>

      <footer className="terminal-status mt-2 flex h-7 shrink-0 items-center justify-between overflow-hidden border border-[#4d6d89] bg-[#010305] px-2 font-mono text-[10px] uppercase text-[#9db3ca]" aria-hidden="true">
        <span><span className="text-[#00ff41]">F1</span> Help</span>
        <span><span className="text-[#00f0ff]">F7</span> Books</span>
        <span><span className="text-[#f6b600]">F12</span> Execute</span>
        <span className="hidden sm:inline">Latency 004ms</span>
      </footer>
    </div>
  );
}
