'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, CreditCard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rate-cards', label: 'Rate Cards', icon: CreditCard },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col h-full">
      <div className="px-5 py-6 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-base tracking-tight">Pricing Book</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <Link href="/books/new">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Pricing Book
          </Button>
        </Link>
      </div>
    </aside>
  );
}
