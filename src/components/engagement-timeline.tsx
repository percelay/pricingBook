'use client';

import { useState, useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { LineItem, Role, HOURS_PER_DAY } from '@/lib/types';
import { totalDays, setWeekDays, timeUnit } from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ROLE_COLORS: Record<Role, string> = {
  'Partner':           'bg-black',
  'Senior Manager':    'bg-zinc-700',
  'Manager':           'bg-zinc-500',
  'Senior Consultant': 'bg-[#77BB91]',
  'Consultant':        'bg-zinc-300',
  'Contractor':        'bg-amber-400',
};

interface Props {
  lineItems: LineItem[];
  onChangeDays: (id: string, days: number[]) => void;
  onRemoveSection?: () => void;
}

export default function EditableTimeline({ lineItems, onChangeDays, onRemoveSection }: Props) {
  const { mode } = useRateMode();
  const [extraWeeks, setExtraWeeks] = useState(0);

  const maxLen = useMemo(
    () => lineItems.reduce((m, i) => Math.max(m, i.days.length), 0),
    [lineItems]
  );
  const minWeeks = 4;
  const totalWeeks = Math.max(maxLen + extraWeeks, minWeeks);
  const unit = timeUnit(mode);

  function updateCell(id: string, weekIdx: number, displayValue: number) {
    const item = lineItems.find(i => i.id === id);
    if (!item) return;
    const daysVal = mode === 'hourly' ? displayValue / HOURS_PER_DAY : displayValue;
    onChangeDays(id, setWeekDays(item.days, weekIdx, daysVal));
  }

  function addWeek() {
    setExtraWeeks(w => w + 1);
  }
  function removeWeek() {
    if (totalWeeks <= minWeeks) return;
    if (extraWeeks > 0) {
      setExtraWeeks(w => w - 1);
      return;
    }
    lineItems.forEach(item => {
      if (item.days.length === totalWeeks) {
        onChangeDays(item.id, item.days.slice(0, totalWeeks - 1));
      }
    });
  }

  const totalLineDays = lineItems.reduce((s, i) => s + totalDays(i), 0);
  const cellWidth = 40;
  const nameColWidth = 220;
  const totalColWidth = 64;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">Weekly Allocation</CardTitle>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{totalWeeks} weeks · {mode === 'hourly' ? totalLineDays * HOURS_PER_DAY : totalLineDays} total {mode === 'hourly' ? 'hours' : 'days'}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={removeWeek} disabled={totalWeeks <= minWeeks}>
                <Minus className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addWeek}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {onRemoveSection && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemoveSection}
                className="h-7 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                Remove section
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">Add a role to start allocating time</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="inline-grid items-center"
              style={{
                gridTemplateColumns: `${nameColWidth}px repeat(${totalWeeks}, ${cellWidth}px) ${totalColWidth}px`,
              }}
            >
              {/* Header row */}
              <div className="text-xs font-medium text-gray-400 px-2">Role / Consultant</div>
              {Array.from({ length: totalWeeks }, (_, i) => (
                <div key={i} className="text-xs font-medium text-gray-400 text-center">W{i + 1}</div>
              ))}
              <div className="text-xs font-medium text-gray-400 text-right pr-2">Total</div>

              {/* Item rows */}
              {lineItems.map(item => {
                const days = totalDays(item);
                const display = mode === 'hourly' ? days * HOURS_PER_DAY : days;
                return (
                  <div key={item.id} className="contents">
                    <div className="px-2 py-1.5 flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_COLORS[item.role]}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{item.role}</div>
                        <div className="text-xs text-gray-400 truncate">{item.name || '—'}</div>
                      </div>
                    </div>
                    {Array.from({ length: totalWeeks }, (_, w) => {
                      const dayVal = item.days[w] ?? 0;
                      const cellDisplay = mode === 'hourly' ? dayVal * HOURS_PER_DAY : dayVal;
                      return (
                        <div key={w} className="px-0.5 py-1">
                          <input
                            type="number"
                            min={0}
                            max={mode === 'hourly' ? 56 : 7}
                            step={mode === 'hourly' ? 1 : 0.5}
                            value={cellDisplay || ''}
                            onChange={e => updateCell(item.id, w, Number(e.target.value) || 0)}
                            placeholder="—"
                            className="w-full h-7 text-center text-xs tabular-nums border border-gray-200 rounded focus:border-[#77BB91] focus:outline-none focus:ring-1 focus:ring-[#77BB91]/30 placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      );
                    })}
                    <div className="text-right text-sm font-semibold text-gray-900 tabular-nums pr-2">
                      {display}{unit}
                    </div>
                  </div>
                );
              })}

              {/* Footer row — per-week totals */}
              <div className="text-xs font-medium text-gray-500 px-2 pt-2 border-t border-gray-100 mt-1">Per week</div>
              {Array.from({ length: totalWeeks }, (_, w) => {
                const wkTotal = lineItems.reduce((s, item) => s + (item.days[w] ?? 0), 0);
                const wkDisplay = mode === 'hourly' ? wkTotal * HOURS_PER_DAY : wkTotal;
                return (
                  <div key={w} className="text-xs text-center text-gray-500 tabular-nums pt-2 border-t border-gray-100 mt-1">
                    {wkDisplay || ''}
                  </div>
                );
              })}
              <div className="text-right text-xs font-bold text-gray-700 tabular-nums pr-2 pt-2 border-t border-gray-100 mt-1">
                {mode === 'hourly' ? totalLineDays * HOURS_PER_DAY : totalLineDays}{unit}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
