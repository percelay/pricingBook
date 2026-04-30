import * as XLSX from 'xlsx';
import { PricingBook } from './types';
import { calcTotals, lineCost, lineSubtotal, totalDays } from './calculations';

const CURRENCY = 'USD';
const MONEY_FORMAT = '$#,##0;[Red]($#,##0);-';
const NUMBER_FORMAT = '#,##0.0';
const PERCENT_FORMAT = '0.0%';
const DATE_FORMAT = 'm/d/yyyy';

type CellValue = string | number | boolean | Date | null | undefined;
type SheetCell = CellValue | XLSX.CellObject;

function isCellObject(value: SheetCell): value is XLSX.CellObject {
  return Boolean(value && typeof value === 'object' && !(value instanceof Date) && ('t' in value || 'f' in value));
}

function valueCell(value: CellValue, format?: string): XLSX.CellObject | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return { t: 'd', v: value, z: format ?? DATE_FORMAT };
  if (typeof value === 'number') return { t: 'n', v: value, z: format };
  if (typeof value === 'boolean') return { t: 'b', v: value };
  return { t: 's', v: value };
}

function formulaCell(formula: string, value: number, format?: string): XLSX.CellObject {
  return { t: 'n', f: formula, v: value, z: format };
}

function buildSheet(rows: SheetCell[][]): XLSX.WorkSheet {
  const sheet: XLSX.WorkSheet = {};
  let maxCol = 0;
  let maxRow = 0;

  rows.forEach((row, rowIndex) => {
    maxRow = Math.max(maxRow, rowIndex);
    maxCol = Math.max(maxCol, row.length - 1);

    row.forEach((entry, columnIndex) => {
      const cell = isCellObject(entry) ? entry : valueCell(entry);
      if (!cell) return;
      sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] = cell;
    });
  });

  sheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: maxRow, c: maxCol },
  });

  return sheet;
}

function setFormat(sheet: XLSX.WorkSheet, range: string, format: string) {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let column = decoded.s.c; column <= decoded.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[address] as XLSX.CellObject | undefined;
      if (cell) cell.z = format;
    }
  }
}

function quoteSheet(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function rangeRef(sheetName: string, column: string, startRow: number, endRow: number): string {
  return `${quoteSheet(sheetName)}!${column}${startRow}:${column}${endRow}`;
}

function formulaSum(sheetName: string, column: string, startRow: number, endRow: number): string {
  if (endRow < startRow) return '0';
  return `SUM(${rangeRef(sheetName, column, startRow, endRow)})`;
}

function cleanFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
}

function buildSummarySheet(book: PricingBook): XLSX.WorkSheet {
  const totals = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const lastLineItemRow = book.lineItems.length + 2;
  const subtotalFormula = formulaSum('Line Items', 'F', 3, lastLineItemRow);
  const costFormula = formulaSum('Line Items', 'G', 3, lastLineItemRow);

  const rows: SheetCell[][] = [
    ['probook Pricing Export'],
    [],
    ['Client', book.client, 'Status', book.status],
    ['Engagement', book.engagement, 'Region', book.region],
    ['Rate Card', book.baseRateCardName, 'Currency', CURRENCY],
    ['Generated', new Date()],
    [],
    ['Assumptions', 'Value'],
    ['Discount %', { t: 'n', v: book.discount / 100, z: PERCENT_FORMAT }],
    ['Markup %', { t: 'n', v: book.markup / 100, z: PERCENT_FORMAT }],
    ['T&E %', { t: 'n', v: book.tePercent / 100, z: PERCENT_FORMAT }],
    [],
    ['Financial Summary', 'Value'],
    ['Subtotal', formulaCell(subtotalFormula, totals.subtotal, MONEY_FORMAT)],
    ['Discount', formulaCell('-B14*$B$9', -totals.discountAmount, MONEY_FORMAT)],
    ['After Discount', formulaCell('B14+B15', totals.afterDiscount, MONEY_FORMAT)],
    ['Markup', formulaCell('B16*$B$10', totals.markupAmount, MONEY_FORMAT)],
    ['Net Fees', formulaCell('B16+B17', totals.afterMarkup, MONEY_FORMAT)],
    ['T&E', formulaCell('B18*$B$11', totals.teAmount, MONEY_FORMAT)],
    ['Grand Total', formulaCell('B18+B19', totals.grandTotal, MONEY_FORMAT)],
    [],
    ['Internal Cost', formulaCell(costFormula, totals.totalCost, MONEY_FORMAT)],
    ['Gross Margin', formulaCell('B18-B22', totals.grossMargin, MONEY_FORMAT)],
    ['Gross Margin %', formulaCell('IF(B18=0,0,B23/B18)', totals.grossMarginPct / 100, PERCENT_FORMAT)],
  ];

  const sheet = buildSheet(rows);
  sheet['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 20 }];
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
  ];
  setFormat(sheet, 'B6:B6', DATE_FORMAT);
  return sheet;
}

