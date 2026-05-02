import { LineItem, HOURS_PER_DAY, RateMode, CurrencyMode, EUR_PER_USD } from './types';

export function totalDays(item: LineItem): number {
  return item.days.reduce((s, d) => s + d, 0);
}

export function lineSubtotal(item: LineItem): number {
  return totalDays(item) * item.dailyRate;
}

export function lineCost(item: LineItem): number {
  return totalDays(item) * item.dailyCost;
}

export function isUniform(days: number[]): boolean {
  if (days.length === 0) return true;
  return days.every(d => d === days[0]);
}

export function averageDaysPerWeek(days: number[]): number {
  if (days.length === 0) return 0;
  return days.reduce((s, d) => s + d, 0) / days.length;
}

export function uniformDays(weeks: number, daysPerWeek: number): number[] {
  if (weeks <= 0) return [];
  return Array(weeks).fill(daysPerWeek);
}

export function resizeDays(days: number[], newLen: number, fillValue: number): number[] {
  if (newLen <= 0) return [];
  if (newLen <= days.length) return days.slice(0, newLen);
  return [...days, ...Array(newLen - days.length).fill(fillValue)];
}

export function setWeekDays(days: number[], weekIdx: number, value: number): number[] {
  const next = [...days];
  while (next.length <= weekIdx) next.push(0);
  next[weekIdx] = Math.max(0, value);
  return next;
}

export interface BookTotals {
  subtotal: number;
  totalDays: number;
  averageDailyRate: number;
  discountAmount: number;
  afterDiscount: number;
  markupAmount: number;
  afterMarkup: number;
  teAmount: number;
  grandTotal: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number;
}

export function calcTotals(
  lineItems: LineItem[],
  discount: number,
  markup: number,
  tePercent: number
): BookTotals {
  const subtotal = lineItems.reduce((s, i) => s + lineSubtotal(i), 0);
  const totalLineDays = lineItems.reduce((s, i) => s + totalDays(i), 0);
  const averageDailyRate = totalLineDays > 0 ? subtotal / totalLineDays : 0;
  const totalCost = lineItems.reduce((s, i) => s + lineCost(i), 0);
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const markupAmount = afterDiscount * (markup / 100);
  const afterMarkup = afterDiscount + markupAmount;
  const teAmount = afterMarkup * (tePercent / 100);
  const grandTotal = afterMarkup + teAmount;
  const grossMargin = afterMarkup - totalCost;
  const grossMarginPct = afterMarkup > 0 ? (grossMargin / afterMarkup) * 100 : 0;
  return {
    subtotal,
    totalDays: totalLineDays,
    averageDailyRate,
    discountAmount,
    afterDiscount,
    markupAmount,
    afterMarkup,
    teAmount,
    grandTotal,
    totalCost,
    grossMargin,
    grossMarginPct,
  };
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function convertFromUSD(amountUSD: number, mode: CurrencyMode): number {
  return mode === 'EUR' ? amountUSD * EUR_PER_USD : amountUSD;
}

export function convertToUSD(amount: number, mode: CurrencyMode): number {
  return mode === 'EUR' ? amount / EUR_PER_USD : amount;
}

export function formatMoney(amountUSD: number, mode: CurrencyMode): string {
  return formatCurrency(convertFromUSD(amountUSD, mode), mode);
}

export function currencySymbol(mode: CurrencyMode): string {
  return mode === 'EUR' ? '€' : '$';
}

export function toDisplayRate(dailyRate: number, mode: RateMode): number {
  return mode === 'hourly' ? dailyRate / HOURS_PER_DAY : dailyRate;
}

export function fromInputRate(value: number, mode: RateMode): number {
  return mode === 'hourly' ? value * HOURS_PER_DAY : value;
}

export function toDisplayValue(usdDaily: number, rateMode: RateMode, currencyMode: CurrencyMode): number {
  return convertFromUSD(toDisplayRate(usdDaily, rateMode), currencyMode);
}

export function fromInputValue(value: number, rateMode: RateMode, currencyMode: CurrencyMode): number {
  return fromInputRate(convertToUSD(value, currencyMode), rateMode);
}

export function rateUnit(mode: RateMode): string {
  return mode === 'hourly' ? 'hr' : 'day';
}

export function timeUnit(mode: RateMode): string {
  return mode === 'hourly' ? 'h' : 'd';
}
