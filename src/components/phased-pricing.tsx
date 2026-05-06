'use client';

import { Plus, Trash2 } from 'lucide-react';
import { CurrencyMode, PhasedPricingRow } from '@/lib/types';
import { convertFromUSD, convertToUSD, currencySymbol } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  rows?: PhasedPricingRow[];
  currencyMode: CurrencyMode;
  onChange: (rows: PhasedPricingRow[] | undefined) => void;
}

function createPhasedPricingRow(seed: Partial<PhasedPricingRow> = {}): PhasedPricingRow {
  return {
    id: crypto.randomUUID(),
    phaseNumber: seed.phaseNumber ?? '1',
    phaseName: seed.phaseName ?? '',
    deliverableName: seed.deliverableName ?? '',
    estimatedStartDate: seed.estimatedStartDate ?? '',
    estimatedEndDate: seed.estimatedEndDate ?? '',
    proposedFee: seed.proposedFee ?? 0,
  };
}

function nextPhaseNumber(rows: PhasedPricingRow[]): string {
  const numeric = rows
    .map(row => Number(row.phaseNumber))
    .filter(value => Number.isFinite(value));

  if (numeric.length === 0) return String(rows.length + 1);
  return String(Math.max(...numeric) + 1);
}

export default function PhasedPricing({ rows, currencyMode, onChange }: Props) {
  const phasedRows = rows ?? [];
  const sym = currencySymbol(currencyMode);

  const groups: PhasedPricingRow[][] = [];
  for (const row of phasedRows) {
    const last = groups[groups.length - 1];
    if (last && last[0].phaseNumber === row.phaseNumber && last[0].phaseName === row.phaseName) {
      last.push(row);
    } else {
      groups.push([row]);
    }
  }

  function updateRow<K extends keyof PhasedPricingRow>(rowId: string, field: K, value: PhasedPricingRow[K]) {
    onChange(phasedRows.map(row => (row.id === rowId ? { ...row, [field]: value } : row)));
  }

  function updateGroupField(group: PhasedPricingRow[], field: 'phaseNumber' | 'phaseName', value: string) {
    const ids = new Set(group.map(r => r.id));
    onChange(phasedRows.map(row => (ids.has(row.id) ? { ...row, [field]: value } : row)));
  }

  function removeRow(rowId: string) {
    const next = phasedRows.filter(row => row.id !== rowId);
    onChange(next.length > 0 ? next : undefined);
  }

  function addDeliverable(row: PhasedPricingRow) {
    const index = phasedRows.findIndex(item => item.id === row.id);
    const deliverable = createPhasedPricingRow({
      phaseNumber: row.phaseNumber,
      phaseName: row.phaseName,
    });
    if (index < 0) {
      onChange([...phasedRows, deliverable]);
      return;
    }
    onChange([
      ...phasedRows.slice(0, index + 1),
      deliverable,
      ...phasedRows.slice(index + 1),
    ]);
  }

  function addPhase() {
    onChange([...phasedRows, createPhasedPricingRow({ phaseNumber: nextPhaseNumber(phasedRows) })]);
  }

  if (phasedRows.length === 0) {
    return (
      <div>
        <Button variant="outline" onClick={() => onChange([createPhasedPricingRow()])}>
          <Plus className="h-3.5 w-3.5" />
          Add Phased Pricing
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Phased Pricing · 05</CardTitle>
            <p className="mt-2 text-[12px] tracking-[-0.02em] text-[#292929]/70">
              Manual phase and deliverable pricing. Does not affect the pricing summary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addPhase}>
              <Plus className="h-3.5 w-3.5" />
              Add Phase
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 md:hidden">
          {groups.map((group, groupIdx) =>
            group.map((row, indexInGroup) => {
              const displayFee = convertFromUSD(row.proposedFee, currencyMode);
              const isFirst = indexInGroup === 0;

              return (
                <div key={row.id} className="space-y-2 border border-[#292929] p-3">
                  {isFirst && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[64px_minmax(0,1fr)]">
                      <div className="space-y-1">
                        <Label>Phase #</Label>
                        <Input
                          value={row.phaseNumber}
                          onChange={e => updateGroupField(group, 'phaseNumber', e.target.value)}
                          className="h-8 px-2 tabular-nums"
                          placeholder="1"
                          aria-label={`Phase number ${groupIdx + 1}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Phase Name</Label>
                        <Input
                          value={row.phaseName}
                          onChange={e => updateGroupField(group, 'phaseName', e.target.value)}
                          className="h-8"
                          placeholder="Discovery"
                          aria-label={`Phase name ${groupIdx + 1}`}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>Deliverable</Label>
                    <Input
                      value={row.deliverableName}
                      onChange={e => updateRow(row.id, 'deliverableName', e.target.value)}
                      className="h-8"
                      placeholder="Executive readout"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Est. Start</Label>
                      <Input
                        type="date"
                        value={row.estimatedStartDate}
                        onChange={e => updateRow(row.id, 'estimatedStartDate', e.target.value)}
                        className="h-8 px-2 text-[12px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Est. End</Label>
                      <Input
                        type="date"
                        value={row.estimatedEndDate}
                        onChange={e => updateRow(row.id, 'estimatedEndDate', e.target.value)}
                        className="h-8 px-2 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_36px_36px] gap-2">
                    <div className="space-y-1">
                      <Label>Proposed Fee</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={displayFee || ''}
                          onChange={e => updateRow(row.id, 'proposedFee', convertToUSD(Number(e.target.value) || 0, currencyMode))}
                          className="h-8 pl-5 text-right tabular-nums"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <Button variant="outline" size="icon-sm" onClick={() => addDeliverable(row)} className="mt-6" title="Add deliverable">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => removeRow(row.id)} className="mt-6">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden w-full overflow-hidden md:block">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#292929] text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">
                <th className="w-[64px] px-2 py-2 font-medium">Phase</th>
                <th className="w-[140px] px-2 py-2 font-medium">Phase Name</th>
                <th className="px-2 py-2 font-medium">Deliverable</th>
                <th className="w-[124px] px-2 py-2 font-medium">Start</th>
                <th className="w-[124px] px-2 py-2 font-medium">End</th>
                <th className="w-[120px] px-2 py-2 font-medium text-right">Fee</th>
                <th className="w-[80px] px-2 py-2 font-medium text-right">·</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIdx) => {
                const isLastGroup = groupIdx === groups.length - 1;
                return group.map((row, indexInGroup) => {
                  const displayFee = convertFromUSD(row.proposedFee, currencyMode);
                  const isFirst = indexInGroup === 0;
                  const isLastInGroup = indexInGroup === group.length - 1;
                  const groupBoundary = isLastInGroup && !isLastGroup ? 'border-b border-[#292929]' : '';
                  const innerBoundary = !isLastInGroup ? 'border-b border-dashed border-[#292929]/40' : '';

                  return (
                    <tr key={row.id} className={`align-top ${groupBoundary} ${innerBoundary}`}>
                      {isFirst && (
                        <>
                          <td className="px-2 py-2 align-top" rowSpan={group.length}>
                            <Input
                              value={row.phaseNumber}
                              onChange={e => updateGroupField(group, 'phaseNumber', e.target.value)}
                              className="h-8 px-2 tabular-nums"
                              placeholder="1"
                            />
                          </td>
                          <td className="px-2 py-2 align-top" rowSpan={group.length}>
                            <Input
                              value={row.phaseName}
                              onChange={e => updateGroupField(group, 'phaseName', e.target.value)}
                              className="h-8"
                              placeholder="Discovery"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        <Input
                          value={row.deliverableName}
                          onChange={e => updateRow(row.id, 'deliverableName', e.target.value)}
                          className="h-8"
                          placeholder="Executive readout"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.estimatedStartDate}
                          onChange={e => updateRow(row.id, 'estimatedStartDate', e.target.value)}
                          className="h-8 px-2 text-[12px]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.estimatedEndDate}
                          onChange={e => updateRow(row.id, 'estimatedEndDate', e.target.value)}
                          className="h-8 px-2 text-[12px]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#292929]/60">{sym}</span>
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            value={displayFee || ''}
                            onChange={e => updateRow(row.id, 'proposedFee', convertToUSD(Number(e.target.value) || 0, currencyMode))}
                            className="h-8 pl-5 text-right tabular-nums"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="icon-sm" onClick={() => addDeliverable(row)} title="Add deliverable">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => removeRow(row.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
