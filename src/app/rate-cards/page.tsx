'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { getRateCards, upsertRateCard, deleteRateCard } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, ROLES, Region, CURRENCY_BY_REGION, REGION_FLAG } from '@/lib/types';
import { formatMoney, toDisplayRate, toDisplayValue, fromInputValue, rateUnit, currencySymbol } from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RetroPricingGraphic from '@/components/retro-pricing-graphic';

type FormState = {
  name: string;
  region: Region;
  roles: { role: string; dailyRate: number; dailyCost: number }[];
};

function emptyForm(): FormState {
  return {
    name: '',
    region: 'US',
    roles: ROLES.map(role => ({ role, dailyRate: 0, dailyCost: 0 })),
  };
}

function loadRateCards() {
  seedDemoData();
  return getRateCards();
}

export default function RateCardsPage() {
  const { mode } = useRateMode();
  const { mode: currencyMode } = useCurrencyMode();
  const [cards, setCards] = useState<RateCard[]>(loadRateCards);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  function reload() {
    setCards(loadRateCards());
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(card: RateCard) {
    setEditing(card);
    setForm({
      name: card.name,
      region: card.region,
      roles: card.roles.map(r => ({ role: r.role, dailyRate: r.dailyRate, dailyCost: r.dailyCost })),
    });
    setOpen(true);
  }

  function handleRegionChange(region: Region) {
    setForm(f => ({ ...f, region }));
  }

  function handleRoleField(role: string, field: 'dailyRate' | 'dailyCost', value: string) {
    const stored = fromInputValue(Number(value) || 0, mode, currencyMode);
    setForm(f => ({
      ...f,
      roles: f.roles.map(r => r.role === role ? { ...r, [field]: stored } : r),
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const currency = CURRENCY_BY_REGION[form.region];
    const card: RateCard = {
      id: editing?.id ?? crypto.randomUUID(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      name: form.name.trim(),
      region: form.region,
      currency,
      roles: form.roles.map(r => ({
        role: r.role as RateCard['roles'][0]['role'],
        dailyRate: r.dailyRate,
        dailyCost: r.dailyCost,
      })),
    };
    upsertRateCard(card);
    reload();
    setOpen(false);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this rate card?')) return;
    deleteRateCard(id);
    reload();
  }

  const usCards = cards.filter(c => c.region === 'US');
  const frCards = cards.filter(c => c.region === 'France');
  const ukCards = cards.filter(c => c.region === 'England');
  const sym = currencySymbol(currencyMode);
  const unit = rateUnit(mode);

  return (
    <div className="product-page">
      <div className="product-hero pricing-hero compact-hero mb-6 px-6 py-4 sm:px-8">
        <div className="grid min-h-[92px] items-center gap-4 md:grid-cols-[minmax(220px,0.72fr)_minmax(360px,1.28fr)]">
          <h1 className="display-type text-[34px] leading-[1.02] tracking-[-0.01em] sm:text-[40px]">
            Rate Cards
          </h1>
          <RetroPricingGraphic mode="compact" variant="rates" />
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#6b7184]">
          Viewing in <span className="font-medium text-[#1b2540]">{mode === 'hourly' ? 'hourly' : 'daily'}</span> · <span className="font-medium text-[#1b2540]">{currencyMode === 'EUR' ? 'euros' : 'dollars'}</span>
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Rate Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="surface-card py-20 text-center text-[#6b7184]">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[#1b2540]">No rate cards yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: '🇺🇸 United States', list: usCards },
            { label: '🇫🇷 France', list: frCards },
            { label: '🇬🇧 England', list: ukCards },
          ]
            .filter(g => g.list.length > 0)
            .map(group => (
              <div key={group.label}>
                <h2 className="fine-label mb-3">
                  {group.label}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.list.map(card => (
                    <RateCardCard
                      key={card.id}
                      card={card}
                      onEdit={() => openEdit(card)}
                      onDelete={() => handleDelete(card.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rate Card' : 'New Rate Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Acme Corp — Premium 2025"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={v => v && handleRegionChange(v as Region)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="France">🇫🇷 France</SelectItem>
                  <SelectItem value="England">🇬🇧 England</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_120px_120px] gap-3 items-center">
                <Label className="mb-0">Role</Label>
                <Label className="mb-0 text-xs">Bill rate / {unit}</Label>
                <Label className="mb-0 text-xs">Internal cost / {unit}</Label>
              </div>
              <div className="space-y-2">
                {form.roles.map(r => (
                  <div key={r.role} className="grid grid-cols-[1fr_120px_120px] gap-3 items-center">
                    <span className="text-sm text-gray-700">{r.role}</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
                      <Input
                        type="number"
                        min={0}
                        className="pl-7 tabular-nums"
                        value={Math.round(toDisplayValue(r.dailyRate, mode, currencyMode)) || ''}
                        onChange={e => handleRoleField(r.role, 'dailyRate', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{sym}</span>
                      <Input
                        type="number"
                        min={0}
                        className="pl-7 tabular-nums"
                        value={Math.round(toDisplayValue(r.dailyCost, mode, currencyMode)) || ''}
                        onChange={e => handleRoleField(r.role, 'dailyCost', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RateCardCard({
  card,
  onEdit,
  onDelete,
}: {
  card: RateCard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { mode } = useRateMode();
  const { mode: currencyMode } = useCurrencyMode();
  const unit = rateUnit(mode);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{card.name}</CardTitle>
            <Badge variant="outline" className="mt-1.5 text-xs font-normal">
              {REGION_FLAG[card.region]} {card.region} · {currencyMode}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1.5 text-sm items-baseline">
          <span className="fine-label">Role</span>
          <span className="fine-label text-right">Rate</span>
          <span className="fine-label text-right">Cost</span>
          <span className="fine-label text-right">Margin</span>
          {card.roles.map(r => {
            const margin = r.dailyRate > 0 ? ((r.dailyRate - r.dailyCost) / r.dailyRate) * 100 : 0;
            return (
              <div key={r.role} className="contents">
                <span className="text-[#1b2540]">{r.role}</span>
                <span className="font-medium text-[#1b2540] tabular-nums text-right">
                  {formatMoney(toDisplayRate(r.dailyRate, mode), currencyMode)}
                  <span className="text-gray-400 font-normal text-xs">/{unit}</span>
                </span>
                <span className="text-[#6b7184] tabular-nums text-right">
                  {formatMoney(toDisplayRate(r.dailyCost, mode), currencyMode)}
                </span>
                <span className="tabular-nums text-right text-xs font-medium text-[#0050f8]">
                  {margin.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
