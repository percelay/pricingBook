'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText } from 'lucide-react';
import { getPricingBooks } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { calcTotals, formatMoney } from '@/lib/calculations';
import { PricingBook, BOOK_REGION_FLAG } from '@/lib/types';
import { useCurrencyMode } from '@/lib/currency-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const [books] = useState<PricingBook[]>(() => {
    seedDemoData();
    return getPricingBooks();
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = b.client.toLowerCase().includes(q) || b.engagement.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchRegion = regionFilter === 'all' || b.region === regionFilter;
    return matchSearch && matchStatus && matchRegion;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Books</h1>
        <Link href="/books/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Pricing Book
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search client or engagement..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Final">Final</SelectItem>
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={v => setRegionFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="France">France</SelectItem>
            <SelectItem value="England">England</SelectItem>
            <SelectItem value="Hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No pricing books found</p>
          <p className="text-sm mt-1">Try adjusting filters or create a new book</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}

function BookCard({ book }: { book: PricingBook }) {
  const { mode: currencyMode } = useCurrencyMode();
  const { grandTotal } = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const updated = new Date(book.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-base">{book.client}</p>
              <p className="text-sm text-gray-500 truncate mt-0.5">{book.engagement}</p>
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
            <Badge variant="outline" className="text-xs font-normal">
              {BOOK_REGION_FLAG[book.region]} {book.region}
            </Badge>
            <span className="text-gray-400 text-xs">{book.lineItems.length} roles</span>
            {book.versions.length > 0 && (
              <span className="text-gray-400 text-xs">v{book.versions.length}</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">
              {formatMoney(grandTotal, currencyMode)}
            </span>
            <span className="text-xs text-gray-400">{updated}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
