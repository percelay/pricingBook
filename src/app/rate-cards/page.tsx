'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { getRateCards, upsertRateCard, deleteRateCard } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, ROLES, Region, CURRENCY_BY_REGION, REGION_FLAG } from '@/lib/types';
import { formatMoney, toDisplayRate, toDisplayValue, fromInputValue, rateUnit, currencySymbol } from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { useCurrencyMode } from '@/lib/currency-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <div className="w-full">
      <header className="border-b border-[#292929] px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-[#292929]/70">
              Index · 02
            </p>
            <h1 className="mt-1 text-[40px] font-thin leading-none tracking-[-0.03em] text-[#292929] sm:text-[56px]">
              Rate Cards
            </h1>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/70">
              {mode === 'hourly' ? 'Hourly' : 'Daily'} · {currencyMode === 'EUR' ? 'EUR · €' : 'USD · $'}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New Card
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-10 sm:px-10">
        {cards.length === 0 ? (
          <div className="border border-[#292929] py-20 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#292929]/60">
            No rate cards yet
          </div>
        ) : (
          <div className="space-y-12">
            {[
              { label: 'United States', flag: '🇺🇸', list: usCards, num: '01' },
              { label: 'France', flag: '🇫🇷', list: frCards, num: '02' },
              { label: 'England', flag: '🇬🇧', list: ukCards, num: '03' },
            ]
              .filter(g => g.list.length > 0)
              .map(group => (
                <div key={group.label}>
                  <div className="mb-4 flex items-baseline justify-between border-b border-[#292929] pb-2">
                    <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.3em] text-[#292929]">
                      {group.flag} {group.label}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/60">
                      / {group.num} · {group.list.length} cards
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-0 border border-[#292929] lg:grid-cols-2">
                    {group.list.map((card, idx) => {
                      const total = group.list.length;
                      const isLastSingle = idx === total - 1;
                      const evenLast = total % 2 === 0;
                      const isLastRowOdd = !evenLast && isLastSingle;
                      return (
                        <div
                          key={card.id}
                          className={[
                            'group/card-cell relative bg-[#ffffff]',
                            idx % 2 === 0 && idx !== total - 1 ? 'lg:border-r lg:border-r-[#292929]' : '',
                            !isLastSingle && !(isLastRowOdd) ? 'border-b border-b-[#292929]' : '',
                            idx === total - 2 && evenLast ? 'border-b-0 lg:border-b-0' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <RateCardCell
                            card={card}
                            index={idx}
                            unit={unit}
                            currencyMode={currencyMode}
                            mode={mode}
                            onEdit={() => openEdit(card)}
                            onDelete={() => handleDelete(card.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rate Card' : 'New Rate Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Acme Corp — Premium 2025"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={v => v && handleRegionChange(v as Region)}>
                <SelectTrigger className="w-full">
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
              <div className="grid grid-cols-[1fr_120px_120px] gap-3 items-baseline border-b border-[#292929] pb-2">
                <Label>Role</Label>
                <Label>Bill / {unit}</Label>
                <Label>Cost / {unit}</Label>
              </div>
              <div className="space-y-2">
                {form.roles.map(r => (
                  <div key={r.role} className="grid grid-cols-[1fr_120px_120px] gap-3 items-center">
                    <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">{r.role}</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
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
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
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

function RateCardCell({
  card,
  index,
  unit,
  currencyMode,
  mode,
  onEdit,
  onDelete,
}: {
  card: RateCard;
  index: number;
  unit: string;
  currencyMode: 'USD' | 'EUR';
  mode: 'hourly' | 'daily';
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#292929]/70">
            / {String(index + 1).padStart(2, '0')} · {REGION_FLAG[card.region]} {card.region}
          </p>
          <h3 className="mt-2 truncate text-[20px] font-light leading-tight tracking-[-0.03em] text-[#292929]">
            {card.name}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon-sm" variant="outline" onClick={onEdit} title="Edit">
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={onDelete} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 border-t border-[#292929] pt-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">Role</span>
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">Rate</span>
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">Cost</span>
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">Margin</span>
        {card.roles.map(r => {
          const margin = r.dailyRate > 0 ? ((r.dailyRate - r.dailyCost) / r.dailyRate) * 100 : 0;
          return (
            <div key={r.role} className="contents">
              <span className="text-[12px] tracking-[-0.01em] text-[#292929]">{r.role}</span>
              <span className="text-right text-[13px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">
                {formatMoney(toDisplayRate(r.dailyRate, mode), currencyMode)}
                <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#292929]/60">/{unit}</span>
              </span>
              <span className="text-right font-mono text-[11px] tabular-nums text-[#292929]/70">
                {formatMoney(toDisplayRate(r.dailyCost, mode), currencyMode)}
              </span>
              <span className="text-right font-mono text-[11px] tabular-nums text-[#292929]">
                {margin.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
