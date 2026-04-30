'use client';

import { Plus, Trash2 } from 'lucide-react';
import { CurrencyMode, PhasedPricingRow } from '@/lib/types';
import { convertFromUSD, convertToUSD, currencySymbol } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
          <Plus className="mr-1.5 h-4 w-4" />
          Add phased pricing
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-700">Phased Pricing</CardTitle>
            <p className="mt-1 text-xs text-gray-400">
              Manual phase and deliverable pricing. This does not affect the pricing summary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addPhase}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add phase
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
              Remove section
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                <th className="w-20 px-2 py-2">Phase #</th>
                <th className="w-44 px-2 py-2">Phase Name</th>
                <th className="w-56 px-2 py-2">Deliverable Name</th>
                <th className="w-40 px-2 py-2">Estimated Start Date</th>
                <th className="w-40 px-2 py-2">Estimated End Date</th>
                <th className="w-36 px-2 py-2 text-right">Proposed Fee</th>
                <th className="w-44 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIdx) => {
                const isLastGroup = groupIdx === groups.length - 1;
                return group.map((row, indexInGroup) => {
                  const displayFee = convertFromUSD(row.proposedFee, currencyMode);
                  const isFirst = indexInGroup === 0;
                  const isLastInGroup = indexInGroup === group.length - 1;
                  const groupBoundary = isLastInGroup && !isLastGroup ? 'border-b border-gray-200' : '';
                  const innerBoundary = !isLastInGroup ? 'border-b border-dashed border-gray-100' : '';

                  return (
                    <tr key={row.id} className={`align-top ${groupBoundary} ${innerBoundary}`}>
                      {isFirst && (
                        <>
                          <td className="px-2 py-2 bg-gray-50/60 align-top" rowSpan={group.length}>
                            <Input
                              value={row.phaseNumber}
                              onChange={e => updateGroupField(group, 'phaseNumber', e.target.value)}
                              className="h-8 text-sm tabular-nums"
                              placeholder="1"
                            />
                          </td>
                          <td className="px-2 py-2 bg-gray-50/60 align-top" rowSpan={group.length}>
                            <Input
                              value={row.phaseName}
                              onChange={e => updateGroupField(group, 'phaseName', e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Discovery"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        <Input
                          value={row.deliverableName}
                          onChange={e => updateRow(row.id, 'deliverableName', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Executive readout"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.estimatedStartDate}
                          onChange={e => updateRow(row.id, 'estimatedStartDate', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.estimatedEndDate}
                          onChange={e => updateRow(row.id, 'estimatedEndDate', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{sym}</span>
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            value={displayFee || ''}
                            onChange={e => updateRow(row.id, 'proposedFee', convertToUSD(Number(e.target.value) || 0, currencyMode))}
                            className="h-8 pl-5 pr-2 text-right text-sm tabular-nums"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => addDeliverable(row)} className="h-8 text-xs">
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Deliverable
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRow(row.id)}
                            className="h-8 w-8 text-gray-300 hover:bg-red-50 hover:text-red-500"
                          >
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
