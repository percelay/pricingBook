'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, TrendingUp, Target } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
    <div className="w-full max-w-[1280px] px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-7">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Pricing Book</h1>
          <p className="text-gray-500 mt-0.5">Create a pricing for a new client engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Engagement Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                <CardTitle className="text-sm font-semibold text-gray-700">Team & Fees</CardTitle>
                <Select onValueChange={v => v && addRole(v)} value={null}>
                  <SelectTrigger className="h-8 w-full text-sm sm:w-44">
                    <SelectValue placeholder="+ Add role" />
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
                <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  Add team roles using the dropdown above
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-1 hidden gap-1.5 px-1 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                    {(isHybrid ? ['Role', 'Consultant', 'Rate Card', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''] : ['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', '']).map(h => (
                      <span key={h} className="min-w-0 truncate text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                  {lineItems.map(item => {
                    const sub = lineSubtotal(item);
                    const uniform = isUniform(item.days);
                    const avgDpw = averageDaysPerWeek(item.days);
                    const itemRateCardId = activeRateCardIds.includes(item.rateCardId ?? '') ? item.rateCardId ?? '' : activeRateCardIds[0] ?? '';
                    return (
                      <div key={item.id}>
                        <div className="hidden items-center gap-1.5 md:grid md:[grid-template-columns:var(--team-grid-template)]" style={teamGridStyle}>
                          <Badge variant="secondary" className="block max-w-full truncate text-xs">{item.role}</Badge>
                          <Input
                            placeholder="Consultant name"
                            value={item.name}
                            onChange={e => updateField(item.id, 'name', e.target.value)}
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
                          <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-7 w-7 justify-self-end text-gray-300 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-3 border border-gray-100 p-3 md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <Badge variant="secondary" className="max-w-[60%] truncate text-xs">{item.role}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(sub, currencyMode)}</span>
                              <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-gray-400">Consultant</Label>
                            <Input
                              placeholder="Consultant name"
                              value={item.name}
                              onChange={e => updateField(item.id, 'name', e.target.value)}
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

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle></CardHeader>
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

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Pricing Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Markup %</Label>
                  <Input type="number" min={0} value={markup || ''} onChange={e => setMarkup(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">T&amp;E %</Label>
                  <Input type="number" min={0} value={tePercent || ''} onChange={e => setTePercent(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
                </div>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(totals.subtotal, currencyMode)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Discount ({discount}%)</span>
                    <span className="tabular-nums">-{formatMoney(totals.discountAmount, currencyMode)}</span>
                  </div>
                )}
                {markup > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Markup ({markup}%)</span>
                    <span className="tabular-nums">+{formatMoney(totals.markupAmount, currencyMode)}</span>
                  </div>
                )}
                {tePercent > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>T&amp;E ({tePercent}%)</span>
                    <span className="tabular-nums">+{formatMoney(totals.teAmount, currencyMode)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(totals.grandTotal, currencyMode)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {lineItems.length > 0 && (
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

          <div className="space-y-2">
            <Button className="w-full" variant="outline" onClick={() => handleSave('Draft')} disabled={!canSave}>Save as Draft</Button>
            <Button className="w-full" onClick={() => handleSave('Final')} disabled={!canSave}>Mark as Final</Button>
          </div>
          {!canSave && (
            <p className="text-xs text-gray-400 text-center leading-snug">
              Fill client, engagement, and add at least one role
            </p>
          )}
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="mt-6">
          {shouldShowWeeklyAllocation(showWeeklyAllocation, lineItems) ? (
            <EditableTimeline
              lineItems={lineItems}
              onChangeDays={(id, days) => updateField(id, 'days', days)}
              onRemoveSection={() => setShowWeeklyAllocation(false)}
            />
          ) : (
            <Button variant="outline" onClick={() => setShowWeeklyAllocation(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add weekly allocation
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
  );
}