function buildLineItemsSheet(book: PricingBook): XLSX.WorkSheet {
  const weekCount = Math.max(1, book.lineItems.reduce((max, item) => Math.max(max, item.days.length), 0));
  const weeklyTotalColumn = XLSX.utils.encode_col(weekCount + 2);
  const rows: SheetCell[][] = [
    ['Line Items'],
    ['Role', 'Consultant', 'Total Days', 'Daily Rate', 'Daily Cost', 'Subtotal', 'Cost', 'Margin', 'Margin %'],
  ];

  book.lineItems.forEach((item, index) => {
    const rowNumber = index + 3;
    const allocationTotalRow = index + 3;
    const subtotal = lineSubtotal(item);
    const cost = lineCost(item);
    const margin = subtotal - cost;
    const marginPct = subtotal > 0 ? margin / subtotal : 0;

    rows.push([
      item.role,
      item.name || '',
      formulaCell(`${quoteSheet('Weekly Allocation')}!${weeklyTotalColumn}${allocationTotalRow}`, totalDays(item), NUMBER_FORMAT),
      { t: 'n', v: item.dailyRate, z: MONEY_FORMAT },
      { t: 'n', v: item.dailyCost, z: MONEY_FORMAT },
      formulaCell(`C${rowNumber}*D${rowNumber}`, subtotal, MONEY_FORMAT),
      formulaCell(`C${rowNumber}*E${rowNumber}`, cost, MONEY_FORMAT),
      formulaCell(`F${rowNumber}-G${rowNumber}`, margin, MONEY_FORMAT),
      formulaCell(`IF(F${rowNumber}=0,0,H${rowNumber}/F${rowNumber})`, marginPct, PERCENT_FORMAT),
    ]);
  });

  const sheet = buildSheet(rows);
  const lastRow = Math.max(2, rows.length);
  sheet['!cols'] = [
    { wch: 20 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  sheet['!autofilter'] = { ref: `A2:I${lastRow}` };
  return sheet;
}

function buildWeeklyAllocationSheet(book: PricingBook): XLSX.WorkSheet {
  const weekCount = Math.max(1, book.lineItems.reduce((max, item) => Math.max(max, item.days.length), 0));
  const totalColumnIndex = weekCount + 2;
  const totalColumn = XLSX.utils.encode_col(totalColumnIndex);
  const lastWeekColumn = XLSX.utils.encode_col(totalColumnIndex - 1);

  const rows: SheetCell[][] = [
    ['Weekly Allocation (days)'],
    ['Role', 'Consultant', ...Array.from({ length: weekCount }, (_, index) => `W${index + 1}`), 'Total'],
  ];

  book.lineItems.forEach((item, index) => {
    const rowNumber = index + 3;
    const weekValues = Array.from({ length: weekCount }, (_, weekIndex) => item.days[weekIndex] ?? 0);
    rows.push([
      item.role,
      item.name || '',
      ...weekValues.map<XLSX.CellObject>(days => ({ t: 'n', v: days, z: NUMBER_FORMAT })),
      formulaCell(`SUM(C${rowNumber}:${lastWeekColumn}${rowNumber})`, totalDays(item), NUMBER_FORMAT),
    ]);
  });

  const sheet = buildSheet(rows);
  const lastRow = Math.max(2, rows.length);
  sheet['!cols'] = [
    { wch: 20 },
    { wch: 24 },
    ...Array.from({ length: weekCount }, () => ({ wch: 8 })),
    { wch: 10 },
  ];
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalColumnIndex } }];
  sheet['!autofilter'] = { ref: `A2:${totalColumn}${lastRow}` };
  return sheet;
}

function buildNotesSheet(book: PricingBook): XLSX.WorkSheet {
  const rows: SheetCell[][] = [
    ['Notes'],
    [],
    ['Client', book.client],
    ['Engagement', book.engagement],
    [],
    ['Notes', book.notes || 'No notes entered.'],
  ];

  const sheet = buildSheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 90 }];
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 5, c: 1 }, e: { r: 8, c: 1 } },
  ];
  return sheet;
}

export function buildBookWorkbook(book: PricingBook): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `${book.client} - ${book.engagement}`,
    Subject: 'probook pricing export',
    Author: 'probook',
    CreatedDate: new Date(),
  };
  wb.Workbook = {
    Views: [{ RTL: false }],
  };
  (wb.Workbook as XLSX.WBProps & { CalcPr?: Record<string, string> }).CalcPr = {
    calcMode: 'auto',
    fullCalcOnLoad: '1',
  };

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(book), 'Summary');
  XLSX.utils.book_append_sheet(wb, buildLineItemsSheet(book), 'Line Items');
  XLSX.utils.book_append_sheet(wb, buildWeeklyAllocationSheet(book), 'Weekly Allocation');
  XLSX.utils.book_append_sheet(wb, buildNotesSheet(book), 'Notes');

  return wb;
}

export function exportBookToExcel(book: PricingBook): void {
  const wb = buildBookWorkbook(book);
  const client = cleanFilePart(book.client) || 'Client';
  const engagement = cleanFilePart(book.engagement) || 'Engagement';
  XLSX.writeFile(wb, `${client} - ${engagement}.xlsx`, {
    bookSST: true,
    compression: true,
  });
}
