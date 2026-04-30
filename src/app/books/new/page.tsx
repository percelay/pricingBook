'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, TrendingUp, Target } from 'lucide-react';
import { getRateCards, upsertPricingBook } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, LineItem, ROLES, Region, PricingBook, TARGET_MARGIN_PCT, PhasedPricingRow } from '@/lib/types';
import {
  calcTotals, formatMoney, lineSubtotal, toDisplayValue, fromInputValue,
  rateUnit, isUniform, averageDaysPerWeek, uniformDays, resizeDays, currencySymbol,
} from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EditableTimeline from '@/components/engagement-timeline';
import PhasedPricing from '@/components/phased-pricing';

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
  const [region, setRegion] = useState<Region>('US');
  const [rateCardId, setRateCardId] = useState(() => rateCards.find(c => c.region === 'US')?.id ?? '');
  const [discount, setDiscount] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [tePercent, setTePercent] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [phasedPricing, setPhasedPricing] = useState<PhasedPricingRow[] | undefined>();
  const [notes, setNotes] = useState('');

  const selectedCard = rateCards.find(c => c.id === rateCardId);
  const totals = calcTotals(lineItems, discount, markup, tePercent);
  const canSave = client.trim() && engagement.trim() && lineItems.length > 0;
  const unit = rateUnit(mode);
  const aboveTarget = totals.grossMarginPct >= TARGET_MARGIN_PCT;

  function handleRegionChange(r: Region) {
    setRegion(r);
    const card = rateCards.find(c => c.region === r);
    if (card) setRateCardId(card.id);
    setLineItems([]);
  }

  function addRole(role: string) {
    if (!role) return;
    const roleRate = selectedCard?.roles.find(r => r.role === role);
    setLineItems(items => [...items, {
      id: crypto.randomUUID(),
      role: role as LineItem['role'],
      name: '',
      days: uniformDays(4, 5),
      dailyRate: roleRate?.dailyRate ?? 0,
      dailyCost: roleRate?.dailyCost ?? 0,
    }]);
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
    setLineItems(items => items.filter(item => item.id !== id));
  }

  function handleSave(status: 'Draft' | 'Final') {
    if (!canSave) return;
    const book: PricingBook = {
      id: crypto.randomUUID(),
      client: client.trim(),
      engagement: engagement.trim(),
      region,
      baseRateCardId: rateCardId,
      baseRateCardName: selectedCard?.name ?? '',
      status,
      discount,
      markup,
      tePercent,
      lineItems,
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
    <div className="p-8 max-w-6xl mx-auto">
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Engagement Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Client Name</Label>
                  <Input placeholder="Acme Corp" value={client} onChange={e => setClient(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Engagement Name</Label>
                  <Input placeholder="Digital Transformation" value={engagement} onChange={e => setEngagement(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Select value={region} onValueChange={v => v && handleRegionChange(v as Region)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="France">🇫🇷 France</SelectItem>
                      <SelectItem value="England">🇬🇧 England</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Rate Card</Label>
                  <Select value={rateCardId} onValueChange={v => v && setRateCardId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate card">
                        {(v: string) => rateCards.find(c => c.id === v)?.name ?? 'Select rate card'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rateCards.filter(c => c.region === region).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Team & Fees</CardTitle>
                <Select onValueChange={v => v && addRole(v)} value={null}>
                  <SelectTrigger className="w-44 h-8 text-sm">
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
                  <div className="grid grid-cols-[140px_1fr_56px_56px_84px_84px_84px_28px] gap-2 px-1 mb-1">
                    {['Role', 'Consultant', 'Weeks', 'd/wk', `Rate/${unit}`, `Cost/${unit}`, 'Subtotal', ''].map(h => (
                      <span key={h} className="text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                  {lineItems.map(item => {
                    const sub = lineSubtotal(item);
                    const uniform = isUniform(item.days);
                    const avgDpw = averageDaysPerWeek(item.days);
                    return (
                      <div key={item.id} className="grid grid-cols-[140px_1fr_56px_56px_84px_84px_84px_28px] gap-2 items-center">
                        <Badge variant="secondary" className="text-xs max-w-full truncate block w-fit">{item.role}</Badge>
                        <Input
                          placeholder="Consultant name"
                          value={item.name}
                          onChange={e => updateField(item.id, 'name', e.target.value)}
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
                        <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
          <EditableTimeline
            lineItems={lineItems}
            onChangeDays={(id, days) => updateField(id, 'days', days)}
          />
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
