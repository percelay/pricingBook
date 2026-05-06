'use client';

import { useState, useEffect, use, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History, Trash2, Check, Save, Plus } from 'lucide-react';
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
    <div className="w-full">
      {/* Architectural masthead */}
      <header className="border-b border-[#292929] px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Link href="/">
                <Button variant="outline" size="icon" className="mt-1 shrink-0">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#292929]/70">
                  <span>Book / {id.slice(0, 8)}</span>
                  <span className="border border-[#292929] px-2 py-0.5 text-[#292929]">{book.status}</span>
                </div>
                <h1 className="mt-2 truncate text-[40px] font-thin leading-none tracking-[-0.03em] text-[#292929] sm:text-[48px]">
                  {book.client}
                </h1>
                <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[#292929]">
                  {book.engagement}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
                  Cards: {book.baseRateCardName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {dirty && (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
                  Unsaved
                </span>
              )}
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
                  <History className="h-3.5 w-3.5" />
                  History {book.versions.length > 0 && `· ${book.versions.length}`}
                </SheetTrigger>
                <SheetContent className="w-96">
                  <SheetHeader><SheetTitle>Version History</SheetTitle></SheetHeader>
                  <div className="space-y-0 overflow-y-auto">
                    {book.versions.length === 0 ? (
                      <p className="px-5 py-12 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/60">
                        No versions saved yet.<br />Click Save to capture a snapshot.
                      </p>
                    ) : (
                      [...book.versions].reverse().map((v, idx) => {
                        const vTotal = calcTotals(v.snapshot.lineItems, v.snapshot.discount, v.snapshot.markup, v.snapshot.tePercent).grandTotal;
                        return (
                          <div
                            key={v.version}
                            className={`px-5 py-4 ${idx > 0 ? 'border-t border-[#292929]' : ''} space-y-3`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em]">
                              <span>v{v.version}</span>
                              <span className="border border-[#292929] px-2 py-0.5">
                                {v.snapshot.status}
                              </span>
                            </div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
                              {new Date(v.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[24px] font-thin tracking-[-0.03em] tabular-nums text-[#292929]">
                              {formatMoney(vTotal, currencyMode)}
                            </p>
                            <Button size="sm" variant="outline" className="w-full" onClick={() => restoreVersion(v)}>
                              Restore
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={() => handleSave()}>
                <Save className="h-3.5 w-3.5" />Save
              </Button>
              {book.status === 'Draft' && (
                <Button size="sm" onClick={() => handleSave('Final')}>
                  <Check className="h-3.5 w-3.5" />Final
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleDelete} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Rate Card Setup · 01</CardTitle></CardHeader>
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
                  <CardTitle>Team & Fees · 02</CardTitle>
                  <Select onValueChange={v => v && addRole(v)} value={null}>
                    <SelectTrigger className="h-8 w-full text-[11px] sm:w-44">
                      <SelectValue placeholder="+ Add Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {book.lineItems.length === 0 ? (
                  <div className="border border-dashed border-[#292929] py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/60">
                    No team members added
                  </div>
                ) : (
                  <div>
                    <div className="hidden gap-2 border-b border-[#292929] pb-2 mb-2 px-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                      {(isHybrid ? ['Role', 'Consultant', 'Rate Card', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''] : ['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', '']).map(h => (
                        <span key={h} className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">{h}</span>
                      ))}
                    </div>
                    {book.lineItems.map((item, idx) => {
                      const sub = lineSubtotal(item);
                      const uniform = isUniform(item.days);
                      const avgDpw = averageDaysPerWeek(item.days);
                      const itemRateCardId = selectedRateCardIds.includes(item.rateCardId ?? '') ? item.rateCardId ?? '' : selectedRateCardIds[0] ?? '';
                      return (
                        <div key={item.id} className={idx > 0 ? 'mt-2' : ''}>
                          <div className="hidden items-center gap-2 px-1 py-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                            <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">{item.role}</span>
                            <Input
                              placeholder="Consultant name"
                              value={item.name}
                              onChange={e => updateLineItemField(item.id, 'name', e.target.value)}
                              className="h-8 min-w-0 text-[13px]"
                            />
                            {isHybrid && (
                              <Select value={itemRateCardId} onValueChange={v => v && updateLineItemRateCard(item.id, v)}>
                                <SelectTrigger className="h-8 min-w-0 w-full text-[12px]">
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
                              className="h-8 min-w-0 px-2 text-[13px] tabular-nums"
                            />
                            <Input
                              type="number" min={0} max={7} step={0.5}
                              value={uniform && item.days.length > 0 ? item.days[0] : ''}
                              placeholder={uniform ? '' : avgDpw.toFixed(1)}
                              onChange={e => updateDpw(item.id, e.target.value)}
                              title={uniform ? '' : `Mixed allocation — avg ${avgDpw.toFixed(1)}/wk. Edit to reset to uniform.`}
                              className="h-8 min-w-0 px-2 text-[13px] tabular-nums"
                            />
                            <div className="relative min-w-0">
                              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
                              <Input
                                type="number" min={0} step={mode === 'hourly' ? 5 : 50}
                                value={toDisplayValue(item.dailyRate, mode, currencyMode) || ''}
                                onChange={e => updateRate(item.id, 'dailyRate', e.target.value)}
                                className="h-8 min-w-0 pl-5 pr-1 text-[13px] tabular-nums"
                                placeholder="0"
                              />
                            </div>
                            <span className="min-w-0 truncate text-right text-[11px] tabular-nums text-[#292929]/60">
                              {sym}{toDisplayValue(item.dailyCost, mode, currencyMode).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="min-w-0 truncate text-right text-[14px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">
                              {formatMoney(sub, currencyMode)}
                            </span>
                            <Button size="icon-sm" variant="ghost" onClick={() => removeLineItem(item.id)} className="justify-self-end" title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Mobile card */}
                          <div className="space-y-3 border border-[#292929] p-3 md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <span className="max-w-[60%] truncate font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">{item.role}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">{formatMoney(sub, currencyMode)}</span>
                                <Button size="icon-sm" variant="ghost" onClick={() => removeLineItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Consultant</Label>
                              <Input
                                placeholder="Consultant name"
                                value={item.name}
                                onChange={e => updateLineItemField(item.id, 'name', e.target.value)}
                                className="h-8"
                              />
                            </div>
                            {isHybrid && (
                              <div className="space-y-1">
                                <Label>Rate Card</Label>
                                <Select value={itemRateCardId} onValueChange={v => v && updateLineItemRateCard(item.id, v)}>
                                  <SelectTrigger className="h-8 w-full">
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
                                <Label>Weeks</Label>
                                <Input
                                  type="number" min={0}
                                  value={item.days.length || ''}
                                  onChange={e => updateWeeks(item.id, e.target.value)}
                                  className="h-8 px-2 tabular-nums"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>D/Wk</Label>
                                <Input
                                  type="number" min={0} max={7} step={0.5}
                                  value={uniform && item.days.length > 0 ? item.days[0] : ''}
                                  placeholder={uniform ? '' : avgDpw.toFixed(1)}
                                  onChange={e => updateDpw(item.id, e.target.value)}
                                  className="h-8 px-2 tabular-nums"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Cost/{unit}</Label>
                                <div className="flex h-8 items-center justify-end border border-[#292929] px-2 text-[12px] tabular-nums text-[#292929]/60">
                                  {sym}{toDisplayValue(item.dailyCost, mode, currencyMode).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Rate/{unit}</Label>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
                                <Input
                                  type="number" min={0} step={mode === 'hourly' ? 5 : 50}
                                  value={toDisplayValue(item.dailyRate, mode, currencyMode) || ''}
                                  onChange={e => updateRate(item.id, 'dailyRate', e.target.value)}
                                  className="h-8 pl-5 tabular-nums"
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
                  <Plus className="h-3.5 w-3.5" />
                  Add Weekly Allocation
                </Button>
              )
            )}

            {/* Notes */}
            <Card>
              <CardHeader><CardTitle>Notes · 03</CardTitle></CardHeader>
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
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label>Disc %</Label>
                    <Input type="number" min={0} max={100} value={book.discount || ''} onChange={e => patch('discount', Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Markup %</Label>
                    <Input type="number" min={0} value={book.markup || ''} onChange={e => patch('markup', Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>T&amp;E %</Label>
                    <Input type="number" min={0} value={book.tePercent || ''} onChange={e => patch('tePercent', Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                </div>

                <div className="border-t border-[#292929] pt-3 space-y-2 text-[13px]">
                  <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal, currencyMode)} />
                  {book.discount > 0 && (
                    <SummaryRow label={`Discount ${book.discount}%`} value={`-${formatMoney(totals.discountAmount, currencyMode)}`} />
                  )}
                  {book.markup > 0 && (
                    <SummaryRow label={`Markup ${book.markup}%`} value={`+${formatMoney(totals.markupAmount, currencyMode)}`} />
                  )}
                  {book.tePercent > 0 && (
                    <SummaryRow label={`T&E ${book.tePercent}%`} value={`+${formatMoney(totals.teAmount, currencyMode)}`} />
                  )}
                  <div className="flex items-baseline justify-between border-t border-[#292929] pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]">Total</span>
                    <span className="text-[24px] font-thin tabular-nums tracking-[-0.03em] text-[#292929]">
                      {formatMoney(totals.grandTotal, currencyMode)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {book.lineItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Profitability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-[13px]">
                  <SummaryRow label="Net Fees" value={formatMoney(totals.afterMarkup, currencyMode)} />
                  <SummaryRow label="Internal Cost" value={`-${formatMoney(totals.totalCost, currencyMode)}`} />
                  <div className="flex items-baseline justify-between border-t border-[#292929] pt-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]">Gross Margin</span>
                    <span className="text-[16px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">
                      {formatMoney(totals.grossMargin, currencyMode)}
                    </span>
                  </div>
                  <SummaryRow label="ADR" value={formatMoney(totals.averageDailyRate, currencyMode)} />

                  <div className="mt-3 border border-[#292929] p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/70">
                        Target {TARGET_MARGIN_PCT}%
                      </span>
                      <span className="text-[28px] font-thin tabular-nums tracking-[-0.03em] text-[#292929]">
                        {totals.grossMarginPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-right text-[#292929]/70">
                      {aboveTarget ? '+' : ''}{(totals.grossMarginPct - TARGET_MARGIN_PCT).toFixed(1)} pts vs target
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {book.lineItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Margin / Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {book.lineItems.map((item, idx) => {
                    const sub = lineSubtotal(item);
                    const cost = lineCost(item);
                    const margin = sub - cost;
                    const marginPct = sub > 0 ? (margin / sub) * 100 : 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-baseline justify-between gap-2 ${idx > 0 ? 'border-t border-[#292929]/30 pt-2' : ''}`}
                      >
                        <span className="min-w-0 truncate text-[12px] tracking-[-0.01em] text-[#292929]">
                          {item.role}
                          {item.name && (
                            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#292929]/60">
                              {item.name}
                            </span>
                          )}
                        </span>
                        <div className="flex items-baseline gap-3 shrink-0">
                          <span className="font-mono text-[10px] tabular-nums tracking-[0.1em] text-[#292929]/60">
                            {formatMoney(margin, currencyMode)}
                          </span>
                          <span className="w-12 text-right text-[14px] font-light tabular-nums text-[#292929]">
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
              <CardContent className="pt-4 space-y-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(book.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{new Date(book.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Versions</span>
                  <span>{book.versions.length}</span>
                </div>
                <div className="flex justify-between border-t border-[#292929]/30 pt-2 mt-2">
                  <span>Total Days</span>
                  <span>{book.lineItems.reduce((s, i) => s + totalDays(i), 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/70">{label}</span>
      <span className="font-mono text-[12px] tabular-nums tracking-[0.05em] text-[#292929]">{value}</span>
    </div>
  );
}
