'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, CreditCard, ArrowUpRight } from 'lucide-react';
import { getPricingBooks, getRateCards } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { calcTotals, formatMoney } from '@/lib/calculations';
import { PricingBook, RateCard, REGION_FLAG } from '@/lib/types';
import { useCurrencyMode } from '@/lib/currency-mode';
import { HYBRID_RATE_CARD_ID } from '@/lib/rate-card-selection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PricingHeroGraphic from '@/components/pricing-hero-graphic';

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
    <div className="product-page-wide">
      <div className="product-hero pricing-hero compact-hero mb-6 px-6 py-4 sm:px-8">
        <div className="grid min-h-[92px] items-center gap-4 md:grid-cols-[minmax(220px,0.72fr)_minmax(360px,1.28fr)]">
          <h1 className="display-type text-[34px] leading-[1.02] tracking-[-0.01em] sm:text-[40px]">
            Working Books
          </h1>
          <PricingHeroGraphic />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7184]" />
            <Input
              placeholder="Search client or engagement..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/books/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Pricing Book
          </Button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card py-20 text-center text-[#6b7184]">
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium text-[#1b2540]">No pricing books found</p>
          <p className="text-sm mt-1">Try adjusting filters or create a new book</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(book => <BookCard key={book.id} book={book} rateCards={rateCards} />)}
        </div>
      )}
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

function BookCard({ book, rateCards }: { book: PricingBook; rateCards: RateCard[] }) {
  const { mode: currencyMode } = useCurrencyMode();
  const { grandTotal } = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const cardLabel = rateCardLabel(book, rateCards);
  const updated = new Date(book.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group h-full cursor-pointer transition-transform hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-[#1b2540]">{book.client}</p>
              <p className="mt-0.5 truncate text-sm text-[#6b7184]">{book.engagement}</p>
            </div>
            <Badge
              variant={book.status === 'Final' ? 'default' : 'secondary'}
              className="shrink-0 text-xs"
            >
              {book.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-[#6b7184]">{book.lineItems.length} roles</span>
            {book.versions.length > 0 && (
              <span className="text-xs text-[#6b7184]">v{book.versions.length}</span>
            )}
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-[#6b7184]">
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#0050f8]" />
            <span className="min-w-0 truncate">Rate card: {cardLabel}</span>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f8f9fc] p-3">
            <span className="text-xl font-medium tabular-nums text-[#1b2540]">
              {formatMoney(grandTotal, currencyMode)}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#6b7184]">
              {updated}
              <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
