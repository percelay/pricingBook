import ExcelJS from 'exceljs';
import { PricingBook } from './types';
import { calcTotals, lineCost, lineSubtotal, totalDays } from './calculations';

const CURRENCY = 'USD';
const MONEY_FORMAT = '$#,##0;[Red]($#,##0);-';
const NUMBER_FORMAT = '#,##0.0';
const PERCENT_FORMAT = '0.0%';
const DATE_FORMAT = 'm/d/yyyy';

const COLORS = {
  navy: '1F2937',
  slate: '374151',
  green: '77BB91',
  greenDark: '4F8F67',
  greenLight: 'E9F6EE',
  sand: 'E6E2D6',
  sandLight: 'F6F2E9',
  blueLight: 'EAF2FF',
  grayLight: 'F3F4F6',
  grayText: '6B7280',
  white: 'FFFFFF',
  black: '111827',
  red: 'B91C1C',
  redLight: 'FEE2E2',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
  left: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
  bottom: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
  right: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
};

const SECTION_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: `FF${COLORS.green}` } },
  left: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
  bottom: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
  right: { style: 'thin', color: { argb: `FF${COLORS.sand}` } },
};

type FormulaValue = {
  formula: string;
  result: number;
};

function formula(formulaText: string, result: number): FormulaValue {
  return { formula: formulaText, result };
}

function fill(color: string): ExcelJS.FillPattern {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${color}` },
  };
}

function cleanFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
}

function applyRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  apply: (cell: ExcelJS.Cell, row: number, col: number) => void
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      apply(worksheet.getCell(row, col), row, col);
    }
  }
}

function styleSectionTitle(worksheet: ExcelJS.Worksheet, rowNumber: number, fromCol: number, toCol: number) {
  worksheet.mergeCells(rowNumber, fromCol, rowNumber, toCol);
  const cell = worksheet.getCell(rowNumber, fromCol);
  cell.font = { bold: true, color: { argb: `FF${COLORS.white}` }, size: 11 };
  cell.fill = fill(COLORS.slate);
  cell.alignment = { vertical: 'middle' };
  cell.border = SECTION_BORDER;
  worksheet.getRow(rowNumber).height = 22;
}

function styleLabel(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: `FF${COLORS.slate}` } };
  cell.fill = fill(COLORS.grayLight);
  cell.border = THIN_BORDER;
  cell.alignment = { vertical: 'middle' };
}

function styleInput(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.greenLight);
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${COLORS.green}` } },
    left: { style: 'thin', color: { argb: `FF${COLORS.green}` } },
    bottom: { style: 'thin', color: { argb: `FF${COLORS.green}` } },
    right: { style: 'thin', color: { argb: `FF${COLORS.green}` } },
  };
  cell.font = { color: { argb: `FF${COLORS.black}` } };
  cell.alignment = { vertical: 'middle' };
  if (numFmt) cell.numFmt = numFmt;
}

function styleFormula(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.blueLight);
  cell.border = THIN_BORDER;
  cell.font = { color: { argb: `FF${COLORS.black}` } };
  cell.alignment = { vertical: 'middle' };
  if (numFmt) cell.numFmt = numFmt;
}

function setMetadataPair(worksheet: ExcelJS.Worksheet, row: number, labelCol: number, label: string, value: string | Date) {
  const labelCell = worksheet.getCell(row, labelCol);
  const valueCell = worksheet.getCell(row, labelCol + 1);
  labelCell.value = label;
  valueCell.value = value;
  styleLabel(labelCell);
  valueCell.border = THIN_BORDER;
  valueCell.alignment = { vertical: 'middle', wrapText: true };
  if (value instanceof Date) valueCell.numFmt = DATE_FORMAT;
}

function addSummaryRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: FormulaValue,
  options: { percent?: boolean; total?: boolean; warning?: boolean } = {}
) {
  const labelCell = worksheet.getCell(`H${row}`);
  const valueCell = worksheet.getCell(`J${row}`);
  labelCell.value = label;
  valueCell.value = value;
  worksheet.mergeCells(`H${row}:I${row}`);
  labelCell.border = THIN_BORDER;
  valueCell.border = THIN_BORDER;
  labelCell.alignment = { vertical: 'middle' };
  valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  valueCell.numFmt = options.percent ? PERCENT_FORMAT : MONEY_FORMAT;

  if (options.total) {
    applyRange(worksheet, row, 8, row, 10, cell => {
      cell.fill = fill(COLORS.navy);
      cell.font = { bold: true, color: { argb: `FF${COLORS.white}` }, size: 12 };
      cell.border = {
        top: { style: 'medium', color: { argb: `FF${COLORS.navy}` } },
        left: { style: 'thin', color: { argb: `FF${COLORS.navy}` } },
        bottom: { style: 'medium', color: { argb: `FF${COLORS.navy}` } },
        right: { style: 'thin', color: { argb: `FF${COLORS.navy}` } },
      };
    });
  } else if (options.warning) {
    applyRange(worksheet, row, 8, row, 10, cell => {
      cell.fill = fill(COLORS.redLight);
      cell.font = { bold: true, color: { argb: `FF${COLORS.red}` } };
    });
  }
}

