import * as XLSX from 'xlsx';
import { PricingBook } from './types';
import { lineSubtotal, lineCost, calcTotals, totalDays } from './calculations';

export function exportBookToExcel(book: PricingBook): void {
  const currency = 'USD';
  const totals = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const maxWeeks = book.lineItems.reduce((m, i) => Math.max(m, i.days.length), 0);

  const data: (string | number)[][] = [
    ['Client', book.client, '', 'Engagement', book.engagement],
    ['Region', book.region, '', 'Currency', currency],
    ['Rate Card', book.baseRateCardName, '', 'Status', book.status],
    ['Date', new Date().toLocaleDateString()],
    [],
    ['Role', 'Consultant', 'Total Days', 'Daily Rate', 'Daily Cost', 'Subtotal', 'Cost', 'Margin'],
    ...book.lineItems.map(item => {
      const sub = lineSubtotal(item);
      const cost = lineCost(item);
      return [
        item.role,
        item.name || '',
        totalDays(item),
        item.dailyRate,
        item.dailyCost,
        sub,
        cost,
        sub - cost,
      ];
    }),
    [],
    ['', '', '', '', '', 'Subtotal', '', totals.subtotal],
  ];

  if (book.discount > 0) {
    data.push(['', '', '', '', '', `Discount (${book.discount}%)`, '', -totals.discountAmount]);
  }
  if (book.markup > 0) {
    data.push(['', '', '', '', '', `Markup (${book.markup}%)`, '', totals.markupAmount]);
  }
  if (book.tePercent > 0) {
    data.push(['', '', '', '', '', `T&E (${book.tePercent}%)`, '', totals.teAmount]);
  }
  data.push(['', '', '', '', '', 'GRAND TOTAL', '', totals.grandTotal]);
  data.push([]);
  data.push(['', '', '', '', '', 'Internal Cost', '', totals.totalCost]);
  data.push(['', '', '', '', '', 'Gross Margin', '', totals.grossMargin]);
  data.push(['', '', '', '', '', 'Gross Margin %', '', `${totals.grossMarginPct.toFixed(1)}%`]);

  if (maxWeeks > 0) {
    data.push([]);
    data.push(['Weekly Allocation (days)']);
    const header: (string | number)[] = ['Role', 'Consultant'];
    for (let w = 1; w <= maxWeeks; w++) header.push(`W${w}`);
    header.push('Total');
    data.push(header);
    book.lineItems.forEach(item => {
      const row: (string | number)[] = [item.role, item.name || ''];
      for (let w = 0; w < maxWeeks; w++) row.push(item.days[w] ?? 0);
      row.push(totalDays(item));
      data.push(row);
    });
  }

  if (book.notes) {
    data.push([], ['Notes', book.notes]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pricing');

  XLSX.writeFile(wb, `${book.client} - ${book.engagement}.xlsx`);
}
