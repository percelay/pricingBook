'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { getPricingBooks, getRateCards } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { calcTotals, formatMoney } from '@/lib/calculations';
import { PricingBook, RateCard, REGION_FLAG } from '@/lib/types';
import { useCurrencyMode } from '@/lib/currency-mode';
import { HYBRID_RATE_CARD_ID } from '@/lib/rate-card-selection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const [{ books, rateCards }] = useState<{ books: PricingBook[]; rateCards: RateCard[] }>(() => {
    seedDemoData();
    return {
      books: getPricingBooks(),
      rateCards: getRateCards(),
    };
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = b.client.toLowerCase().includes(q) || b.engagement.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="w-full">
      {/* Section header — bordered architectural masthead */}
      <header className="border-b border-[#292929] px-6 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-[#292929]/70">
                Index · 01
              </p>
              <h1 className="mt-1 text-[40px] font-thin leading-none tracking-[-0.03em] text-[#292929] sm:text-[56px]">
                Pricing Books
              </h1>
            </div>
            <div className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/70 sm:block">
              {filtered.length} / {books.length} Records
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#292929]" />
              <Input
                placeholder="Search by client or engagement"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
              <SelectTrigger className="h-9 w-40 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/books/new" className="ml-auto">
              <Button variant="default">
                + New Book
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-10 sm:px-10">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 border border-[#292929] md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((book, idx) => (
              <BookCard
                key={book.id}
                book={book}
                rateCards={rateCards}
                index={idx}
                total={filtered.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-[#292929] py-20 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-[#292929]">
        No records
      </p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/60">
        Adjust filters or create a new book
      </p>
      <div className="mt-6">
        <Link href="/books/new">
          <Button variant="default">+ New Book</Button>
        </Link>
      </div>
    </div>
  );
}

function rateCardLabel(book: PricingBook, rateCards: RateCard[]): string {
  const isHybrid = book.baseRateCardId === HYBRID_RATE_CARD_ID || book.region === 'Hybrid' || (book.selectedRateCardIds?.length ?? 0) > 1;

  if (isHybrid) {
    const selectedIds = book.selectedRateCardIds?.length
      ? book.selectedRateCardIds
      : Array.from(new Set(book.lineItems.map(item => item.rateCardId).filter((id): id is string => Boolean(id))));
    const selected = selectedIds
      .map(id => rateCards.find(card => card.id === id))
      .filter((card): card is RateCard => Boolean(card));

    if (selected.length === 0) return book.baseRateCardName || 'Hybrid';
    return `Hybrid: ${selected.map(card => `${REGION_FLAG[card.region]} ${card.name}`).join(' + ')}`;
  }

  const card = rateCards.find(candidate => candidate.id === book.baseRateCardId);
  return card ? `${REGION_FLAG[card.region]} ${card.name}` : book.baseRateCardName || 'Not set';
}

function BookCard({
  book,
  rateCards,
  index,
  total,
}: {
  book: PricingBook;
  rateCards: RateCard[];
  index: number;
  total: number;
}) {
  const { mode: currencyMode } = useCurrencyMode();
  const { grandTotal } = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const cardLabel = rateCardLabel(book, rateCards);
  const updated = new Date(book.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  // Architectural cell logic — outer borders are container; we add right/bottom strokes for grid
  // Tailwind doesn't easily allow conditional classes for nth-child, so this approximates the inner grid
  const isLast = index === total - 1;

  return (
    <Link
      href={`/books/${book.id}`}
      className={`group relative flex flex-col justify-between bg-[#ffffff] p-6 transition-colors hover:bg-[#292929] hover:text-[#ffffff] ${
        isLast ? '' : 'border-r border-r-[#292929] border-b border-b-[#292929] md:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r-[#292929] xl:[&:nth-child(3n)]:border-r-0'
      }`}
    >
      <div>
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.25em] opacity-70">
          <span>/ {String(index + 1).padStart(2, '0')}</span>
          <span>{book.status}</span>
        </div>
        <p className="mt-4 truncate text-[22px] font-light leading-tight tracking-[-0.03em]">
          {book.client}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">
          {book.engagement}
        </p>
      </div>

      <div className="mt-8 space-y-2">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          <span>Roles</span>
          <span>{book.lineItems.length}</span>
        </div>
        <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          <span>Card</span>
          <span className="truncate text-right">{cardLabel}</span>
        </div>
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          <span>Versions</span>
          <span>v{book.versions.length}</span>
        </div>

        <hr className="border-t border-current opacity-60" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
              Total
            </div>
            <div className="mt-0.5 text-[24px] font-thin tracking-[-0.03em] tabular-nums">
              {formatMoney(grandTotal, currencyMode)}
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
            <span>{updated}</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
