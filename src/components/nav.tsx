'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { useProfile } from '@/lib/profile';
import { RateMode, CurrencyMode } from '@/lib/types';

const navItems = [
  { href: '/', label: 'Pricing' },
  { href: '/rate-cards', label: 'Rate Cards' },
  { href: '/books/new', label: 'New Book' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, setMode } = useRateMode();
  const { mode: currencyMode, setMode: setCurrencyMode } = useCurrencyMode();
  const { profile, signOut } = useProfile();

  function handleSignOut() {
    signOut();
    router.replace('/login');
  }

  return (
    <aside className="w-60 shrink-0 bg-[#ffffff] text-[#292929] flex flex-col h-full border-r border-[#292929]">
      {/* Wordmark — uppercase tracked, bordered */}
      <div className="border-b border-[#292929] px-5 py-5">
        <Link href="/" className="block">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-[#292929]/60">
            PROBOOK / 001
          </div>
          <div className="mt-1 font-sans text-[28px] font-thin leading-none tracking-[-0.05em] text-[#292929]">
            ProBook
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
            Pricing — light
          </div>
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="border-b border-[#292929] py-2">
        {navItems.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group/link flex items-center justify-between px-5 py-3 font-mono text-[12px] uppercase tracking-[0.2em] transition-colors border-l-2',
                active
                  ? 'border-l-[#292929] bg-[#292929] text-[#ffffff]'
                  : 'border-l-transparent text-[#292929] hover:bg-[#292929] hover:text-[#ffffff]'
              )}
            >
              <span>{label}</span>
              <span className="font-mono text-[10px] tracking-[0.15em] opacity-50 group-hover/link:opacity-100">
                {String(navItems.findIndex(n => n.href === href) + 1).padStart(2, '0')}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings — Rate display + Currency */}
      <div className="border-b border-[#292929] px-5 py-5 space-y-5">
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/60">
            Rate / Display
          </div>
          <Select value={mode} onValueChange={v => v && setMode(v as RateMode)}>
            <SelectTrigger className="h-9 w-full text-[13px]">
              <SelectValue>
                {(v: string) => (v === 'hourly' ? 'Hourly' : 'Daily')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/60">
            Currency
          </div>
          <button
            type="button"
            onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'EUR' : 'USD' as CurrencyMode)}
            className="flex h-9 w-full items-center justify-between border border-[#292929] bg-[#ffffff] px-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#292929] hover:bg-[#292929] hover:text-[#ffffff] transition-colors"
          >
            <span>{currencyMode === 'EUR' ? 'EUR · €' : 'USD · $'}</span>
            <span className="text-[10px] tracking-[0.2em] opacity-60">
              {currencyMode === 'USD' ? '→ €' : '→ $'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1" />

      {profile && (
        <div className="border-t border-[#292929] px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/60 mb-2">
            Operator
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#292929] bg-[#292929] font-mono text-[11px] font-medium tracking-[0.1em] text-[#ffffff]">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-light leading-tight text-[#292929] tracking-[-0.02em]">
                {profile.name}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center border border-[#292929] text-[#292929] hover:bg-[#292929] hover:text-[#ffffff] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
