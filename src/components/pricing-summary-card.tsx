'use client';

import { Target, TrendingUp } from 'lucide-react';
import { BookTotals, convertFromUSD, convertToUSD, currencySymbol, formatMoney } from '@/lib/calculations';
import { CurrencyMode, PricingAssumptionMode, TARGET_MARGIN_PCT } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  totals: BookTotals;
  currencyMode: CurrencyMode;
  mode: PricingAssumptionMode;
  onModeChange: (mode: PricingAssumptionMode) => void;
  discount: number;
  markup: number;
  tePercent: number;
  discountFlat?: number;
  markupFlat?: number;
  teFlat?: number;
  onDiscountChange: (value: number) => void;
  onMarkupChange: (value: number) => void;
  onTeChange: (value: number) => void;
  onDiscountFlatChange: (value: number) => void;
  onMarkupFlatChange: (value: number) => void;
  onTeFlatChange: (value: number) => void;
  showProfitability?: boolean;
};

export default function PricingSummaryCard({
  totals,
  currencyMode,
  mode,
  onModeChange,
  discount,
  markup,
  tePercent,
  discountFlat = 0,
  markupFlat = 0,
  teFlat = 0,
  onDiscountChange,
  onMarkupChange,
  onTeChange,
  onDiscountFlatChange,
  onMarkupFlatChange,
  onTeFlatChange,
  showProfitability = false,
}: Props) {
  const sym = currencySymbol(currencyMode);

  return (
    <>
      <Card className="ring-2 ring-gray-900/15">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Pricing Summary</CardTitle>
            <div className="flex border border-gray-200 bg-white p-0.5">
              <Button
                type="button"
                variant={mode === 'percent' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('percent')}
                className="h-6 px-2 text-xs"
              >
                %
              </Button>
              <Button
                type="button"
                variant={mode === 'flat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('flat')}
                className="h-6 px-2 text-xs"
              >
                Flat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {mode === 'percent' ? (
              <>
                <PercentInput label="Discount %" value={discount} onChange={onDiscountChange} />
                <PercentInput label="Markup %" value={markup} onChange={onMarkupChange} />
                <PercentInput label="T&E %" value={tePercent} onChange={onTeChange} />
              </>
            ) : (
              <>
                <MoneyInput label="Discount" symbol={sym} value={discountFlat} currencyMode={currencyMode} onChange={onDiscountFlatChange} />
                <MoneyInput label="Markup" symbol={sym} value={markupFlat} currencyMode={currencyMode} onChange={onMarkupFlatChange} />
                <MoneyInput label="T&E" symbol={sym} value={teFlat} currencyMode={currencyMode} onChange={onTeFlatChange} />
              </>
            )}
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <SummaryLine label="Subtotal" value={formatMoney(totals.subtotal, currencyMode)} />
            {totals.discountAmount > 0 && (
              <SummaryLine
                label={mode === 'percent' ? `Discount (${discount}%)` : 'Discount'}
                value={`-${formatMoney(totals.discountAmount, currencyMode)}`}
              />
            )}
            {totals.markupAmount > 0 && (
              <SummaryLine
                label={mode === 'percent' ? `Markup (${markup}%)` : 'Markup'}
                value={`+${formatMoney(totals.markupAmount, currencyMode)}`}
                emphasized
              />
            )}
            {totals.teAmount > 0 && (
              <SummaryLine
                label={mode === 'percent' ? `T&E (${tePercent}%)` : 'T&E'}
                value={`+${formatMoney(totals.teAmount, currencyMode)}`}
                emphasized
              />
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(totals.grandTotal, currencyMode)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {showProfitability && (
        <ProfitabilityCard totals={totals} currencyMode={currencyMode} mode={mode} />
      )}
    </>
  );
}

function ProfitabilityCard({
  totals,
  currencyMode,
  mode,
}: {
  totals: BookTotals;
  currencyMode: CurrencyMode;
  mode: PricingAssumptionMode;
}) {
  const targetMargin = totals.afterMarkup * (TARGET_MARGIN_PCT / 100);
  const targetDelta = totals.grossMargin - targetMargin;
  const aboveTarget = targetDelta >= 0;

  return (
    <Card className="bg-white ring-2 ring-[#77BB91]/35">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-[#5fa07a]" />
          Profitability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <SummaryLine label="Net Fees" value={formatMoney(totals.afterMarkup, currencyMode)} />
        <SummaryLine label="Internal Cost" value={`-${formatMoney(totals.totalCost, currencyMode)}`} />
        <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-zinc-200">
          <span>Gross Margin</span>
          <span className="tabular-nums">{formatMoney(totals.grossMargin, currencyMode)}</span>
        </div>
        <SummaryLine label="Average Daily Rate (ADR)" value={formatMoney(totals.averageDailyRate, currencyMode)} />
        {mode === 'percent' ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Target className="h-3 w-3" /> Target {TARGET_MARGIN_PCT}%
              </span>
              <span className={`tabular-nums text-base font-bold ${aboveTarget ? 'text-[#5fa07a]' : 'text-red-500'}`}>
                {totals.grossMarginPct.toFixed(1)}%
              </span>
            </div>
            <div className={`text-[11px] text-right font-medium ${aboveTarget ? 'text-[#5fa07a]' : 'text-red-500'}`}>
              {aboveTarget ? '+' : ''}{(totals.grossMarginPct - TARGET_MARGIN_PCT).toFixed(1)} pts vs target
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Target className="h-3 w-3" /> Target margin
              </span>
              <span className="tabular-nums text-sm font-semibold text-gray-700">
                {formatMoney(targetMargin, currencyMode)}
              </span>
            </div>
            <div className={`text-[11px] text-right font-medium ${aboveTarget ? 'text-[#5fa07a]' : 'text-red-500'}`}>
              {aboveTarget ? '+' : ''}{formatMoney(targetDelta, currencyMode)} vs target
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PercentInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} placeholder="0" className="h-8 text-sm tabular-nums" />
    </div>
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
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{symbol}</span>
        <Input
          type="number"
          min={0}
          value={convertFromUSD(value, currencyMode) || ''}
          onChange={e => onChange(convertToUSD(Number(e.target.value) || 0, currencyMode))}
          placeholder="0"
          className="h-8 pl-5 text-sm tabular-nums"
        />
      </div>
    </div>
  );
}

function SummaryLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={`flex justify-between ${emphasized ? 'text-gray-700' : 'text-gray-500'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
