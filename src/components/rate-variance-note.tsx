'use client';

import { CurrencyMode, RateMode } from '@/lib/types';
import { formatCurrency, toDisplayValue } from '@/lib/calculations';

type Props = {
  currentDailyRate: number;
  cardDailyRate?: number;
  currencyMode: CurrencyMode;
  rateMode: RateMode;
};

export default function RateVarianceNote({
  currentDailyRate,
  cardDailyRate,
  currencyMode,
  rateMode,
}: Props) {
  if (cardDailyRate === undefined) return null;

  const variance = currentDailyRate - cardDailyRate;
  const isOnRate = Math.abs(variance) < 0.005;

  if (isOnRate) {
    return <span className="mt-0.5 block truncate text-[10px] font-medium text-[#5fa07a]">On rate</span>;
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
