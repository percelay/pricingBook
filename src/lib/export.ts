import * as XLSX from 'xlsx';
import { PricingBook } from './types';
import { lineSubtotal, calcTotals, totalDays } from './calculations';

export function exportBookToExcel(book: PricingBook): void {
  const currency = book.region === 'France' ? 'EUR' : 'USD';
  const { subtotal, discountAmount, markupAmount, grandTotal } = calcTotals(
    book.lineItems, book.discount, book.markup
  );

  const data: (string | number)[][] = [
    ['Client', book.client, '', 'Engagement', book.engagement],
    ['Region', book.region, '', 'Currency', currency],
    ['Rate Card', book.baseRateCardName, '', 'Status', book.status],
    ['Date', new Date().toLocaleDateString()],
    [],
    ['Role', 'Start Week', 'Weeks', 'Days/Week', 'Total Days', 'Daily Rate', 'Expenses', 'Travel', 'Subtotal'],
    ...book.lineItems.map(item => [
      item.role,
      item.startWeek,
      item.weeks,
      item.daysPerWeek,
      totalDays(item),
      item.dailyRate,
      item.expenses,
      item.travel,
      lineSubtotal(item),
    ]),
    [],
    ['', '', '', '', '', '', '', 'Subtotal', subtotal],
  ];

  if (book.discount > 0) {
    data.push(['', '', '', '', '', '', '', `Discount (${book.discount}%)`, -discountAmount]);
  }
  if (book.markup > 0) {
    data.push(['', '', '', '', '', '', '', `Markup (${book.markup}%)`, markupAmount]);
  }
  data.push(['', '', '', '', '', '', '', 'GRAND TOTAL', grandTotal]);

  if (book.notes) {
    data.push([], ['Notes', book.notes]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pricing');

  XLSX.writeFile(wb, `${book.client} - ${book.engagement}.xlsx`);
}
