'use client';

import { CurrencyMode, RateMode } from '@/lib/types';
import { formatCurrency, toDisplayValue } from '@/lib/calculations';

type Props = {
  currentDailyRate: number;
  cardDailyRate?: number;
  currencyMode: CurrencyMode;
  rateMode: RateMode;
  showOnRate?: boolean;
};

export default function RateVarianceNote({
  currentDailyRate,
  cardDailyRate,
  currencyMode,
  rateMode,
  showOnRate = false,
}: Props) {
  if (cardDailyRate === undefined) return null;

  const variance = currentDailyRate - cardDailyRate;
  const isOnRate = Math.abs(variance) < 0.005;

  if (isOnRate) {
    return showOnRate ? <span className="mt-0.5 block truncate text-[10px] font-medium text-[#5fa07a]">On rate</span> : null;
  }

  const displayVariance = toDisplayValue(variance, rateMode, currencyMode);
  const unit = rateMode === 'hourly' ? 'hr' : 'day';
  const sign = displayVariance > 0 ? '+' : '';

  return (
    <span className={`mt-0.5 block truncate text-[10px] font-medium ${displayVariance > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
      {sign}{formatCurrency(displayVariance, currencyMode)}/{unit} vs card
    </span>
  );
}

export function OnRateColumnNote({ isHybrid }: { isHybrid: boolean }) {
  const cellsBeforeRate = isHybrid ? 5 : 4;
  const cellsAfterRate = 3;

  return (
    <div className="hidden gap-1.5 px-1 md:grid md:[grid-template-columns:var(--team-grid-template)]">
      {Array.from({ length: cellsBeforeRate }).map((_, index) => <span key={`before-${index}`} />)}
      <span className="truncate text-[10px] font-medium text-[#5fa07a]">On rate</span>
      {Array.from({ length: cellsAfterRate }).map((_, index) => <span key={`after-${index}`} />)}
    </div>
  );
}
