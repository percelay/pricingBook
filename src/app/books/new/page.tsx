'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getRateCards, upsertPricingBook } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, LineItem, ROLES, PricingBook, TARGET_MARGIN_PCT, PhasedPricingRow, REGION_FLAG } from '@/lib/types';
import {
  calcTotals, formatMoney, lineSubtotal, toDisplayValue, fromInputValue,
  rateUnit, isUniform, averageDaysPerWeek, uniformDays, resizeDays, currencySymbol,
} from '@/lib/calculations';
import {
  applyRateCardToLineItem,
  buildLineItemFromRateCard,
  describeRateCardSelection,
  HYBRID_RATE_CARD_ID,
  isHybridRateCardSelection,
  rateCardIdsForSelection,
  reassignLineItemsToAvailableCards,
  selectedRateCards,
} from '@/lib/rate-card-selection';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { shouldShowWeeklyAllocation } from '@/lib/weekly-allocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EditableTimeline from '@/components/engagement-timeline';
import PhasedPricing from '@/components/phased-pricing';
import RateCardSelector from '@/components/rate-card-selector';

export default function NewBookPage() {
  const router = useRouter();
  const { mode } = useRateMode();
  const { mode: currencyMode } = useCurrencyMode();
  const [rateCards] = useState<RateCard[]>(() => {
    seedDemoData();
    return getRateCards();
  });
  const [client, setClient] = useState('');
  const [engagement, setEngagement] = useState('');
  const [rateCardSelection, setRateCardSelection] = useState(() => rateCards[0]?.id ?? '');
  const [discount, setDiscount] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [tePercent, setTePercent] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showWeeklyAllocation, setShowWeeklyAllocation] = useState(false);
  const [phasedPricing, setPhasedPricing] = useState<PhasedPricingRow[] | undefined>();
  const [notes, setNotes] = useState('');

  const isHybrid = isHybridRateCardSelection(rateCardSelection);
  const activeRateCardIds = rateCardIdsForSelection(rateCardSelection, rateCards);
  const activeRateCards = selectedRateCards(rateCards, activeRateCardIds);
  const selectedCard = activeRateCards[0];
  const totals = calcTotals(lineItems, discount, markup, tePercent);
  const canSave = client.trim() && engagement.trim() && activeRateCardIds.length > 0 && lineItems.length > 0;
  const unit = rateUnit(mode);
  const aboveTarget = totals.grossMarginPct >= TARGET_MARGIN_PCT;
  const teamGridTemplate = isHybrid
    ? 'minmax(0, 0.86fr) minmax(0, 1.05fr) minmax(0, 1.16fr) minmax(0, 0.42fr) minmax(0, 0.42fr) minmax(0, 0.58fr) minmax(0, 0.52fr) minmax(0, 0.72fr) 28px'
    : 'minmax(0, 0.95fr) minmax(0, 1.25fr) minmax(0, 0.46fr) minmax(0, 0.46fr) minmax(0, 0.66fr) minmax(0, 0.58fr) minmax(0, 0.82fr) 28px';
  const teamGridStyle = { '--team-grid-template': teamGridTemplate } as CSSProperties;

  function handleRateCardSelection(value: string) {
    const rateCardIds = rateCardIdsForSelection(value, rateCards);
    setRateCardSelection(value);
    setLineItems(items => reassignLineItemsToAvailableCards(items, rateCards, rateCardIds));
  }

  function addRole(role: string) {
    if (!role) return;
    setLineItems(items => [
      ...items,
      buildLineItemFromRateCard(crypto.randomUUID(), role as LineItem['role'], selectedCard),
    ]);
  }

  function updateField<K extends keyof LineItem>(id: string, field: K, value: LineItem[K]) {
    setLineItems(items =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  }

  function updateRate(id: string, field: 'dailyRate' | 'dailyCost', value: string) {
    const num = Number(value) || 0;
    updateField(id, field, fromInputValue(num, mode, currencyMode));
  }

  function updateLineItemRateCard(id: string, cardId: string) {
    const card = rateCards.find(c => c.id === cardId);
    setLineItems(items =>
      items.map(item => item.id === id ? applyRateCardToLineItem(item, card) : item)
    );
  }

  function updateWeeks(id: string, value: string) {
    const newLen = Math.max(0, Math.floor(Number(value) || 0));
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item;
        const fillVal = isUniform(item.days) && item.days.length > 0 ? item.days[0] : 5;
        return { ...item, days: resizeDays(item.days, newLen, fillVal) };
      })
    );
  }

  function updateDpw(id: string, value: string) {
    const dpw = Math.max(0, Number(value) || 0);
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item;
        const len = item.days.length === 0 ? 4 : item.days.length;
        return { ...item, days: uniformDays(len, dpw) };
      })
    );
  }

  function removeItem(id: string) {
    setLineItems(items => {
      const next = items.filter(item => item.id !== id);
      if (next.length === 0) setShowWeeklyAllocation(false);
      return next;
    });
  }

  function handleSave(status: 'Draft' | 'Final') {
    if (!canSave) return;
    const bookRateCardIds = activeRateCardIds;
    const bookIsHybrid = isHybridRateCardSelection(rateCardSelection);
    const book: PricingBook = {
      id: crypto.randomUUID(),
      client: client.trim(),
      engagement: engagement.trim(),
      region: bookIsHybrid ? 'Hybrid' : selectedCard?.region ?? 'US',
      baseRateCardId: bookIsHybrid ? HYBRID_RATE_CARD_ID : bookRateCardIds[0] ?? '',
      baseRateCardName: describeRateCardSelection(rateCards, bookRateCardIds, bookIsHybrid),
      selectedRateCardIds: bookRateCardIds,
      status,
      discount,
      markup,
      tePercent,
      lineItems,
      showWeeklyAllocation,
      phasedPricing,
      notes,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertPricingBook(book);
    router.push(`/books/${book.id}`);
  }

  const sym = currencySymbol(currencyMode);

  return (
    <div className="w-full">
      <header className="border-b border-[#292929] px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex items-start gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="mt-1">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-[#292929]/70">
                New Record · 00
              </p>
              <h1 className="mt-1 text-[40px] font-thin leading-none tracking-[-0.03em] text-[#292929] sm:text-[48px]">
                New Pricing Book
              </h1>
              <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[#292929]/70">
                Create a pricing for a new client engagement
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Engagement · 01</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Client Name</Label>
                    <Input placeholder="Acme Corp" value={client} onChange={e => setClient(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Engagement Name</Label>
                    <Input placeholder="Digital Transformation" value={engagement} onChange={e => setEngagement(e.target.value)} />
                  </div>
                </div>
                <RateCardSelector
                  value={rateCardSelection}
                  rateCards={rateCards}
                  onChange={handleRateCardSelection}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Team & Fees · 02</CardTitle>
                  <Select onValueChange={v => v && addRole(v)} value={null}>
                    <SelectTrigger className="h-8 w-full text-[11px] sm:w-44">
                      <SelectValue placeholder="+ Add Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {lineItems.length === 0 ? (
                  <div className="border border-dashed border-[#292929] py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/60">
                    Add team roles using the dropdown above
                  </div>
                ) : (
                  <div>
                    <div className="hidden gap-2 border-b border-[#292929] pb-2 mb-2 px-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                      {(isHybrid ? ['Role', 'Consultant', 'Rate Card', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''] : ['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', '']).map(h => (
                        <span key={h} className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">{h}</span>
                      ))}
                    </div>
                    {lineItems.map((item, idx) => {
                      const sub = lineSubtotal(item);
                      const uniform = isUniform(item.days);
                      const avgDpw = averageDaysPerWeek(item.days);
                      const itemRateCardId = activeRateCardIds.includes(item.rateCardId ?? '') ? item.rateCardId ?? '' : activeRateCardIds[0] ?? '';
                      return (
                        <div key={item.id} className={idx > 0 ? 'mt-2' : ''}>
                          <div className="hidden items-center gap-2 px-1 py-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                            <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">{item.role}</span>
                            <Input
                              placeholder="Consultant name"
                              value={item.name}
                              onChange={e => updateField(item.id, 'name', e.target.value)}
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
                            <Button size="icon-sm" variant="ghost" onClick={() => removeItem(item.id)} className="justify-self-end" title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="space-y-3 border border-[#292929] p-3 md:hidden">
                            <div className="flex items-start justify-between gap-3">
                              <span className="max-w-[60%] truncate font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">{item.role}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">{formatMoney(sub, currencyMode)}</span>
                                <Button size="icon-sm" variant="ghost" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Consultant</Label>
                              <Input
                                placeholder="Consultant name"
                                value={item.name}
                                onChange={e => updateField(item.id, 'name', e.target.value)}
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

            <Card>
              <CardHeader><CardTitle>Notes · 03</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Assumptions, exclusions, or context..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label>Disc %</Label>
                    <Input type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Markup %</Label>
                    <Input type="number" min={0} value={markup || ''} onChange={e => setMarkup(Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>T&amp;E %</Label>
                    <Input type="number" min={0} value={tePercent || ''} onChange={e => setTePercent(Number(e.target.value) || 0)} placeholder="0" className="h-8 tabular-nums" />
                  </div>
                </div>
                <div className="border-t border-[#292929] pt-3 space-y-2 text-[13px]">
                  <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal, currencyMode)} />
                  {discount > 0 && (
                    <SummaryRow label={`Discount ${discount}%`} value={`-${formatMoney(totals.discountAmount, currencyMode)}`} />
                  )}
                  {markup > 0 && (
                    <SummaryRow label={`Markup ${markup}%`} value={`+${formatMoney(totals.markupAmount, currencyMode)}`} />
                  )}
                  {tePercent > 0 && (
                    <SummaryRow label={`T&E ${tePercent}%`} value={`+${formatMoney(totals.teAmount, currencyMode)}`} />
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

            {lineItems.length > 0 && (
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

            <div className="space-y-2">
              <Button className="w-full" variant="outline" onClick={() => handleSave('Draft')} disabled={!canSave}>Save Draft</Button>
              <Button className="w-full" onClick={() => handleSave('Final')} disabled={!canSave}>Mark Final</Button>
            </div>
            {!canSave && (
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60 leading-snug">
                Fill client, engagement, and add at least one role
              </p>
            )}
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-6 space-y-6">
            {shouldShowWeeklyAllocation(showWeeklyAllocation, lineItems) ? (
              <EditableTimeline
                lineItems={lineItems}
                onChangeDays={(id, days) => updateField(id, 'days', days)}
                onRemoveSection={() => setShowWeeklyAllocation(false)}
              />
            ) : (
              <Button variant="outline" onClick={() => setShowWeeklyAllocation(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Weekly Allocation
              </Button>
            )}
            <PhasedPricing
              rows={phasedPricing}
              currencyMode={currencyMode}
              onChange={setPhasedPricing}
            />
          </div>
        )}
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
