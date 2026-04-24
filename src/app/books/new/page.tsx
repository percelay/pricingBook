'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getRateCards, upsertPricingBook } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, LineItem, ROLES, Region, CURRENCY_BY_REGION, PricingBook } from '@/lib/types';
import { calcTotals, formatCurrency, lineSubtotal } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EngagementTimeline from '@/components/engagement-timeline';

export default function NewBookPage() {
  const router = useRouter();
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [client, setClient] = useState('');
  const [engagement, setEngagement] = useState('');
  const [region, setRegion] = useState<Region>('US');
  const [rateCardId, setRateCardId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    seedDemoData();
    const cards = getRateCards();
    setRateCards(cards);
    const firstUS = cards.find(c => c.region === 'US');
    if (firstUS) setRateCardId(firstUS.id);
  }, []);

  const selectedCard = rateCards.find(c => c.id === rateCardId);
  const currency = CURRENCY_BY_REGION[region];
  const totals = calcTotals(lineItems, discount, markup);
  const canSave = client.trim() && engagement.trim() && lineItems.length > 0;

  function handleRegionChange(r: Region) {
    setRegion(r);
    const card = rateCards.find(c => c.region === r);
    if (card) setRateCardId(card.id);
    setLineItems([]);
  }

  function addRole(role: string) {
    if (!role) return;
    const rate = selectedCard?.roles.find(r => r.role === role)?.dailyRate ?? 0;
    const nextStart = lineItems.length > 0
      ? Math.max(...lineItems.map(i => i.startWeek))
      : 1;
    setLineItems(items => [...items, {
      id: crypto.randomUUID(),
      role: role as LineItem['role'],
      startWeek: nextStart,
      weeks: 4,
      daysPerWeek: 5,
      dailyRate: rate,
      expenses: 0,
      travel: 0,
    }]);
  }

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setLineItems(items =>
      items.map(item => item.id === id ? { ...item, [field]: Number(value) || 0 } : item)
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
      lineItems,
      notes,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertPricingBook(book);
    router.push(`/books/${book.id}`);
  }

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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Rate Card</Label>
                  <Select value={rateCardId} onValueChange={v => v && setRateCardId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select rate card" /></SelectTrigger>
                    <SelectContent>
                      {rateCards.map(c => (
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
                  <div className="grid grid-cols-[1fr_50px_58px_56px_88px_88px_88px_76px_28px] gap-2 px-1 mb-1">
                    {['Role', 'Start', 'Weeks', 'd/wk', 'Rate/day', 'Expenses', 'Travel', 'Total', ''].map(h => (
                      <span key={h} className="text-xs font-medium text-gray-400">{h}</span>
                    ))}
                  </div>
                  {lineItems.map(item => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      onChange={(field, val) => updateItem(item.id, field, val)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" min={0} max={100} value={discount || ''} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Markup %</Label>
                  <Input type="number" min={0} value={markup || ''} onChange={e => setMarkup(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
                </div>
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#E35336]">
                    <span>Discount ({discount}%)</span>
                    <span className="tabular-nums">-{formatCurrency(totals.discountAmount, currency)}</span>
                  </div>
                )}
                {markup > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Markup ({markup}%)</span>
                    <span className="tabular-nums">+{formatCurrency(totals.markupAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.grandTotal, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* Full-width timeline */}
      {lineItems.length > 0 && (
        <div className="mt-6">
          <EngagementTimeline lineItems={lineItems} />
        </div>
      )}
    </div>
  );
}

function LineItemRow({
  item,
  currency,
  onChange,
  onRemove,
}: {
  item: LineItem;
  currency: string;
  onChange: (field: keyof LineItem, value: string) => void;
  onRemove: () => void;
}) {
  const sym = currency === 'EUR' ? '€' : '$';
  return (
    <div className="grid grid-cols-[1fr_50px_58px_56px_88px_88px_88px_76px_28px] gap-2 items-center">
      <div className="min-w-0">
        <Badge variant="secondary" className="text-xs max-w-full truncate block w-fit">{item.role}</Badge>
      </div>
      {/* Start week */}
      <Input
        type="number" min={1}
        value={item.startWeek || ''}
        onChange={e => onChange('startWeek', e.target.value)}
        className="h-8 text-sm px-2 tabular-nums"
      />
      {/* Weeks */}
      <Input
        type="number" min={0}
        value={item.weeks || ''}
        onChange={e => onChange('weeks', e.target.value)}
        className="h-8 text-sm px-2 tabular-nums"
      />
      {/* Days/week */}
      <Input
        type="number" min={1} max={5}
        value={item.daysPerWeek || ''}
        onChange={e => onChange('daysPerWeek', e.target.value)}
        className="h-8 text-sm px-2 tabular-nums"
      />
      {/* Rate, Expenses, Travel */}
      {(['dailyRate', 'expenses', 'travel'] as const).map(field => (
        <div key={field} className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{sym}</span>
          <Input
            type="number" min={0} step={100}
            value={item[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            className="h-8 text-sm pl-5 pr-1 tabular-nums"
            placeholder="0"
          />
        </div>
      ))}
      <span className="text-sm font-semibold text-right text-gray-900 tabular-nums pr-1">
        {formatCurrency(lineSubtotal(item), currency)}
      </span>
      <Button size="icon" variant="ghost" onClick={onRemove} className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
