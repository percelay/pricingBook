'use client';

import { useState, useEffect, use, type CSSProperties } from 'react';
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
import {
  applyRateCardToLineItem,
  buildLineItemFromRateCard,
  describeRateCardSelection,
  HYBRID_RATE_CARD_ID,
  isHybridRateCardSelection,
  normalizeRateCardIds,
  rateCardIdsForSelection,
  reassignLineItemsToAvailableCards,
  selectedRateCards,
} from '@/lib/rate-card-selection';
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
import RateCardSelector from '@/components/rate-card-selector';

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
  const savedRateCardIds = normalizeRateCardIds(
    book.selectedRateCardIds ?? [book.baseRateCardId, ...book.lineItems.map(item => item.rateCardId)],
    rateCards,
    book.baseRateCardId
  );
  const rateCardSelection =
    book.baseRateCardId === HYBRID_RATE_CARD_ID || book.region === 'Hybrid' || (book.selectedRateCardIds?.length ?? 0) > 1
      ? HYBRID_RATE_CARD_ID
      : savedRateCardIds[0] ?? '';
  const isHybrid = isHybridRateCardSelection(rateCardSelection);
  const selectedRateCardIds = isHybrid ? rateCards.map(card => card.id) : savedRateCardIds;
  const activeRateCards = selectedRateCards(rateCards, selectedRateCardIds);
  const teamGridTemplate = isHybrid
    ? 'minmax(0, 0.86fr) minmax(0, 1.05fr) minmax(0, 1.16fr) minmax(0, 0.42fr) minmax(0, 0.42fr) minmax(0, 0.58fr) minmax(0, 0.52fr) minmax(0, 0.72fr) 28px'
    : 'minmax(0, 0.95fr) minmax(0, 1.25fr) minmax(0, 0.46fr) minmax(0, 0.46fr) minmax(0, 0.66fr) minmax(0, 0.58fr) minmax(0, 0.82fr) 28px';
  const teamGridStyle = { '--team-grid-template': teamGridTemplate } as CSSProperties;

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

  function updateRateCardSelection(selection: string) {
    const normalizedIds = rateCardIdsForSelection(selection, rateCards);
    const hybrid = isHybridRateCardSelection(selection);
    const selectedCard = selectedRateCards(rateCards, normalizedIds)[0];

    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        region: hybrid ? 'Hybrid' : selectedCard?.region ?? b.region,
        baseRateCardId: hybrid ? HYBRID_RATE_CARD_ID : normalizedIds[0] ?? '',
        baseRateCardName: describeRateCardSelection(rateCards, normalizedIds, hybrid),
        selectedRateCardIds: normalizedIds,
        lineItems: reassignLineItemsToAvailableCards(b.lineItems, rateCards, normalizedIds),
      };
    });
    setDirty(true);
  }

  function updateLineItemRateCard(itemId: string, cardId: string) {
    const card = rateCards.find(c => c.id === cardId);
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: b.lineItems.map(item =>
          item.id === itemId ? applyRateCardToLineItem(item, card) : item
        ),
      };
    });
    setDirty(true);
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
    const card = activeRateCards[0];
    setBook(b => {
      if (!b) return b;
      return {
        ...b,
        lineItems: [
          ...b.lineItems,
          buildLineItemFromRateCard(crypto.randomUUID(), role as LineItem['role'], card),
        ],
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
    const bookRateCardIds = selectedRateCardIds;
    const bookIsHybrid = isHybridRateCardSelection(rateCardSelection);
    const updatedRegion = bookIsHybrid ? 'Hybrid' : activeRateCards[0]?.region ?? book.region;
    const updatedRateCardId = bookIsHybrid ? HYBRID_RATE_CARD_ID : bookRateCardIds[0] ?? book.baseRateCardId;
    const updatedRateCardName = describeRateCardSelection(rateCards, bookRateCardIds, bookIsHybrid) || book.baseRateCardName;
    const updated: PricingBook = {
      ...book,
      region: updatedRegion,
      baseRateCardId: updatedRateCardId,
      baseRateCardName: updatedRateCardName,
      selectedRateCardIds: bookRateCardIds,
      status,
      updatedAt: new Date().toISOString(),
      versions: [
        ...book.versions,
        {
          version: book.versions.length + 1,
          savedAt: new Date().toISOString(),
          snapshot: {
            client: book.client, engagement: book.engagement, region: updatedRegion,
            baseRateCardId: updatedRateCardId,
            baseRateCardName: updatedRateCardName,
            selectedRateCardIds: bookRateCardIds,
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
    <div className="product-page-wide">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)] xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-normal text-[#1b2540]">{book.client}</h1>
              <Badge variant={book.status === 'Final' ? 'default' : 'secondary'}>{book.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-[#6b7184]">{book.engagement}</p>
            <p className="mt-0.5 text-xs text-[#6b7184]">Rate cards: {book.baseRateCardName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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

      <div className="editor-layout grid grid-cols-1 gap-6">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Rate Card Setup</CardTitle></CardHeader>
            <CardContent>
              <RateCardSelector
                value={rateCardSelection}
                rateCards={rateCards}
                onChange={updateRateCardSelection}
              />
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Team & Fees</CardTitle>
                <Select onValueChange={v => v && addRole(v)} value={null}>
                  <SelectTrigger className="h-8 w-full text-sm sm:w-44">
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
                  <div className="mb-1 hidden gap-1.5 px-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                    {(isHybrid ? ['Role', 'Consultant', 'Rate Card', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''] : ['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', '']).map(h => (
                      <span key={h} className="min-w-0 truncate text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                    {book.lineItems.map(item => {
                      const sub = lineSubtotal(item);
                      const uniform = isUniform(item.days);
                      const avgDpw = averageDaysPerWeek(item.days);
                      const itemRateCardId = selectedRateCardIds.includes(item.rateCardId ?? '') ? item.rateCardId ?? '' : selectedRateCardIds[0] ?? '';
                      return (
                        <div key={item.id}>
                          <div className="hidden items-center gap-1.5 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                            <span className="min-w-0 truncate text-sm font-medium text-gray-800">{item.role}</span>
                            <Input
                              placeholder="Consultant name"
                              value={item.name}
                              onChange={e => updateLineItemField(item.id, 'name', e.target.value)}
                              className="h-8 min-w-0 text-sm"
                            />
                            {isHybrid && (
                              <Select value={itemRateCardId} onValueChange={v => v && updateLineItemRateCard(item.id, v)}>
                                <SelectTrigger className="h-8 min-w-0 w-full text-sm">
                                  <SelectValue placeholder="Rate card">
                                    {(v: string) => {
                                      const card = rateCards.find(c => c.id === v);
                                      return card ? `${REGION_FLAG[card.region]} ${card.name}` : 'Rate card';
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {rateCards.map(card => (
                                    <SelectItem key={card.id} value={card.id}>
                                      {REGION_FLAG[card.region]} {card.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Input
                              type="number" min={0}
                              value={item.days.length || ''}
                              onChange={e => updateWeeks(item.id, e.target.value)}
                              className="h-8 min-w-0 px-1.5 text-sm tabular-nums"
                            />
                            <Input
                              type="number" min={0} max={7} step={0.5}
                              value={uniform && item.days.length > 0 ? item.days[0] : ''}
                              placeholder={uniform ? '' : avgDpw.toFixed(1)}
                              onChange={e => updateDpw(item.id, e.target.value)}
                              title={uniform ? '' : `Mixed allocation — avg ${avgDpw.toFixed(1)}/wk. Edit to reset to uniform.`}
                              className="h-8 min-w-0 px-1.5 text-sm tabular-nums"
                            />
                            <div className="relative min-w-0">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{sym}</span>
                              <Input
                                type="number" min={0} step={mode === 'hourly' ? 5 : 50}
                                value={toDisplayValue(item.dailyRate, mode, currencyMode) || ''}
                                onChange={e => updateRate(item.id, 'dailyRate', e.target.value)}
                                className="h-8 min-w-0 pl-5 pr-1 text-sm tabular-nums"
                                placeholder="0"
                              />
                            </div>
                            <span className="min-w-0 truncate text-right text-xs tabular-nums text-gray-400">
                              {sym}{toDisplayValue(item.dailyCost, mode, currencyMode).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="min-w-0 truncate text-right text-sm font-semibold tabular-nums text-gray-900">
                              {formatMoney(sub, currencyMode)}
                            </span>
                            <Button size="icon" variant="ghost" onClick={() => removeLineItem(item.id)} className="h-7 w-7 justify-self-end text-gray-300 hover:text-red-500 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="space-y-3 border border-gray-100 p-3 md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <span className="max-w-[60%] truncate text-sm font-medium text-gray-800">{item.role}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(sub, currencyMode)}</span>
                                <Button size="icon" variant="ghost" onClick={() => removeLineItem(item.id)} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase tracking-wider text-gray-400">Consultant</Label>
                              <Input
                                placeholder="Consultant name"
                                value={item.name}
                                onChange={e => updateLineItemField(item.id, 'name', e.target.value)}
                                className="h-8 min-w-0 text-sm"
                              />
                            </div>
                            {isHybrid && (
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Rate Card</Label>
                                <Select value={itemRateCardId} onValueChange={v => v && updateLineItemRateCard(item.id, v)}>
                                  <SelectTrigger className="h-8 min-w-0 w-full text-sm">
                                    <SelectValue placeholder="Rate card">
                                      {(v: string) => {
                                        const card = rateCards.find(c => c.id === v);
                                        return card ? `${REGION_FLAG[card.region]} ${card.name}` : 'Rate card';
                                      }}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rateCards.map(card => (
                                      <SelectItem key={card.id} value={card.id}>
                                        {REGION_FLAG[card.region]} {card.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Weeks</Label>
                                <Input
                                  type="number" min={0}
                                  value={item.days.length || ''}
                                  onChange={e => updateWeeks(item.id, e.target.value)}
                                  className="h-8 min-w-0 px-1.5 text-sm tabular-nums"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-gray-400">d/wk</Label>
                                <Input
                                  type="number" min={0} max={7} step={0.5}
                                  value={uniform && item.days.length > 0 ? item.days[0] : ''}
                                  placeholder={uniform ? '' : avgDpw.toFixed(1)}
                                  onChange={e => updateDpw(item.id, e.target.value)}
                                  title={uniform ? '' : `Mixed allocation — avg ${avgDpw.toFixed(1)}/wk. Edit to reset to uniform.`}
                                  className="h-8 min-w-0 px-1.5 text-sm tabular-nums"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Cost/{unit}</Label>
                                <div className="flex h-8 items-center justify-end border border-gray-200 px-2 text-xs text-gray-400 tabular-nums">
                                  {sym}{toDisplayValue(item.dailyCost, mode, currencyMode).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase tracking-wider text-gray-400">Rate/{unit}</Label>
                              <div className="relative min-w-0">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{sym}</span>
                                <Input
                                  type="number" min={0} step={mode === 'hourly' ? 5 : 50}
                                  value={toDisplayValue(item.dailyRate, mode, currencyMode) || ''}
                                  onChange={e => updateRate(item.id, 'dailyRate', e.target.value)}
                                  className="h-8 min-w-0 pl-5 pr-1 text-sm tabular-nums"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable weekly timeline */}
          {book.lineItems.length > 0 && (
            shouldShowWeeklyAllocation(book.showWeeklyAllocation, book.lineItems) ? (
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
            )
          )}

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={book.notes} onChange={e => patch('notes', e.target.value)} rows={4} placeholder="Assumptions, exclusions, context..." />
            </CardContent>
          </Card>

          {/* Phased Pricing */}
          {book.lineItems.length > 0 && (
            <PhasedPricing
              rows={book.phasedPricing}
              currencyMode={currencyMode}
              onChange={rows => patch('phasedPricing', rows)}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pricing Summary</CardTitle></CardHeader>
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
                <div className="flex justify-between border-t pt-1.5 text-lg font-medium text-[#1b2540]">
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

    </div>
  );
}