function styleLineItemTable(worksheet: ExcelJS.Worksheet, firstRow: number, lastRow: number) {
  const headerRow = worksheet.getRow(firstRow);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.fill = fill(COLORS.greenDark);
    cell.font = { bold: true, color: { argb: `FF${COLORS.white}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${COLORS.greenDark}` } },
      left: { style: 'thin', color: { argb: `FF${COLORS.greenDark}` } },
      bottom: { style: 'medium', color: { argb: `FF${COLORS.greenDark}` } },
      right: { style: 'thin', color: { argb: `FF${COLORS.greenDark}` } },
    };
  });

  applyRange(worksheet, firstRow + 1, 1, lastRow, 9, cell => {
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  for (let row = firstRow + 1; row <= lastRow; row += 1) {
    const isEven = (row - firstRow) % 2 === 0;
    applyRange(worksheet, row, 1, row, 9, cell => {
      cell.fill = fill(isEven ? COLORS.sandLight : COLORS.white);
    });
    [3, 4, 5].forEach(col => styleInput(worksheet.getCell(row, col), col === 3 ? NUMBER_FORMAT : MONEY_FORMAT));
    [6, 7, 8, 9].forEach(col => styleFormula(worksheet.getCell(row, col), col === 9 ? PERCENT_FORMAT : MONEY_FORMAT));
  }
}

function setColumnWidths(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [
    { key: 'role', width: 20 },
    { key: 'consultant', width: 24 },
    { key: 'days', width: 12 },
    { key: 'rate', width: 14 },
    { key: 'costRate', width: 14 },
    { key: 'subtotal', width: 15 },
    { key: 'cost', width: 15 },
    { key: 'margin', width: 15 },
    { key: 'marginPct', width: 12 },
    { key: 'summaryValue', width: 16 },
  ];
}

function addPricingModelSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const totals = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const worksheet = workbook.addWorksheet('Pricing Model', {
    properties: { tabColor: { argb: `FF${COLORS.green}` } },
    views: [{ state: 'frozen', ySplit: 22, topLeftCell: 'A23', showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      horizontalCentered: true,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  setColumnWidths(worksheet);

  worksheet.mergeCells('A1:J1');
  const title = worksheet.getCell('A1');
  title.value = 'probook Pricing Model';
  title.font = { bold: true, size: 18, color: { argb: `FF${COLORS.white}` } };
  title.fill = fill(COLORS.navy);
  title.alignment = { vertical: 'middle' };
  title.border = SECTION_BORDER;
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:J2');
  const subtitle = worksheet.getCell('A2');
  subtitle.value = `${book.client} - ${book.engagement}`;
  subtitle.font = { italic: true, color: { argb: `FF${COLORS.grayText}` } };
  subtitle.alignment = { vertical: 'middle' };

  setMetadataPair(worksheet, 4, 1, 'Client', book.client);
  setMetadataPair(worksheet, 4, 4, 'Engagement', book.engagement);
  setMetadataPair(worksheet, 4, 8, 'Status', book.status);
  setMetadataPair(worksheet, 5, 1, 'Region', book.region);
  setMetadataPair(worksheet, 5, 4, 'Rate Card', book.baseRateCardName);
  setMetadataPair(worksheet, 5, 8, 'Currency', CURRENCY);
  setMetadataPair(worksheet, 6, 1, 'Generated', new Date());

  styleSectionTitle(worksheet, 8, 1, 6);
  worksheet.getCell('A8').value = 'Commercial Assumptions';
  const assumptionCells = [
    ['A9', 'Discount %', 'B9', book.discount / 100],
    ['C9', 'Markup %', 'D9', book.markup / 100],
    ['E9', 'T&E %', 'F9', book.tePercent / 100],
  ] as const;

  assumptionCells.forEach(([labelAddress, label, valueAddress, value]) => {
    const labelCell = worksheet.getCell(labelAddress);
    const valueCell = worksheet.getCell(valueAddress);
    labelCell.value = label;
    valueCell.value = value;
    styleLabel(labelCell);
    styleInput(valueCell, PERCENT_FORMAT);
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  styleSectionTitle(worksheet, 8, 8, 10);
  worksheet.getCell('H8').value = 'Live Summary';
  addSummaryRow(worksheet, 9, 'Subtotal', formula('SUM(LineItems[Subtotal])', totals.subtotal));
  addSummaryRow(worksheet, 10, 'Discount', formula('-J9*$B$9', -totals.discountAmount));
  addSummaryRow(worksheet, 11, 'After Discount', formula('J9+J10', totals.afterDiscount));
  addSummaryRow(worksheet, 12, 'Markup', formula('J11*$D$9', totals.markupAmount));
  addSummaryRow(worksheet, 13, 'Net Fees', formula('J11+J12', totals.afterMarkup));
  addSummaryRow(worksheet, 14, 'T&E', formula('J13*$F$9', totals.teAmount));
  addSummaryRow(worksheet, 15, 'Grand Total', formula('J13+J14', totals.grandTotal), { total: true });
  addSummaryRow(worksheet, 17, 'Internal Cost', formula('SUM(LineItems[Cost])', totals.totalCost));
  addSummaryRow(worksheet, 18, 'Gross Margin', formula('J13-J17', totals.grossMargin));
  addSummaryRow(worksheet, 19, 'Gross Margin %', formula('IF(J13=0,0,J18/J13)', totals.grossMarginPct / 100), {
    percent: true,
    warning: totals.grossMarginPct < 30,
  });

  styleSectionTitle(worksheet, 21, 1, 9);
  worksheet.getCell('A21').value = 'Line Items - Editable Driver Table';

  const tableStartRow = 22;
  const tableRows = book.lineItems.map(item => {
    const subtotal = lineSubtotal(item);
    const cost = lineCost(item);
    const margin = subtotal - cost;
    const marginPct = subtotal > 0 ? margin / subtotal : 0;

    return [
      item.role,
      item.name || '',
      totalDays(item),
      item.dailyRate,
      item.dailyCost,
      formula('[@[Total Days]]*[@[Daily Rate]]', subtotal),
      formula('[@[Total Days]]*[@[Daily Cost]]', cost),
      formula('[@Subtotal]-[@Cost]', margin),
      formula('IF([@Subtotal]=0,0,[@Margin]/[@Subtotal])', marginPct),
    ];
  });

  worksheet.addTable({
    name: 'LineItems',
    displayName: 'LineItems',
    ref: `A${tableStartRow}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium4',
      showRowStripes: true,
    },
    columns: [
      { name: 'Role', filterButton: true },
      { name: 'Consultant', filterButton: true },
      { name: 'Total Days', filterButton: true },
      { name: 'Daily Rate', filterButton: true },
      { name: 'Daily Cost', filterButton: true },
      { name: 'Subtotal', filterButton: true },
      { name: 'Cost', filterButton: true },
      { name: 'Margin', filterButton: true },
      { name: 'Margin %', filterButton: true },
    ],
    rows: tableRows,
  });

  const lastTableRow = tableStartRow + Math.max(tableRows.length, 1);
  styleLineItemTable(worksheet, tableStartRow, lastTableRow);
  applyRange(worksheet, tableStartRow + 1, 4, lastTableRow, 8, cell => {
    cell.numFmt = MONEY_FORMAT;
  });
  applyRange(worksheet, tableStartRow + 1, 3, lastTableRow, 3, cell => {
    cell.numFmt = NUMBER_FORMAT;
  });
  applyRange(worksheet, tableStartRow + 1, 9, lastTableRow, 9, cell => {
    cell.numFmt = PERCENT_FORMAT;
  });

  const inputLegendRow = lastTableRow + 3;
  worksheet.mergeCells(inputLegendRow, 1, inputLegendRow, 9);
  const legend = worksheet.getCell(inputLegendRow, 1);
  legend.value = 'Green cells are handoff inputs; blue cells are formulas. Add new roles inside the LineItems table so the summary formulas continue to expand automatically.';
  legend.fill = fill(COLORS.greenLight);
  legend.font = { italic: true, color: { argb: `FF${COLORS.slate}` } };
  legend.alignment = { wrapText: true, vertical: 'middle' };
  legend.border = THIN_BORDER;
  worksheet.getRow(inputLegendRow).height = 32;

  worksheet.headerFooter.oddHeader = '&Lprobook&C&BPricing Model&R&D';
  worksheet.headerFooter.oddFooter = '&LConfidential&RPage &P of &N';
  worksheet.autoFilter = {
    from: { row: tableStartRow, column: 1 },
    to: { row: lastTableRow, column: 9 },
  };
}

function addWeeklyAllocationSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const weekCount = Math.max(1, book.lineItems.reduce((max, item) => Math.max(max, item.days.length), 0));
  const worksheet = workbook.addWorksheet('Weekly Allocation', {
    properties: { tabColor: { argb: `FF${COLORS.sand}` } },
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });

  worksheet.columns = [
    { width: 20 },
    { width: 24 },
    ...Array.from({ length: weekCount }, () => ({ width: 8 })),
    { width: 12 },
  ];

  worksheet.mergeCells(1, 1, 1, weekCount + 3);
  const title = worksheet.getCell(1, 1);
  title.value = 'Weekly Allocation Detail';
  title.fill = fill(COLORS.navy);
  title.font = { bold: true, size: 16, color: { argb: `FF${COLORS.white}` } };
  title.alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells(2, 1, 2, weekCount + 3);
  const subtitle = worksheet.getCell(2, 1);
  subtitle.value = `${book.client} - ${book.engagement}`;
  subtitle.font = { italic: true, color: { argb: `FF${COLORS.grayText}` } };

  const headerRow = worksheet.getRow(4);
  headerRow.values = ['Role', 'Consultant', ...Array.from({ length: weekCount }, (_, index) => `W${index + 1}`), 'Total'];
  headerRow.eachCell(cell => {
    cell.fill = fill(COLORS.greenDark);
    cell.font = { bold: true, color: { argb: `FF${COLORS.white}` } };
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  book.lineItems.forEach((item, index) => {
    const rowNumber = index + 5;
    const row = worksheet.getRow(rowNumber);
    const values = [
      item.role,
      item.name || '',
      ...Array.from({ length: weekCount }, (_, weekIndex) => item.days[weekIndex] ?? 0),
      formula(`SUM(C${rowNumber}:${worksheet.getColumn(weekCount + 2).letter}${rowNumber})`, totalDays(item)),
    ];
    row.values = values;
    row.eachCell(cell => {
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle' };
    });
    applyRange(worksheet, rowNumber, 3, rowNumber, weekCount + 3, (cell, _row, col) => {
      cell.numFmt = NUMBER_FORMAT;
      if (col < weekCount + 3) styleInput(cell, NUMBER_FORMAT);
      else styleFormula(cell, NUMBER_FORMAT);
    });
  });

  const lastRow = book.lineItems.length + 4;
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: lastRow, column: weekCount + 3 },
  };
}

function addHandoffNotesSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const worksheet = workbook.addWorksheet('Handoff Notes', {
    properties: { tabColor: { argb: `FF${COLORS.navy}` } },
    views: [{ showGridLines: false }],
  });
  worksheet.columns = [{ width: 22 }, { width: 96 }];

  worksheet.mergeCells('A1:B1');
  const title = worksheet.getCell('A1');
  title.value = 'Handoff Notes';
  title.fill = fill(COLORS.navy);
  title.font = { bold: true, size: 16, color: { argb: `FF${COLORS.white}` } };
  title.alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  const rows: Array<[string, string]> = [
    ['Client', book.client],
    ['Engagement', book.engagement],
    ['Rate Card', book.baseRateCardName],
    ['Status', book.status],
    ['Workbook Use', 'Use the Pricing Model sheet as the source of truth. Green cells are inputs, blue cells are formulas, and the LineItems table can be extended with additional roles.'],
    ['Commercial Notes', book.notes || 'No notes entered.'],
  ];

  rows.forEach(([label, value], index) => {
    const row = worksheet.getRow(index + 3);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    styleLabel(row.getCell(1));
    row.getCell(2).border = THIN_BORDER;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (index >= 4) row.height = 48;
  });
}

export function buildBookWorkbook(book: PricingBook): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'probook';
  workbook.lastModifiedBy = 'probook';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = `${book.client} - ${book.engagement}`;
  workbook.subject = 'probook pricing export';
  workbook.company = 'probook';
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.views = [{ x: 0, y: 0, width: 16000, height: 9000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  addPricingModelSheet(workbook, book);
  addWeeklyAllocationSheet(workbook, book);
  addHandoffNotesSheet(workbook, book);

  return workbook;
}

export async function exportBookToExcel(book: PricingBook): Promise<void> {
  const workbook = buildBookWorkbook(book);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const client = cleanFilePart(book.client) || 'Client';
  const engagement = cleanFilePart(book.engagement) || 'Engagement';
  const link = document.createElement('a');
  link.href = url;
  link.download = `${client} - ${engagement}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
