'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, History, Trash2, Check, Save } from 'lucide-react';
import { getPricingBook, upsertPricingBook, deletePricingBook, getRateCards } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { PricingBook, LineItem, ROLES, CURRENCY_BY_REGION, RateCard } from '@/lib/types';
import { calcTotals, formatCurrency, lineSubtotal } from '@/lib/calculations';
import { exportBookToExcel } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import EngagementTimeline from '@/components/engagement-timeline';

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<PricingBook | null>(null);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    seedDemoData();
    const b = getPricingBook(id);
    if (!b) { router.push('/'); return; }
    setBook(b);
    setRateCards(getRateCards());
  }, [id, router]);

  if (!book) return null;

  const currency = CURRENCY_BY_REGION[book.region];
  const totals = calcTotals(book.lineItems, book.discount, book.markup);

  function patch<K extends keyof PricingBook>(field: K, value: PricingBook[K]) {
    setBook(b => b ? { ...b, [field]: value } : b);
    setDirty(true);
  }

  function updateLineItem(itemId: string, field: keyof LineItem, value: string) {
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: b.lineItems.map(item =>
          item.id === itemId ? { ...item, [field]: Number(value) || 0 } : item
        ),
      };
    });
    setDirty(true);
  }

  function addRole(role: string) {
    if (!role || !book) return;
    const rate = rateCards.find(c => c.id === book.baseRateCardId)?.roles.find(r => r.role === role)?.dailyRate ?? 0;
    const nextStart = book.lineItems.length > 0
      ? Math.max(...book.lineItems.map(i => i.startWeek))
      : 1;
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: [...b.lineItems, {
          id: crypto.randomUUID(),
          role: role as LineItem['role'],
          startWeek: nextStart,
          weeks: 4,
          daysPerWeek: 5,
          dailyRate: rate,
          expenses: 0,
          travel: 0,
        }],
      };
    });
    setDirty(true);
  }

  function removeLineItem(itemId: string) {
    setBook(b => b ? { ...b, lineItems: b.lineItems.filter(i => i.id !== itemId) } : b);
    setDirty(true);
  }

  function handleSave(overrideStatus?: 'Draft' | 'Final') {
    if (!book) return;
    const status = overrideStatus ?? book.status;
    const updated: PricingBook = {
      ...book,
      status,
      updatedAt: new Date().toISOString(),
      versions: [
        ...book.versions,
        {
          version: book.versions.length + 1,
          savedAt: new Date().toISOString(),
          snapshot: {
            client: book.client, engagement: book.engagement, region: book.region,
            baseRateCardId: book.baseRateCardId, baseRateCardName: book.baseRateCardName,
            status, discount: book.discount, markup: book.markup,
            lineItems: book.lineItems, notes: book.notes,
          },
        },
      ],
    };
    upsertPricingBook(updated);
    setBook(updated);
    setDirty(false);
  }

  function handleDelete() {
    if (!book) return;
    if (!confirm(`Delete pricing book for "${book.client}"?`)) return;
    deletePricingBook(book.id);
    router.push('/');
  }

  function restoreVersion(version: PricingBook['versions'][0]) {
    setBook(b => b ? { ...b, ...version.snapshot, updatedAt: new Date().toISOString() } : b);
    setDirty(true);
  }

  const sym = currency === 'EUR' ? '€' : '$';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{book.client}</h1>
              <Badge variant={book.status === 'Final' ? 'default' : 'secondary'}>{book.status}</Badge>
              <Badge variant="outline" className="font-normal">
                {book.region === 'France' ? '🇫🇷' : '🇺🇸'} {book.region}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">{book.engagement}</p>
            <p className="text-xs text-gray-400 mt-0.5">Rate card: {book.baseRateCardName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dirty && <span className="text-xs text-[#E35336] font-medium">Unsaved</span>}
          <Button variant="outline" size="sm" onClick={() => exportBookToExcel(book)}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="sm" />}>
              <History className="h-4 w-4 mr-1.5" />
              History {book.versions.length > 0 && `(${book.versions.length})`}
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader><SheetTitle>Version History</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-3 overflow-y-auto">
                {book.versions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No versions saved yet.<br />Click Save to capture a snapshot.
                  </p>
                ) : (
                  [...book.versions].reverse().map(v => {
                    const vTotal = calcTotals(v.snapshot.lineItems, v.snapshot.discount, v.snapshot.markup).grandTotal;
                    return (
                      <div key={v.version} className="border rounded-lg p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">v{v.version}</span>
                          <Badge variant={v.snapshot.status === 'Final' ? 'default' : 'secondary'} className="text-xs">
                            {v.snapshot.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(v.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-base font-bold text-gray-800 tabular-nums">
                          {formatCurrency(vTotal, currency)}
                        </p>
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => restoreVersion(v)}>
                          Restore this version
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={() => handleSave()}>
            <Save className="h-4 w-4 mr-1.5" />Save
          </Button>
          {book.status === 'Draft' && (
            <Button size="sm" onClick={() => handleSave('Final')}>
              <Check className="h-4 w-4 mr-1.5" />Mark Final
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Team & Fees</CardTitle>
                <Select onValueChange={v => v && addRole(v)} value={null}>
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue placeholder="+ Add role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {book.lineItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  No team members added
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_50px_58px_56px_88px_88px_88px_76px_28px] gap-2 px-1 mb-1">
                    {['Role', 'Start', 'Weeks', 'd/wk', 'Rate/day', 'Expenses', 'Travel', 'Total', ''].map(h => (
                      <span key={h} className="text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                  {book.lineItems.map(item => (
                    <div key={item.id} className="grid grid-cols-[1fr_50px_58px_56px_88px_88px_88px_76px_28px] gap-2 items-center">
                      <span className="text-sm font-medium text-gray-800 truncate">{item.role}</span>
                      {/* Start week */}
                      <Input
                        type="number" min={1}
                        value={item.startWeek || ''}
                        onChange={e => updateLineItem(item.id, 'startWeek', e.target.value)}
                        className="h-8 text-sm px-2 tabular-nums"
                      />
                      {/* Weeks */}
                      <Input
                        type="number" min={0}
                        value={item.weeks || ''}
                        onChange={e => updateLineItem(item.id, 'weeks', e.target.value)}
                        className="h-8 text-sm px-2 tabular-nums"
                      />
                      {/* Days/week */}
                      <Input
                        type="number" min={1} max={5}
                        value={item.daysPerWeek || ''}
                        onChange={e => updateLineItem(item.id, 'daysPerWeek', e.target.value)}
                        className="h-8 text-sm px-2 tabular-nums"
                      />
                      {/* Rate, Expenses, Travel */}
                      {(['dailyRate', 'expenses', 'travel'] as const).map(field => (
                        <div key={field} className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{sym}</span>
                          <Input
                            type="number" min={0} step={100}
                            value={item[field] || ''}
                            onChange={e => updateLineItem(item.id, field, e.target.value)}
                            className="h-8 text-sm pl-5 pr-1 tabular-nums"
                            placeholder="0"
                          />
                        </div>
                      ))}
                      <span className="text-sm font-semibold text-right text-gray-900 tabular-nums pr-1">
                        {formatCurrency(lineSubtotal(item), currency)}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => removeLineItem(item.id)} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={book.notes} onChange={e => patch('notes', e.target.value)} rows={4} placeholder="Assumptions, exclusions, context..." />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Pricing Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={book.discount || ''} onChange={e => patch('discount', Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Markup %</Label>
                  <Input type="number" min={0} value={book.markup || ''} onChange={e => patch('markup', Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
                </div>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                {book.discount > 0 && (
                  <div className="flex justify-between text-[#E35336]">
                    <span>Discount ({book.discount}%)</span>
                    <span className="tabular-nums">-{formatCurrency(totals.discountAmount, currency)}</span>
                  </div>
                )}
                {book.markup > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Markup ({book.markup}%)</span>
                    <span className="tabular-nums">+{formatCurrency(totals.markupAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-1.5 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.grandTotal, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {book.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Breakdown by Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {book.lineItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.role}</span>
                    <span className="font-semibold text-gray-900 tabular-nums shrink-0">
                      {formatCurrency(lineSubtotal(item), currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4 text-xs text-gray-400 space-y-1">
              <div>Created {new Date(book.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div>Updated {new Date(book.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div>{book.versions.length} version{book.versions.length !== 1 ? 's' : ''} saved</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-width timeline */}
      {book.lineItems.length > 0 && (
        <div className="mt-6">
          <EngagementTimeline lineItems={book.lineItems} />
        </div>
      )}
    </div>
  );
}
