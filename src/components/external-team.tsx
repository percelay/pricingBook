'use client';

import { Plus, Trash2, UsersRound } from 'lucide-react';
import { CurrencyMode, ExternalTeamRow } from '@/lib/types';
import { convertFromUSD, convertToUSD, currencySymbol, formatMoney } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  rows?: ExternalTeamRow[];
  currencyMode: CurrencyMode;
  onChange: (rows: ExternalTeamRow[] | undefined) => void;
};

function createExternalTeamRow(seed: Partial<ExternalTeamRow> = {}): ExternalTeamRow {
  return {
    id: crypto.randomUUID(),
    name: seed.name ?? '',
    role: seed.role ?? '',
    description: seed.description ?? '',
    price: seed.price ?? 0,
    cost: seed.cost ?? 0,
  };
}

function externalTotals(rows: ExternalTeamRow[]) {
  const price = rows.reduce((sum, row) => sum + row.price, 0);
  const cost = rows.reduce((sum, row) => sum + row.cost, 0);
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;
  return { price, cost, margin, marginPct };
}

export default function ExternalTeam({ rows, currencyMode, onChange }: Props) {
  const externalRows = rows ?? [];
  const sym = currencySymbol(currencyMode);
  const totals = externalTotals(externalRows);

  function addRow() {
    onChange([...externalRows, createExternalTeamRow()]);
  }

  function removeRow(id: string) {
    const next = externalRows.filter(row => row.id !== id);
    onChange(next.length > 0 ? next : undefined);
  }

  function updateRow<K extends keyof ExternalTeamRow>(id: string, field: K, value: ExternalTeamRow[K]) {
    onChange(externalRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  if (externalRows.length === 0) {
    return (
      <Button variant="ghost" onClick={() => onChange([createExternalTeamRow()])} className="border border-gray-200 text-gray-500 hover:border-[#77BB91]/50 hover:text-gray-800">
        <Plus className="mr-1.5 h-4 w-4" />
        Add external team
      </Button>
    );
  }

  return (
    <Card className="ring-2 ring-[#77BB91]/45">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <UsersRound className="h-4 w-4 text-[#5fa07a]" />
              External Team
            </CardTitle>
            <p className="mt-1 text-xs text-gray-400">
              Subcontractor price and cost. These margins stay separate from the pricing summary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)} className="text-gray-400 hover:bg-red-50 hover:text-red-600">
              Remove section
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-3">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.68fr)_minmax(0,0.68fr)_28px] gap-2 px-1 md:grid">
              {['Name', 'Role', 'Description', 'Price', 'Cost', ''].map(label => (
                <span key={label} className="truncate text-xs font-medium text-gray-400">{label}</span>
              ))}
            </div>
            {externalRows.map(row => (
              <div key={row.id} className="grid grid-cols-1 gap-2 border border-gray-100 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.68fr)_minmax(0,0.68fr)_28px] md:border-0 md:p-0">
                <div className="space-y-1 md:space-y-0">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 md:hidden">Name</Label>
                  <Input value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} placeholder="Vendor or person" className="h-8 min-w-0 text-sm" />
                </div>
                <div className="space-y-1 md:space-y-0">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 md:hidden">Role</Label>
                  <Input value={row.role} onChange={e => updateRow(row.id, 'role', e.target.value)} placeholder="Specialist" className="h-8 min-w-0 text-sm" />
                </div>
                <div className="space-y-1 md:space-y-0">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 md:hidden">Description</Label>
                  <Input value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} placeholder="Scope" className="h-8 min-w-0 text-sm" />
                </div>
                <MoneyInput
                  label="Price"
                  symbol={sym}
                  value={row.price}
                  currencyMode={currencyMode}
                  onChange={value => updateRow(row.id, 'price', value)}
                />
                <MoneyInput
                  label="Cost"
                  symbol={sym}
                  value={row.cost}
                  currencyMode={currencyMode}
                  onChange={value => updateRow(row.id, 'cost', value)}
                />
                <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)} className="h-8 w-8 text-gray-300 hover:bg-red-50 hover:text-red-500 md:h-7 md:w-7">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border border-gray-200 bg-gray-50 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">External Margins</p>
            <div className="space-y-2 text-sm">
              <SummaryLine label="Price" value={formatMoney(totals.price, currencyMode)} />
              <SummaryLine label="Cost" value={`-${formatMoney(totals.cost, currencyMode)}`} />
              <div className="border-t border-gray-200 pt-2">
                <SummaryLine label="Margin" value={formatMoney(totals.margin, currencyMode)} strong />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Margin %</span>
                <span className={`text-base font-bold tabular-nums ${totals.marginPct >= 0 ? 'text-[#5fa07a]' : 'text-red-500'}`}>
                  {totals.marginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MoneyInput({
  label,
  symbol,
  value,
  currencyMode,
  onChange,
}: {
  label: string;
  symbol: string;
  value: number;
  currencyMode: CurrencyMode;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1 md:space-y-0">
      <Label className="text-[10px] uppercase tracking-wider text-gray-400 md:hidden">{label}</Label>
      <div className="relative min-w-0">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{symbol}</span>
        <Input
          type="number"
          min={0}
          step={100}
          value={convertFromUSD(value, currencyMode) || ''}
          onChange={e => onChange(convertToUSD(Number(e.target.value) || 0, currencyMode))}
          className="h-8 min-w-0 pl-5 pr-1 text-right text-sm tabular-nums"
          placeholder="0"
        />
      </div>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
