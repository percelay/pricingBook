'use client';

import { LineItem, Role } from '@/lib/types';
import { totalDays } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_COLORS: Record<Role, { bar: string; dot: string; label: string }> = {
  'Partner':           { bar: 'bg-slate-700',   dot: 'bg-slate-700',   label: 'text-slate-700' },
  'Senior Manager':    { bar: 'bg-blue-600',    dot: 'bg-blue-600',    label: 'text-blue-600' },
  'Manager':           { bar: 'bg-emerald-600', dot: 'bg-emerald-600', label: 'text-emerald-600' },
  'Senior Consultant': { bar: 'bg-amber-500',   dot: 'bg-amber-500',   label: 'text-amber-600' },
  'Consultant':        { bar: 'bg-violet-600',  dot: 'bg-violet-600',  label: 'text-violet-600' },
};

export default function EngagementTimeline({ lineItems }: { lineItems: LineItem[] }) {
  if (lineItems.length === 0 || lineItems.every(i => i.weeks === 0)) return null;

  const totalWeeks = Math.max(...lineItems.map(i => i.startWeek + i.weeks - 1), 4);

  // Label every nth week depending on length
  const labelEvery = totalWeeks <= 8 ? 1 : totalWeeks <= 16 ? 2 : totalWeeks <= 32 ? 4 : 8;

  const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">Engagement Timeline</CardTitle>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{totalWeeks} weeks</span>
            <span>{lineItems.reduce((s, i) => s + totalDays(i), 0)} total days</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week number header */}
        <div className="flex items-center mb-2">
          <div className="w-40 shrink-0" />
          <div className="flex-1 relative h-5">
            {weekNumbers.map(w => (
              (w === 1 || w % labelEvery === 0) ? (
                <span
                  key={w}
                  className="absolute text-xs text-gray-400 -translate-x-1/2 select-none"
                  style={{ left: `${((w - 0.5) / totalWeeks) * 100}%` }}
                >
                  W{w}
                </span>
              ) : null
            ))}
          </div>
        </div>

        {/* Gantt rows */}
        <div className="space-y-2">
          {lineItems.map(item => {
            const colors = ROLE_COLORS[item.role];
            const startPct = ((item.startWeek - 1) / totalWeeks) * 100;
            const widthPct = (item.weeks / totalWeeks) * 100;
            const days = totalDays(item);

            return (
              <div key={item.id} className="flex items-center">
                <div className="w-40 shrink-0 text-sm text-gray-600 truncate pr-4 text-right">
                  {item.role}
                </div>
                <div className="flex-1 relative h-9 bg-gray-100 rounded-md overflow-hidden">
                  {/* Week grid lines */}
                  {weekNumbers.slice(0, -1).map(w => (
                    <div
                      key={w}
                      className="absolute inset-y-0 w-px bg-white/70"
                      style={{ left: `${(w / totalWeeks) * 100}%` }}
                    />
                  ))}
                  {/* Bar */}
                  {item.weeks > 0 && (
                    <div
                      className={`absolute inset-y-1.5 rounded ${colors.bar} flex items-center overflow-hidden`}
                      style={{
                        left: `calc(${startPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <span className="text-white text-xs font-medium px-2.5 whitespace-nowrap overflow-hidden">
                        {item.weeks}w · {item.daysPerWeek}d/wk
                        {widthPct > 20 && ` = ${days}d`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-4 border-t border-gray-100">
          {lineItems.map(item => {
            const colors = ROLE_COLORS[item.role];
            const days = totalDays(item);
            return (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${colors.dot}`} />
                <span className={`font-semibold ${colors.label}`}>{item.role}</span>
                <span className="text-gray-400">
                  Wk {item.startWeek}–{item.startWeek + item.weeks - 1} · {item.weeks}w · {days}d
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
