'use client';

import { useState, useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { LineItem, Role, HOURS_PER_DAY } from '@/lib/types';
import { totalDays, setWeekDays, timeUnit } from '@/lib/calculations';
import { useRateMode } from '@/lib/rate-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ROLE_FILL: Record<Role, string> = {
  'Partner':           'bg-[#000000]',
  'Senior Manager':    'bg-[#292929]',
  'Manager':           'bg-[#595959]',
  'Senior Consultant': 'bg-[#8c8c8c]',
  'Consultant':        'bg-[#bfbfbf]',
  'Contractor':        'bg-[#ffffff] border border-[#292929]',
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
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Weekly Allocation · 04</CardTitle>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">
            <span>{totalWeeks} Wk · {mode === 'hourly' ? totalLineDays * HOURS_PER_DAY : totalLineDays} {mode === 'hourly' ? 'Hr' : 'D'}</span>
            <div className="flex items-center gap-1">
              <Button size="icon-xs" variant="outline" onClick={removeWeek} disabled={totalWeeks <= minWeeks}>
                <Minus className="h-3 w-3" />
              </Button>
              <Button size="icon-xs" variant="outline" onClick={addWeek}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {onRemoveSection && (
              <Button size="sm" variant="ghost" onClick={onRemoveSection}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <p className="py-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#292929]/60">
            Add a role to start allocating time
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="inline-grid items-center"
              style={{
                gridTemplateColumns: `${nameColWidth}px repeat(${totalWeeks}, ${cellWidth}px) ${totalColWidth}px`,
              }}
            >
              {/* Header row */}
              <div className="border-b border-[#292929] px-2 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">
                Role / Consultant
              </div>
              {Array.from({ length: totalWeeks }, (_, i) => (
                <div key={i} className="border-b border-[#292929] py-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#292929]/70">
                  W{String(i + 1).padStart(2, '0')}
                </div>
              ))}
              <div className="border-b border-[#292929] py-2 pr-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]/70">
                Total
              </div>

              {/* Item rows */}
              {lineItems.map(item => {
                const days = totalDays(item);
                const display = mode === 'hourly' ? days * HOURS_PER_DAY : days;
                return (
                  <div key={item.id} className="contents">
                    <div className="flex items-center gap-2 px-2 py-2 min-w-0 border-b border-[#292929]/30">
                      <span className={`h-2 w-2 shrink-0 ${ROLE_FILL[item.role]}`} />
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] uppercase tracking-[0.15em] text-[#292929]">
                          {item.role}
                        </div>
                        <div className="truncate text-[12px] tracking-[-0.02em] text-[#292929]/70">
                          {item.name || '—'}
                        </div>
                      </div>
                    </div>
                    {Array.from({ length: totalWeeks }, (_, w) => {
                      const dayVal = item.days[w] ?? 0;
                      const cellDisplay = mode === 'hourly' ? dayVal * HOURS_PER_DAY : dayVal;
                      return (
                        <div key={w} className="border-b border-[#292929]/30 px-0.5 py-1.5">
                          <input
                            type="number"
                            min={0}
                            max={mode === 'hourly' ? 56 : 7}
                            step={mode === 'hourly' ? 1 : 0.5}
                            value={cellDisplay || ''}
                            onChange={e => updateCell(item.id, w, Number(e.target.value) || 0)}
                            placeholder="—"
                            className="h-7 w-full border border-[#292929] bg-[#ffffff] text-center text-[11px] tabular-nums text-[#000000] placeholder:text-[#292929]/30 focus:outline focus:outline-1 focus:outline-offset-1 focus:outline-[#292929] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      );
                    })}
                    <div className="border-b border-[#292929]/30 pr-2 py-2 text-right text-[14px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">
                      {display}{unit}
                    </div>
                  </div>
                );
              })}

              {/* Footer row — per-week totals */}
              <div className="px-2 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#292929]">
                Per Week
              </div>
              {Array.from({ length: totalWeeks }, (_, w) => {
                const wkTotal = lineItems.reduce((s, item) => s + (item.days[w] ?? 0), 0);
                const wkDisplay = mode === 'hourly' ? wkTotal * HOURS_PER_DAY : wkTotal;
                return (
                  <div key={w} className="pt-3 text-center font-mono text-[11px] tabular-nums text-[#292929]/70">
                    {wkDisplay || ''}
                  </div>
                );
              })}
              <div className="pt-3 pr-2 text-right text-[14px] font-light tabular-nums tracking-[-0.02em] text-[#292929]">
                {mode === 'hourly' ? totalLineDays * HOURS_PER_DAY : totalLineDays}{unit}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
