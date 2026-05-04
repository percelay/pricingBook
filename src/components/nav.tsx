'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, CreditCard, Plus, Clock, Coins, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { useProfile } from '@/lib/profile';
import { RateMode, CurrencyMode } from '@/lib/types';

const navItems = [
  { href: '/', label: 'Pricing', icon: LayoutDashboard },
  { href: '/rate-cards', label: 'Rate Cards', icon: CreditCard },
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
    <aside className="relative flex h-full w-[232px] shrink-0 flex-col overflow-hidden bg-[#001033] text-white">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_40%_0%,rgba(95,189,247,0.36),transparent_16rem)]" />
      <div className="relative px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 shadow-[var(--shadow-dark-ghost)]">
            <BookOpen className="h-5 w-5 text-[#d0f100]" />
          </span>
          <div>
            <span className="block text-base font-medium tracking-[-0.016em] lowercase">probook</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#e0f6ff]/70">pricing studio</span>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-[#d0f100] text-[#1b2540] shadow-[var(--shadow-button)]'
                : 'text-[#e0f6ff]/75 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="relative space-y-3 border-t border-white/10 p-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-[#e0f6ff]/65">
            <Clock className="h-3 w-3" />
            Rate Display
          </div>
          <Select value={mode} onValueChange={v => v && setMode(v as RateMode)}>
            <SelectTrigger className="h-9 w-full bg-white/10 text-white shadow-[var(--shadow-dark-ghost)] hover:bg-white/15">
              <SelectValue>{(v: string) => v === 'hourly' ? 'Hourly' : 'Daily'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-[#e0f6ff]/65">
            <Coins className="h-3 w-3" />
            Currency
          </div>
          <Button
            variant="outline"
            className="h-9 w-full justify-between bg-white/10 text-white shadow-[var(--shadow-dark-ghost)] hover:bg-white/15 hover:text-white"
            onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'EUR' : 'USD' as CurrencyMode)}
          >
            <span>{currencyMode === 'EUR' ? 'Euros (€)' : 'Dollars ($)'}</span>
            <span className="text-xs text-[#e0f6ff]/65">
              {currencyMode === 'USD' ? '→ €' : '→ $'}
            </span>
          </Button>
        </div>
        <Link href="/books/new">
          <Button className="w-full text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Pricing Book
          </Button>
        </Link>
      </div>

      {profile && (
        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#001033]">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight text-white">{profile.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-[#e0f6ff]/60">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#e0f6ff]/60 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
