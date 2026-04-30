'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History, Trash2, Check, Save, TrendingUp, Target, Plus } from 'lucide-react';
import { getPricingBook, upsertPricingBook, deletePricingBook, getRateCards } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { PricingBook, LineItem, ROLES, RateCard, TARGET_MARGIN_PCT, REGION_FLAG } from '@/lib/types';
import {
  calcTotals, formatMoney, lineSubtotal, lineCost, totalDays,
  toDisplayValue, fromInputValue, rateUnit, isUniform, averageDaysPerWeek,
  uniformDays, resizeDays, currencySymbol,
} from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { exportBookToExcel, ExportOptions } from '@/lib/export';
import { shouldShowWeeklyAllocation } from '@/lib/weekly-allocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import EditableTimeline from '@/components/engagement-timeline';
import PhasedPricing from '@/components/phased-pricing';
import ExportDialog from '@/components/export-dialog';

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { mode } = useRateMode();
  const { mode: currencyMode } = useCurrencyMode();
  const [initialState] = useState(() => {
    seedDemoData();
    return {
      book: getPricingBook(id) ?? null,
      rateCards: getRateCards(),
    };
  });
  const [book, setBook] = useState<PricingBook | null>(() => initialState.book);
  const [rateCards] = useState<RateCard[]>(() => initialState.rateCards);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!book) router.push('/');
  }, [book, router]);

  if (!book) return null;

  const totals = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const unit = rateUnit(mode);
  const aboveTarget = totals.grossMarginPct >= TARGET_MARGIN_PCT;

  function patch<K extends keyof PricingBook>(field: K, value: PricingBook[K]) {
    setBook(b => b ? { ...b, [field]: value } : b);
    setDirty(true);
  }

  function updateLineItemField<K extends keyof LineItem>(itemId: string, field: K, value: LineItem[K]) {
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: b.lineItems.map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      };
    });
    setDirty(true);
  }

  function updateRate(itemId: string, field: 'dailyRate' | 'dailyCost', value: string) {
    const num = Number(value) || 0;
    updateLineItemField(itemId, field, fromInputValue(num, mode, currencyMode));
  }

  function updateWeeks(itemId: string, value: string) {
    const newLen = Math.max(0, Math.floor(Number(value) || 0));
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: b.lineItems.map(item => {
          if (item.id !== itemId) return item;
          const fillVal = isUniform(item.days) && item.days.length > 0 ? item.days[0] : 5;
          return { ...item, days: resizeDays(item.days, newLen, fillVal) };
        }),
      };
    });
    setDirty(true);
  }

  function updateDpw(itemId: string, value: string) {
    const dpw = Math.max(0, Number(value) || 0);
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: b.lineItems.map(item => {
          if (item.id !== itemId) return item;
          const len = item.days.length === 0 ? 4 : item.days.length;
          return { ...item, days: uniformDays(len, dpw) };
        }),
      };
    });
    setDirty(true);
  }

  function addRole(role: string) {
    if (!role || !book) return;
    const card = rateCards.find(c => c.id === book.baseRateCardId);
    const roleRate = card?.roles.find(r => r.role === role);
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: [...b.lineItems, {
          id: crypto.randomUUID(),
          role: role as LineItem['role'],
          name: '',
          days: uniformDays(4, 5),
          dailyRate: roleRate?.dailyRate ?? 0,
          dailyCost: roleRate?.dailyCost ?? 0,
        }],
      };
    });
    setDirty(true);
  }

  function removeLineItem(itemId: string) {
    setBook(b => {
      if (!b) return b;
      const lineItems = b.lineItems.filter(i => i.id !== itemId);
      return {
        ...b,
        lineItems,
        showWeeklyAllocation: lineItems.length > 0 ? b.showWeeklyAllocation : false,
      };
    });
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
            status, discount: book.discount, markup: book.markup, tePercent: book.tePercent,
            lineItems: book.lineItems, showWeeklyAllocation: book.showWeeklyAllocation, phasedPricing: book.phasedPricing, notes: book.notes,
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

  const sym = currencySymbol(currencyMode);

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
                {REGION_FLAG[book.region]} {book.region}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">{book.engagement}</p>
            <p className="text-xs text-gray-400 mt-0.5">Rate card: {book.baseRateCardName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dirty && <span className="text-xs text-gray-400 font-medium">Unsaved</span>}
          <ExportDialog
            initial={{
              teamAndFee: true,
              weeklyAllocation: shouldShowWeeklyAllocation(book.showWeeklyAllocation, book.lineItems),
              phasedPricing: (book.phasedPricing?.length ?? 0) > 0,
            }}
            onConfirm={(options: ExportOptions) => exportBookToExcel(book, options)}
          />
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
                    const vTotal = calcTotals(v.snapshot.lineItems, v.snapshot.discount, v.snapshot.markup, v.snapshot.tePercent).grandTotal;
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
                          {formatMoney(vTotal, currencyMode)}
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
                  <div className="grid grid-cols-[140px_1fr_56px_56px_84px_84px_84px_28px] gap-2 px-1 mb-1">
                    {['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''].map(h => (
                      <span key={h} className="text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                  {book.lineItems.map(item => {
                    const sub = lineSubtotal(item);
                    const uniform = isUniform(item.days);
                    const avgDpw = averageDaysPerWeek(item.days);
                    return (
                      <div key={item.id} className="grid grid-cols-[140px_1fr_56px_56px_84px_84px_84px_28px] gap-2 items-center">
                        <span className="text-sm font-medium text-gray-800 truncate">{item.role}</span>
                        <Input
                          placeholder="Consultant name"
                          value={item.name}
                          onChange={e => updateLineItemField(item.id, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number" min={0}
                          value={item.days.length || ''}
                          onChange={e => updateWeeks(item.id, e.target.value)}
                          className="h-8 text-sm px-2 tabular-nums"
                        />
                        <Input
                          type="number" min={0} max={7} step={0.5}
                          value={uniform && item.days.length > 0 ? item.days[0] : ''}
                          placeholder={uniform ? '' : avgDpw.toFixed(1)}
                          onChange={e => updateDpw(item.id, e.target.value)}
                          title={uniform ? '' : `Mixed allocation — avg ${avgDpw.toFixed(1)}/wk. Edit to reset to uniform.`}
                          className="h-8 text-sm px-2 tabular-nums"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{sym}</span>
                          <Input
                            type="number" min={0} step={mode === 'hourly' ? 5 : 50}
                            value={toDisplayValue(item.dailyRate, mode, currencyMode) || ''}
                            onChange={e => updateRate(item.id, 'dailyRate', e.target.value)}
                            className="h-8 text-sm pl-5 pr-1 tabular-nums"
                            placeholder="0"
                          />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums text-right pr-1">
                          {sym}{toDisplayValue(item.dailyCost, mode, currencyMode).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm font-semibold text-right text-gray-900 tabular-nums pr-1">
                          {formatMoney(sub, currencyMode)}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => removeLineItem(item.id)} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
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
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={book.discount || ''} onChange={e => patch('discount', Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Markup %</Label>
                  <Input type="number" min={0} value={book.markup || ''} onChange={e => patch('markup', Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">T&amp;E %</Label>
                  <Input type="number" min={0} value={book.tePercent || ''} onChange={e => patch('tePercent', Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(totals.subtotal, currencyMode)}</span>
                </div>
                {book.discount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Discount ({book.discount}%)</span>
                    <span className="tabular-nums">-{formatMoney(totals.discountAmount, currencyMode)}</span>
                  </div>
                )}
                {book.markup > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Markup ({book.markup}%)</span>
                    <span className="tabular-nums">+{formatMoney(totals.markupAmount, currencyMode)}</span>
                  </div>
                )}
                {book.tePercent > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>T&amp;E ({book.tePercent}%)</span>
                    <span className="tabular-nums">+{formatMoney(totals.teAmount, currencyMode)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-1.5 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(totals.grandTotal, currencyMode)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profitability */}
          {book.lineItems.length > 0 && (
            <Card className="bg-zinc-50 border-zinc-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-[#5fa07a]" />
                  Profitability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Net Fees</span>
                  <span className="tabular-nums">{formatMoney(totals.afterMarkup, currencyMode)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Internal Cost</span>
                  <span className="tabular-nums">-{formatMoney(totals.totalCost, currencyMode)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-zinc-200">
                  <span>Gross Margin</span>
                  <span className="tabular-nums">{formatMoney(totals.grossMargin, currencyMode)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Average Daily Rate (ADR)</span>
                  <span className="tabular-nums">{formatMoney(totals.averageDailyRate, currencyMode)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Target {TARGET_MARGIN_PCT}%
                  </span>
                  <span className={`tabular-nums text-base font-bold ${aboveTarget ? 'text-[#5fa07a]' : 'text-red-500'}`}>
                    {totals.grossMarginPct.toFixed(1)}%
                  </span>
                </div>
                <div className={`text-[11px] text-right font-medium ${aboveTarget ? 'text-[#5fa07a]' : 'text-red-500'}`}>
                  {aboveTarget ? '+' : ''}{(totals.grossMarginPct - TARGET_MARGIN_PCT).toFixed(1)} pts vs target
                </div>
              </CardContent>
            </Card>
          )}

          {book.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Margin by Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {book.lineItems.map(item => {
                  const sub = lineSubtotal(item);
                  const cost = lineCost(item);
                  const margin = sub - cost;
                  const marginPct = sub > 0 ? (margin / sub) * 100 : 0;
                  const above = marginPct >= TARGET_MARGIN_PCT;
                  return (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate mr-2">
                        {item.role}
                        {item.name && <span className="text-gray-400 ml-1">· {item.name}</span>}
                      </span>
                      <div className="flex items-baseline gap-3 shrink-0">
                        <span className="text-xs text-gray-400 tabular-nums">{formatMoney(margin, currencyMode)}</span>
                        <span className={`font-semibold tabular-nums w-12 text-right ${above ? 'text-[#5fa07a]' : 'text-red-500'}`}>
                          {marginPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4 text-xs text-gray-400 space-y-1">
              <div>Created {new Date(book.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div>Updated {new Date(book.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div>{book.versions.length} version{book.versions.length !== 1 ? 's' : ''} saved</div>
              <div className="pt-1">{book.lineItems.reduce((s, i) => s + totalDays(i), 0)} total days</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editable weekly timeline */}
      {book.lineItems.length > 0 && (
        <div className="mt-6">
          {shouldShowWeeklyAllocation(book.showWeeklyAllocation, book.lineItems) ? (
            <EditableTimeline
              lineItems={book.lineItems}
              onChangeDays={(itemId, days) => updateLineItemField(itemId, 'days', days)}
              onRemoveSection={() => patch('showWeeklyAllocation', false)}
            />
          ) : (
            <Button variant="outline" onClick={() => patch('showWeeklyAllocation', true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add weekly allocation
            </Button>
          )}
          <PhasedPricing
            rows={book.phasedPricing}
            currencyMode={currencyMode}
            onChange={rows => patch('phasedPricing', rows)}
          />
        </div>
      )}
    </div>
  );
}
