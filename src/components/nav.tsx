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
    <aside className="w-56 shrink-0 bg-white text-gray-800 flex flex-col h-full border-r border-[#77BB91]">
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-[#77BB91]" />
          <span className="font-semibold text-base tracking-tight lowercase">probook</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded',
              pathname === href
                ? 'bg-[#77BB91] text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5 px-1 uppercase tracking-wider">
            <Clock className="h-3 w-3" />
            Rate Display
          </div>
          <Select value={mode} onValueChange={v => v && setMode(v as RateMode)}>
            <SelectTrigger className="w-full h-9 bg-white border-gray-200 text-gray-800 text-sm hover:bg-gray-50">
              <SelectValue>{(v: string) => v === 'hourly' ? 'Hourly' : 'Daily'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5 px-1 uppercase tracking-wider">
            <Coins className="h-3 w-3" />
            Currency
          </div>
          <Button
            variant="outline"
            className="w-full h-9 justify-between bg-white border-gray-200 text-gray-800 text-sm hover:bg-gray-50"
            onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'EUR' : 'USD' as CurrencyMode)}
          >
            <span>{currencyMode === 'EUR' ? 'Euros (€)' : 'Dollars ($)'}</span>
            <span className="text-xs text-gray-400">
              {currencyMode === 'USD' ? '→ €' : '→ $'}
            </span>
          </Button>
        </div>
        <Link href="/books/new">
          <Button className="w-full bg-[#77BB91] hover:bg-[#5fa07a] text-white text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Pricing Book
          </Button>
        </Link>
      </div>

      {profile && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="h-8 w-8 shrink-0 bg-foreground text-background flex items-center justify-center text-[11px] font-semibold">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{profile.name}</p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
