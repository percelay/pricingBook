'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { getRateCards, upsertRateCard, deleteRateCard } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { RateCard, ROLES, Region, CURRENCY_BY_REGION } from '@/lib/types';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FormState = {
  name: string;
  region: Region;
  roles: { role: string; dailyRate: number }[];
};

function emptyForm(): FormState {
  return {
    name: '',
    region: 'US',
    roles: ROLES.map(role => ({ role, dailyRate: 0 })),
  };
}

export default function RateCardsPage() {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  function reload() {
    seedDemoData();
    setCards(getRateCards());
  }

  useEffect(() => { reload(); }, []);

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
      roles: card.roles.map(r => ({ role: r.role, dailyRate: r.dailyRate })),
    });
    setOpen(true);
  }

  function handleRegionChange(region: Region) {
    setForm(f => ({ ...f, region }));
  }

  function handleRoleRate(role: string, value: string) {
    setForm(f => ({
      ...f,
      roles: f.roles.map(r => r.role === role ? { ...r, dailyRate: Number(value) || 0 } : r),
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
      roles: form.roles.map(r => ({ role: r.role as RateCard['roles'][0]['role'], dailyRate: r.dailyRate })),
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
  const currency = CURRENCY_BY_REGION[form.region];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Cards</h1>
          <p className="text-gray-500 mt-1">Define base daily rates by region and role</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Rate Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No rate cards yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: '🇺🇸 United States', list: usCards },
            { label: '🇫🇷 France', list: frCards },
          ]
            .filter(g => g.list.length > 0)
            .map(group => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rate Card' : 'New Rate Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. US Standard 2025"
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
                  <SelectItem value="US">🇺🇸 United States (USD)</SelectItem>
                  <SelectItem value="France">🇫🇷 France (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Rates</Label>
              <div className="space-y-2">
                {form.roles.map(r => (
                  <div key={r.role} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 shrink-0">{r.role}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {currency === 'EUR' ? '€' : '$'}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        className="pl-7"
                        value={r.dailyRate || ''}
                        onChange={e => handleRoleRate(r.role, e.target.value)}
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{card.name}</CardTitle>
            <Badge variant="outline" className="mt-1.5 text-xs font-normal">
              {card.region} · {card.currency}
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
        <div className="space-y-2">
          {card.roles.map(r => (
            <div key={r.role} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{r.role}</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {formatCurrency(r.dailyRate, card.currency)}<span className="text-gray-400 font-normal">/day</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
