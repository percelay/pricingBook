import { LineItem } from './types';

export function lineSubtotal(item: LineItem): number {
  return item.days * item.dailyRate + item.expenses + item.travel;
}

export interface BookTotals {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  markupAmount: number;
  grandTotal: number;
}

export function calcTotals(
  lineItems: LineItem[],
  discount: number,
  markup: number
): BookTotals {
  const subtotal = lineItems.reduce((s, i) => s + lineSubtotal(i), 0);
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const markupAmount = afterDiscount * (markup / 100);
  const grandTotal = afterDiscount + markupAmount;
  return { subtotal, discountAmount, afterDiscount, markupAmount, grandTotal };
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
