import ExcelJS from 'exceljs';
import { LineItem, PricingBook, RateCard } from './types';
import { calcTotals } from './calculations';
import { shouldShowWeeklyAllocation } from './weekly-allocation';

const MONEY_FORMAT = '$#,##0;($#,##0)';
const PERCENT_FORMAT = '0.0%';
const NUMBER_FORMAT = '#,##0.0';
const DATE_FORMAT = 'dd/mm/yyyy';

const COLORS = {
  wavestonePurple: '4A148C',
  headerLavender: 'C5B3E6',
  editableMint: 'D4F4DD',
  lockedGray: 'D9D9D9',
  warningRed: 'F4CCCC',
  cautionYellow: 'FFF2CC',
  targetGreen: 'C6EFCE',
  totalRow: 'E8E0F0',
  white: 'FFFFFF',
  gray: '6B7280',
  black: '000000',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};

function fill(color: string): ExcelJS.FillPattern {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
}

function cleanFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.fill = fill(COLORS.headerLavender);
  cell.font = { bold: true, name: 'Calibri', size: 11, color: { argb: `FF${COLORS.black}` } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = THIN_BORDER;
}

function styleEditable(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.editableMint);
  cell.border = THIN_BORDER;
  cell.font = { name: 'Calibri', size: 10 };
  cell.protection = { locked: false };
  if (numFmt) cell.numFmt = numFmt;
}

function styleLocked(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.lockedGray);
  cell.border = THIN_BORDER;
  cell.font = { name: 'Calibri', size: 10 };
  if (numFmt) cell.numFmt = numFmt;
}

function styleFormula(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.lockedGray);
  cell.border = THIN_BORDER;
  cell.font = { name: 'Calibri', size: 10 };
  if (numFmt) cell.numFmt = numFmt;
}

function styleTotalRow(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = fill(COLORS.totalRow);
  cell.border = {
    top: { style: 'medium', color: { argb: `FF${COLORS.black}` } },
    left: THIN_BORDER.left,
    bottom: THIN_BORDER.bottom,
    right: THIN_BORDER.right,
  };
  cell.font = { name: 'Calibri', size: 10, bold: true };
  if (numFmt) cell.numFmt = numFmt;
}

interface RateCardLookupRow {
  key: string;
  cardName: string;
  level: string;
  billHourly: number;
  costHourly: number;
}

function buildRateCardLookupRows(rateCards: RateCard[]): RateCardLookupRow[] {
  const rows: RateCardLookupRow[] = [];
  for (const card of rateCards) {
    for (const r of card.roles) {
      rows.push({
        key: `${card.name}|${r.role}`,
        cardName: card.name,
        level: r.role,
        billHourly: r.dailyRate / 8,
        costHourly: r.dailyCost / 8,
      });
    }
  }
  return rows;
}

function lineHrsPerWeek(item: LineItem): number {
  if (item.days.length === 0) return 0;
  const totalHrs = item.days.reduce((s, d) => s + d, 0) * 8;
  return totalHrs / item.days.length;
}

function linePractice(item: LineItem): string {
  const name = item.rateCardName ?? '';
  if (!name) return '';
  return item.rateCardRegion === 'US' ? `${name} (US)` : `${name} (RoW)`;
}

const CONSULTING_HEADER_ROW = 17;
const CONSULTING_FIRST_DATA_ROW = 18;
const CONSULTING_MAX_ROWS = 10;
const CONSULTING_LAST_DATA_ROW = CONSULTING_FIRST_DATA_ROW + CONSULTING_MAX_ROWS - 1; // 27
const CONSULTING_TOTAL_ROW = 28;

const SUBCON_HEADER_ROW = 34;
const SUBCON_FIRST_DATA_ROW = 35;
const SUBCON_MAX_ROWS = 5;
const SUBCON_LAST_DATA_ROW = SUBCON_FIRST_DATA_ROW + SUBCON_MAX_ROWS - 1; // 39
const SUBCON_TOTAL_ROW = 40;

function addPricingSheet(workbook: ExcelJS.Workbook, book: PricingBook, rateCards: RateCard[]) {
  const totals = calcTotals(book.lineItems, book.discount, book.markup, book.tePercent);
  const ws = workbook.addWorksheet('Pricing', {
    properties: { tabColor: { argb: `FF${COLORS.wavestonePurple}` } },
    views: [{ state: 'frozen', ySplit: CONSULTING_HEADER_ROW, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: 'A1:T58',
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: { oddHeader: '&CWavestone NA Pricing Template — Confidential' },
  });

  // Column widths
  const widths = [18, 22, 22, 14, 14, 10, 14, 8, 12, 8, 10, 10, 14, 12, 12, 14, 12, 14, 32, 24];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  // Hidden helper U
  ws.getColumn(21).width = 1;
  ws.getColumn(21).hidden = true;
  // Sidebar V-Y
  [16, 16, 16, 12].forEach((w, i) => { ws.getColumn(22 + i).width = w; });
  // Hidden lookup-key helper Z
  ws.getColumn(26).width = 1;
  ws.getColumn(26).hidden = true;
  // Reference zone AA-AC
  [30, 22, 22].forEach((w, i) => { ws.getColumn(27 + i).width = w; });
  // AE-AI dropdown sources
  [22, 28, 24, 24, 24].forEach((w, i) => { ws.getColumn(31 + i).width = w; });

  // ===== Reference zone first =====
  // Rate Card table at AA1:AC...
  ws.mergeCells('AA1:AC1');
  const rcTitle = ws.getCell('AA1');
  rcTitle.value = 'RATE CARD — DO NOT DELETE';
  rcTitle.font = { bold: true, color: { argb: `FF${COLORS.wavestonePurple}` }, size: 11 };
  rcTitle.alignment = { horizontal: 'center' };

  ws.getCell('AA2').value = 'Rate Card | Level';
  ws.getCell('AB2').value = 'Target List Bill Rate (Hourly)';
  ws.getCell('AC2').value = 'Target Cost Rate (Hourly)';
  ['AA2', 'AB2', 'AC2'].forEach(a => styleHeader(ws.getCell(a)));

  const lookupRows = buildRateCardLookupRows(rateCards);
  const rcStartRow = 3;
  lookupRows.forEach((row, i) => {
    const r = rcStartRow + i;
    ws.getCell(r, 27).value = row.key;
    ws.getCell(r, 28).value = row.billHourly;
    ws.getCell(r, 29).value = row.costHourly;
    styleEditable(ws.getCell(r, 27));
    styleEditable(ws.getCell(r, 28), MONEY_FORMAT);
    styleEditable(ws.getCell(r, 29), MONEY_FORMAT);
  });
  const rcLastRow = Math.max(rcStartRow, rcStartRow + lookupRows.length - 1);
  const rateCardLookupRef = `Pricing!$AA$${rcStartRow}:$AC$${rcLastRow}`;
  workbook.definedNames.add(rateCardLookupRef, 'Rate_Card_Lookup');

  // Dropdown sources AE-AI
  ws.mergeCells('AE1:AI1');
  const ddTitle = ws.getCell('AE1');
  ddTitle.value = 'DROPDOWN SOURCES — DO NOT DELETE';
  ddTitle.font = { bold: true, color: { argb: `FF${COLORS.wavestonePurple}` }, size: 11 };
  ddTitle.alignment = { horizontal: 'center' };

  const ddHeaders = ['Wavestone_Levels', 'Practice_Groups', 'Project_Types', 'Service_Types', 'Travel_Arrangements'];
  ddHeaders.forEach((h, i) => {
    const cell = ws.getCell(2, 31 + i);
    cell.value = h;
    styleHeader(cell);
  });

  // Wavestone_Levels = distinct roles in rate cards (or app roles)
  const levels = Array.from(new Set(rateCards.flatMap(c => c.roles.map(r => r.role))));
  levels.forEach((lv, i) => {
    const cell = ws.getCell(3 + i, 31);
    cell.value = lv;
    styleEditable(cell);
  });
  const levelsLastRow = 3 + Math.max(levels.length, 1) - 1;
  if (levels.length > 0) {
    workbook.definedNames.add(`Pricing!$AE$3:$AE$${levelsLastRow}`, 'Wavestone_Levels');
  }
  // Other dropdowns left empty (not in app data)

  // ===== Header block =====
  ws.getCell('A1').value = 'WAVESTONE';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${COLORS.wavestonePurple}` } };
  ws.getCell('A2').value = 'NORTH AMERICA PRICING TEMPLATE';
  ws.getCell('A2').font = { bold: true, size: 12, color: { argb: `FF${COLORS.wavestonePurple}` } };
  ws.getCell('A3').value = 'USD';
  ws.getCell('A3').font = { name: 'Calibri', size: 10 };
  ws.getCell('A4').value = 'Defaults to Target List Bill Rate and Cost Rate by North America (NA)';
  ws.getCell('A4').font = { italic: true, color: { argb: `FF${COLORS.gray}` }, size: 10 };
  ws.getCell('A5').value = 'Editable Cells - needs to be completed';
  ws.getCell('A5').font = { italic: true, size: 10 };
  ws.getCell('A5').fill = fill(COLORS.editableMint);
  ws.getCell('A6').value = '*Project Gross Margin (GM) Guidance from PST: Target of 50-60%. If GM% is below 40%, requires CG review.';
  ws.getCell('A6').font = { italic: true, size: 9 };

  // Title note
  ws.getCell('A1').note = 'Color code: mint = input, gray = formula or auto-lookup.';

  // ===== Project Details (A9:C14) =====
  ws.getCell('A9').value = 'Project Details:';
  ws.getCell('A9').font = { bold: true };
  const projectLabels = ['Client:', 'Project Name/Phase:', 'Project Type:', 'Project Start /End Date:', 'Proposal/SOW Total ($):'];
  projectLabels.forEach((label, i) => {
    const r = 10 + i;
    const cell = ws.getCell(r, 1);
    cell.value = label;
    cell.font = { bold: true };
  });
  ws.getCell('B10').value = book.client;
  styleEditable(ws.getCell('B10'));
  ws.getCell('B11').value = book.engagement;
  styleEditable(ws.getCell('B11'));
  styleEditable(ws.getCell('B12'));
  styleEditable(ws.getCell('B13'), DATE_FORMAT);
  styleEditable(ws.getCell('C13'), DATE_FORMAT);
  ws.getCell('B14').value = totals.grandTotal;
  styleEditable(ws.getCell('B14'), MONEY_FORMAT);
  workbook.definedNames.add('Pricing!$B$14', 'SOW_Total');

  // ===== Project Grand Total block (L1:R11) =====
  ws.getCell('L1').value = 'Project Grand Total:';
  ws.getCell('L1').font = { bold: true, color: { argb: `FF${COLORS.wavestonePurple}` } };

  const gtHeaders = ['Type', '', 'Revenue', 'Cost', '*NA GM%', 'NA GM'];
  gtHeaders.forEach((h, i) => {
    const cell = ws.getCell(2, 12 + i);
    cell.value = h;
    cell.fill = fill(COLORS.wavestonePurple);
    cell.font = { bold: true, color: { argb: `FF${COLORS.white}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER;
  });

  const gtRows: Array<[number, string]> = [
    [3, 'Consulting - North America'],
    [4, 'Consulting - RoW'],
    [5, 'Subcontracting'],
    [6, 'Additional Services'],
    [7, 'Subtotal (excl RoW from Margin)'],
    [8, 'Travel'],
    [9, 'Total'],
  ];
  gtRows.forEach(([row, label]) => {
    const cell = ws.getCell(row, 12);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 10, bold: row === 7 || row === 9, italic: row === 4 };
    cell.border = THIN_BORDER;
  });

  // Formulas
  const sumProductRev = `SUMPRODUCT($U$${CONSULTING_FIRST_DATA_ROW}:$U$${CONSULTING_LAST_DATA_ROW},$M$${CONSULTING_FIRST_DATA_ROW}:$M$${CONSULTING_LAST_DATA_ROW})`;
  const sumProductCost = `SUMPRODUCT($U$${CONSULTING_FIRST_DATA_ROW}:$U$${CONSULTING_LAST_DATA_ROW},$P$${CONSULTING_FIRST_DATA_ROW}:$P$${CONSULTING_LAST_DATA_ROW})`;

  ws.getCell('N3').value = { formula: sumProductRev };
  ws.getCell('O3').value = { formula: sumProductCost };
  ws.getCell('N4').value = { formula: `M${CONSULTING_TOTAL_ROW}-N3` };
  ws.getCell('O4').value = { formula: `P${CONSULTING_TOTAL_ROW}-O3` };
  ws.getCell('N5').value = { formula: 'Subcontracting_Total_Revenue' };
  ws.getCell('O5').value = { formula: 'Subcontracting_Total_Cost' };
  ws.getCell('N6').value = { formula: 'Additional_Services_Total_Revenue' };
  ws.getCell('O6').value = { formula: 'Additional_Services_Total_Cost' };
  ws.getCell('N7').value = { formula: 'N3+N5+N6' };
  ws.getCell('O7').value = { formula: 'O3+O5+O6' };
  ws.getCell('N8').value = { formula: 'Travel_Total' };
  ws.getCell('N9').value = { formula: 'N7+N8' };

  for (let r = 3; r <= 7; r += 1) {
    ws.getCell(r, 16).value = { formula: `IFERROR((N${r}-O${r})/N${r},0)` };
    ws.getCell(r, 17).value = { formula: `N${r}-O${r}` };
  }
  ws.getCell('Q11').value = undefined;
  ws.getCell('L11').value = 'Variance from Proposal/SOW Total';
  ws.getCell('L11').font = { italic: true, size: 9 };
  ws.getCell('N11').value = { formula: 'N9-SOW_Total' };

  // Style GT cells
  for (let r = 3; r <= 9; r += 1) {
    for (let c = 13; c <= 17; c += 1) {
      const cell = ws.getCell(r, c);
      cell.border = THIN_BORDER;
      if (c === 16) cell.numFmt = PERCENT_FORMAT;
      else cell.numFmt = MONEY_FORMAT;
      cell.font = { name: 'Calibri', size: 10, bold: r === 7 || r === 9 };
    }
  }
  ws.getCell('N11').numFmt = MONEY_FORMAT;
  ws.getCell('N11').border = THIN_BORDER;
  ws.getCell('S4').value = 'Project GM Key';
  ws.getCell('S4').font = { bold: true, color: { argb: `FF${COLORS.wavestonePurple}` } };
  const keyRows = [
    { row: 5, label: 'Target: 50-60%+', color: COLORS.targetGreen },
    { row: 6, label: 'Acceptable: 40-49%', color: COLORS.cautionYellow },
    { row: 7, label: 'Need CG review (<40%)', color: COLORS.warningRed },
  ];
  keyRows.forEach(k => {
    const cell = ws.getCell(k.row, 19);
    cell.value = k.label;
    cell.fill = fill(k.color);
    cell.border = THIN_BORDER;
    cell.font = { name: 'Calibri', size: 10 };
  });

  // Financials at Target List Rates (row 13)
  ws.getCell('L13').value = 'Financials at Target List Rates';
  ws.getCell('L13').font = { italic: true, color: { argb: `FF${COLORS.wavestonePurple}` } };
  ws.getCell('N13').value = { formula: `V${CONSULTING_TOTAL_ROW}` };
  ws.getCell('O13').value = { formula: `W${CONSULTING_TOTAL_ROW}` };
  ws.getCell('P13').value = { formula: `Y${CONSULTING_TOTAL_ROW}` };
  ws.getCell('Q13').value = { formula: `X${CONSULTING_TOTAL_ROW}` };
  ws.getCell('N13').numFmt = MONEY_FORMAT;
  ws.getCell('O13').numFmt = MONEY_FORMAT;
  ws.getCell('P13').numFmt = PERCENT_FORMAT;
  ws.getCell('Q13').numFmt = MONEY_FORMAT;

  // ===== Consulting Details =====
  const consultingHeaders = [
    'Wavestone Level', 'Project Role', 'Team Member Name',
    'Target List Bill Rate (Hourly)', 'Proposal/SOW Bill Rate (Hourly)', '% of List',
    'Proposal/SOW Bill Rate (Daily)', 'Hrs/Wk', 'Revenue/Wk', 'Weeks',
    'Total Hrs **', 'Total Days', 'Total Revenue',
    'Hourly Cost', 'Daily Cost', 'Total Cost',
    'Project GM%', 'Project GM', 'Practice/Capability Group', 'Notes',
  ];
  consultingHeaders.forEach((h, i) => {
    const cell = ws.getCell(CONSULTING_HEADER_ROW, i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  ws.getRow(CONSULTING_HEADER_ROW).height = 45;

  const items = book.lineItems.slice(0, CONSULTING_MAX_ROWS);
  for (let i = 0; i < CONSULTING_MAX_ROWS; i += 1) {
    const r = CONSULTING_FIRST_DATA_ROW + i;
    const item = items[i];

    if (item) {
      ws.getCell(r, 1).value = item.role;
      ws.getCell(r, 2).value = item.role;
      ws.getCell(r, 3).value = item.name || '';
      ws.getCell(r, 5).value = item.dailyRate / 8;
      ws.getCell(r, 8).value = lineHrsPerWeek(item);
      ws.getCell(r, 10).value = item.days.length;
      ws.getCell(r, 19).value = linePractice(item);
      ws.getCell(r, 26).value = { formula: `IF(A${r}="","",IF(ISBLANK(A${r}),"",CONCATENATE("${(item.rateCardName ?? '').replace(/"/g, '""')}","|",A${r})))` };
    } else {
      ws.getCell(r, 26).value = { formula: `IF(A${r}="","",CONCATENATE(C${r},"|",A${r}))` };
    }

    // Editable
    styleEditable(ws.getCell(r, 1));
    styleEditable(ws.getCell(r, 2));
    styleEditable(ws.getCell(r, 3));
    styleEditable(ws.getCell(r, 5), MONEY_FORMAT);
    styleEditable(ws.getCell(r, 8));
    styleEditable(ws.getCell(r, 10));
    styleEditable(ws.getCell(r, 19));
    styleEditable(ws.getCell(r, 20));

    // Auto-lookup
    ws.getCell(r, 4).value = { formula: `IFERROR(VLOOKUP(Z${r}, Rate_Card_Lookup, 2, FALSE), 0)` };
    styleLocked(ws.getCell(r, 4), MONEY_FORMAT);
    ws.getCell(r, 14).value = { formula: `IFERROR(VLOOKUP(Z${r}, Rate_Card_Lookup, 3, FALSE), 0)` };
    styleLocked(ws.getCell(r, 14), MONEY_FORMAT);

    // Formulas
    ws.getCell(r, 6).value = { formula: `IFERROR(E${r}/D${r}, 0)` };
    styleFormula(ws.getCell(r, 6), PERCENT_FORMAT);
    ws.getCell(r, 7).value = { formula: `E${r}*8` };
    styleFormula(ws.getCell(r, 7), MONEY_FORMAT);
    ws.getCell(r, 9).value = { formula: `E${r}*H${r}` };
    styleFormula(ws.getCell(r, 9), MONEY_FORMAT);
    ws.getCell(r, 11).value = { formula: `H${r}*J${r}` };
    styleFormula(ws.getCell(r, 11), NUMBER_FORMAT);
    ws.getCell(r, 12).value = { formula: `K${r}/8` };
    styleFormula(ws.getCell(r, 12), NUMBER_FORMAT);
    ws.getCell(r, 13).value = { formula: `K${r}*E${r}` };
    styleFormula(ws.getCell(r, 13), MONEY_FORMAT);
    ws.getCell(r, 15).value = { formula: `N${r}*8` };
    styleFormula(ws.getCell(r, 15), MONEY_FORMAT);
    ws.getCell(r, 16).value = { formula: `K${r}*N${r}` };
    styleFormula(ws.getCell(r, 16), MONEY_FORMAT);
    ws.getCell(r, 17).value = { formula: `IFERROR((M${r}-P${r})/M${r}, 0)` };
    styleFormula(ws.getCell(r, 17), PERCENT_FORMAT);
    ws.getCell(r, 18).value = { formula: `M${r}-P${r}` };
    styleFormula(ws.getCell(r, 18), MONEY_FORMAT);

    // Helper U
    ws.getCell(r, 21).value = { formula: `IF(ISNUMBER(SEARCH("(US)", S${r})), 1, 0)` };

    // Sidebar V-Y
    ws.getCell(r, 22).value = { formula: `K${r}*D${r}` };
    styleFormula(ws.getCell(r, 22), MONEY_FORMAT);
    ws.getCell(r, 23).value = { formula: `P${r}` };
    styleFormula(ws.getCell(r, 23), MONEY_FORMAT);
    ws.getCell(r, 24).value = { formula: `V${r}-W${r}` };
    styleFormula(ws.getCell(r, 24), MONEY_FORMAT);
    ws.getCell(r, 25).value = { formula: `IFERROR(X${r}/V${r}, 0)` };
    styleFormula(ws.getCell(r, 25), PERCENT_FORMAT);
  }

  // Consulting totals row 28
  const tr = CONSULTING_TOTAL_ROW;
  ws.getCell(tr, 11).value = { formula: `SUM(K${CONSULTING_FIRST_DATA_ROW}:K${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 12).value = { formula: `SUM(L${CONSULTING_FIRST_DATA_ROW}:L${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 13).value = { formula: `SUM(M${CONSULTING_FIRST_DATA_ROW}:M${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 16).value = { formula: `SUM(P${CONSULTING_FIRST_DATA_ROW}:P${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 17).value = { formula: `IFERROR((M${tr}-P${tr})/M${tr}, 0)` };
  ws.getCell(tr, 18).value = { formula: `M${tr}-P${tr}` };
  ws.getCell(tr, 19).value = 'Consulting Total';
  ws.getCell(tr, 19).alignment = { horizontal: 'right' };
  // Sidebar totals
  ws.getCell(tr, 22).value = { formula: `SUM(V${CONSULTING_FIRST_DATA_ROW}:V${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 23).value = { formula: `SUM(W${CONSULTING_FIRST_DATA_ROW}:W${CONSULTING_LAST_DATA_ROW})` };
  ws.getCell(tr, 24).value = { formula: `V${tr}-W${tr}` };
  ws.getCell(tr, 25).value = { formula: `IFERROR(X${tr}/V${tr}, 0)` };

  for (let c = 1; c <= 20; c += 1) styleTotalRow(ws.getCell(tr, c));
  styleTotalRow(ws.getCell(tr, 11), NUMBER_FORMAT);
  styleTotalRow(ws.getCell(tr, 12), NUMBER_FORMAT);
  styleTotalRow(ws.getCell(tr, 13), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 16), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 17), PERCENT_FORMAT);
  styleTotalRow(ws.getCell(tr, 18), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 22), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 23), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 24), MONEY_FORMAT);
  styleTotalRow(ws.getCell(tr, 25), PERCENT_FORMAT);

  workbook.definedNames.add(`Pricing!$M$${tr}`, 'Consulting_Total_Revenue');
  workbook.definedNames.add(`Pricing!$P$${tr}`, 'Consulting_Total_Cost');

  // Sidebar headers
  ws.mergeCells('V15:Y15');
  ws.getCell('V15').value = 'DO NOT DELETE';
  ws.getCell('V15').font = { bold: true, italic: true, color: { argb: `FF${COLORS.wavestonePurple}` } };
  ws.getCell('V15').alignment = { horizontal: 'right' };
  ws.mergeCells('V16:Y16');
  ws.getCell('V16').value = 'GM AT TARGET RATES';
  ws.getCell('V16').font = { bold: true, color: { argb: `FF${COLORS.wavestonePurple}` } };
  ws.getCell('V16').alignment = { horizontal: 'center' };
  ['Revenue', 'Cost', 'GM', 'GM%'].forEach((h, i) => {
    const cell = ws.getCell(CONSULTING_HEADER_ROW, 22 + i);
    cell.value = h;
    styleHeader(cell);
  });

  // Footnotes
  ws.getCell('A30').value = '**Note: Total hours = Hrs/Wk × Weeks. Adjust either input to recalculate.';
  ws.getCell('A30').font = { italic: true, size: 9 };
  ws.getCell('A31').value = '***Team members located outside of NA (Rest of World) are excluded from the NA GM calculation. Tag their Practice/Capability Group with a name ending in "(US)" to flag them as NA.';
  ws.getCell('A31').font = { italic: true, size: 9 };

  // ===== Subcontracting =====
  const subconHeaders = [
    'Subcontractor Company', 'Project Role', 'Subcontractor Name',
    '', 'Proposal/SOW Bill Rate (Hourly)', '',
    'Proposal/SOW Bill Rate (Daily)', 'Hrs/Wk', 'Rev/Wk', 'Weeks',
    'Total Hrs', 'Total Days', 'Total Revenue',
    'Hourly Cost', 'Daily Cost', 'Total Cost',
    'Project GM% ****', 'Project GM', 'Practice', 'Notes',
  ];
  subconHeaders.forEach((h, i) => {
    const cell = ws.getCell(SUBCON_HEADER_ROW, i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  ws.getRow(SUBCON_HEADER_ROW).height = 40;

  const externals = (book.externalTeam ?? []).slice(0, SUBCON_MAX_ROWS);
  for (let i = 0; i < SUBCON_MAX_ROWS; i += 1) {
    const r = SUBCON_FIRST_DATA_ROW + i;
    const ext = externals[i];
    if (ext) {
      ws.getCell(r, 1).value = ext.name;
      ws.getCell(r, 2).value = ext.role;
      ws.getCell(r, 3).value = '';
      ws.getCell(r, 13).value = ext.price;
      ws.getCell(r, 16).value = ext.cost;
      ws.getCell(r, 19).value = ext.description || '';
    }
    styleEditable(ws.getCell(r, 1));
    styleEditable(ws.getCell(r, 2));
    styleEditable(ws.getCell(r, 3));
    styleLocked(ws.getCell(r, 4));
    styleEditable(ws.getCell(r, 5), MONEY_FORMAT);
    styleLocked(ws.getCell(r, 6));
    styleFormula(ws.getCell(r, 7), MONEY_FORMAT);
    ws.getCell(r, 7).value = { formula: `E${r}*8` };
    styleEditable(ws.getCell(r, 8));
    styleFormula(ws.getCell(r, 9), MONEY_FORMAT);
    ws.getCell(r, 9).value = { formula: `E${r}*H${r}` };
    styleEditable(ws.getCell(r, 10));
    styleFormula(ws.getCell(r, 11), NUMBER_FORMAT);
    ws.getCell(r, 11).value = { formula: `H${r}*J${r}` };
    styleFormula(ws.getCell(r, 12), NUMBER_FORMAT);
    ws.getCell(r, 12).value = { formula: `K${r}/8` };
    if (ext) {
      // Override Total Revenue formula with the flat price (no hourly decomposition)
      ws.getCell(r, 13).value = ext.price;
    } else {
      ws.getCell(r, 13).value = { formula: `K${r}*E${r}` };
    }
    styleEditable(ws.getCell(r, 13), MONEY_FORMAT);
    styleEditable(ws.getCell(r, 14), MONEY_FORMAT);
    styleFormula(ws.getCell(r, 15), MONEY_FORMAT);
    ws.getCell(r, 15).value = { formula: `N${r}*8` };
    if (ext) {
      ws.getCell(r, 16).value = ext.cost;
    } else {
      ws.getCell(r, 16).value = { formula: `K${r}*N${r}` };
    }
    styleEditable(ws.getCell(r, 16), MONEY_FORMAT);
    styleFormula(ws.getCell(r, 17), PERCENT_FORMAT);
    ws.getCell(r, 17).value = { formula: `IFERROR((M${r}-P${r})/M${r}, 0)` };
    styleFormula(ws.getCell(r, 18), MONEY_FORMAT);
    ws.getCell(r, 18).value = { formula: `M${r}-P${r}` };
    styleEditable(ws.getCell(r, 19));
    styleEditable(ws.getCell(r, 20));
  }
  const sr = SUBCON_TOTAL_ROW;
  ws.getCell(sr, 11).value = { formula: `SUM(K${SUBCON_FIRST_DATA_ROW}:K${SUBCON_LAST_DATA_ROW})` };
  ws.getCell(sr, 12).value = { formula: `SUM(L${SUBCON_FIRST_DATA_ROW}:L${SUBCON_LAST_DATA_ROW})` };
  ws.getCell(sr, 13).value = { formula: `SUM(M${SUBCON_FIRST_DATA_ROW}:M${SUBCON_LAST_DATA_ROW})` };
  ws.getCell(sr, 16).value = { formula: `SUM(P${SUBCON_FIRST_DATA_ROW}:P${SUBCON_LAST_DATA_ROW})` };
  ws.getCell(sr, 17).value = { formula: `IFERROR((M${sr}-P${sr})/M${sr}, 0)` };
  ws.getCell(sr, 18).value = { formula: `M${sr}-P${sr}` };
  ws.getCell(sr, 19).value = 'Subcontracting Total';
  ws.getCell(sr, 19).alignment = { horizontal: 'right' };
  for (let c = 1; c <= 20; c += 1) styleTotalRow(ws.getCell(sr, c));
  styleTotalRow(ws.getCell(sr, 11), NUMBER_FORMAT);
  styleTotalRow(ws.getCell(sr, 12), NUMBER_FORMAT);
  styleTotalRow(ws.getCell(sr, 13), MONEY_FORMAT);
  styleTotalRow(ws.getCell(sr, 16), MONEY_FORMAT);
  styleTotalRow(ws.getCell(sr, 17), PERCENT_FORMAT);
  styleTotalRow(ws.getCell(sr, 18), MONEY_FORMAT);

  workbook.definedNames.add(`Pricing!$M$${sr}`, 'Subcontracting_Total_Revenue');
  workbook.definedNames.add(`Pricing!$P$${sr}`, 'Subcontracting_Total_Cost');

  ws.getCell('A42').value = '****Subcontracting GM Guidance from PST: Target of +30%. If GM% is below 30%, requires CG review.';
  ws.getCell('A42').font = { italic: true, size: 9 };

  // ===== Travel (rows 45-49) =====
  ws.getCell('A45').value = 'Travel Details:';
  ws.getCell('A45').font = { bold: true };
  ['Arrangement Type', 'Detail', 'Travel $'].forEach((h, i) => {
    const cell = ws.getCell(46, 1 + i);
    cell.value = h;
    styleHeader(cell);
  });
  ws.getCell('A47').value = '% of Consulting Revenue';
  ws.getCell('B47').value = book.tePercent / 100;
  styleEditable(ws.getCell('B47'), PERCENT_FORMAT);
  ws.getCell('C47').value = { formula: 'B47 * Consulting_Total_Revenue' };
  styleFormula(ws.getCell('C47'), MONEY_FORMAT);
  ws.getCell('A48').value = 'Flat Fee';
  ws.getCell('B48').value = 0;
  styleEditable(ws.getCell('B48'), MONEY_FORMAT);
  ws.getCell('C48').value = { formula: 'B48' };
  styleFormula(ws.getCell('C48'), MONEY_FORMAT);
  ws.getCell('B49').value = 'Travel Total';
  ws.getCell('B49').font = { bold: true };
  ws.getCell('B49').alignment = { horizontal: 'right' };
  ws.getCell('C49').value = { formula: 'SUM(C47:C48)' };
  styleTotalRow(ws.getCell('C49'), MONEY_FORMAT);

  workbook.definedNames.add('Pricing!$C$49', 'Travel_Total');

  // ===== Additional Services (rows 52-58) =====
  ws.getCell('A52').value = 'Additional Services:';
  ws.getCell('A52').font = { bold: true };
  ['Service', 'Detail', 'Revenue', 'Cost'].forEach((h, i) => {
    const cell = ws.getCell(53, 1 + i);
    cell.value = h;
    styleHeader(cell);
  });
  for (let i = 0; i < 4; i += 1) {
    const r = 54 + i;
    styleEditable(ws.getCell(r, 1));
    styleEditable(ws.getCell(r, 2));
    styleEditable(ws.getCell(r, 3), MONEY_FORMAT);
    styleEditable(ws.getCell(r, 4), MONEY_FORMAT);
  }
  ws.getCell('C58').value = { formula: 'SUM(C54:C57)' };
  ws.getCell('D58').value = { formula: 'SUM(D54:D57)' };
  ws.getCell('E58').value = 'Additional Services Total';
  ws.getCell('E58').alignment = { horizontal: 'left' };
  styleTotalRow(ws.getCell('C58'), MONEY_FORMAT);
  styleTotalRow(ws.getCell('D58'), MONEY_FORMAT);

  workbook.definedNames.add('Pricing!$C$58', 'Additional_Services_Total_Revenue');
  workbook.definedNames.add('Pricing!$D$58', 'Additional_Services_Total_Cost');

  // ===== Conditional Formatting =====
  // GM% on consulting Q18:Q28 and Grand Total P3:P7 (NA GM%)
  ['Q', 'Y'].forEach(col => {
    ws.addConditionalFormatting({
      ref: `${col}${CONSULTING_FIRST_DATA_ROW}:${col}${CONSULTING_TOTAL_ROW}`,
      rules: [
        { type: 'cellIs', operator: 'lessThan', priority: 1, formulae: ['0.4'], style: { fill: fill(COLORS.warningRed) } },
        { type: 'cellIs', operator: 'between', priority: 2, formulae: ['0.4', '0.4999999'], style: { fill: fill(COLORS.cautionYellow) } },
        { type: 'cellIs', operator: 'greaterThan', priority: 3, formulae: ['0.4999999'], style: { fill: fill(COLORS.targetGreen) } },
      ],
    });
  });
  ws.addConditionalFormatting({
    ref: `P3:P7`,
    rules: [
      { type: 'cellIs', operator: 'lessThan', priority: 1, formulae: ['0.4'], style: { fill: fill(COLORS.warningRed) } },
      { type: 'cellIs', operator: 'between', priority: 2, formulae: ['0.4', '0.4999999'], style: { fill: fill(COLORS.cautionYellow) } },
      { type: 'cellIs', operator: 'greaterThan', priority: 3, formulae: ['0.4999999'], style: { fill: fill(COLORS.targetGreen) } },
    ],
  });
  // % of List discount flag
  ws.addConditionalFormatting({
    ref: `F${CONSULTING_FIRST_DATA_ROW}:F${CONSULTING_LAST_DATA_ROW}`,
    rules: [
      { type: 'expression', priority: 1, formulae: [`AND(F${CONSULTING_FIRST_DATA_ROW}<>"",F${CONSULTING_FIRST_DATA_ROW}<1,F${CONSULTING_FIRST_DATA_ROW}>0)`], style: { fill: fill(COLORS.warningRed) } },
    ],
  });
  // Subcontracting GM
  ws.addConditionalFormatting({
    ref: `Q${SUBCON_FIRST_DATA_ROW}:Q${SUBCON_TOTAL_ROW}`,
    rules: [
      { type: 'expression', priority: 1, formulae: [`AND(Q${SUBCON_FIRST_DATA_ROW}<>"",Q${SUBCON_FIRST_DATA_ROW}<0.3)`], style: { fill: fill(COLORS.warningRed) } },
    ],
  });
  // Variance
  ws.addConditionalFormatting({
    ref: 'N11',
    rules: [
      { type: 'expression', priority: 1, formulae: ['ABS(N11)<=0.01'], style: { fill: fill(COLORS.targetGreen) } },
      { type: 'expression', priority: 2, formulae: ['ABS(N11)>0.01'], style: { fill: fill(COLORS.warningRed) } },
    ],
  });

  // ===== Data Validation =====
  if (levels.length > 0) {
    for (let r = CONSULTING_FIRST_DATA_ROW; r <= CONSULTING_LAST_DATA_ROW; r += 1) {
      ws.getCell(r, 1).dataValidation = { type: 'list', allowBlank: true, formulae: ['Wavestone_Levels'], errorStyle: 'information' };
    }
  }

  // ===== Sheet protection =====
  // Rate card / dropdown source cells already marked editable. Apply protection.
  // Mark project detail editable cells (already styled). Mark additional services and travel inputs (already styled).
  // Lookup-key helper Z and U should be locked but hidden.
  ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });
}

function addWeeklyAllocationSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const weekCount = Math.max(1, book.lineItems.reduce((max, item) => Math.max(max, item.days.length), 0));
  const ws = workbook.addWorksheet('Weekly Allocation', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });

  ws.columns = [
    { width: 20 }, { width: 24 }, { width: 30 },
    ...Array.from({ length: weekCount }, () => ({ width: 8 })),
    { width: 12 },
  ];

  ws.mergeCells(1, 1, 1, weekCount + 4);
  const title = ws.getCell(1, 1);
  title.value = 'Weekly Allocation Detail';
  title.font = { bold: true, size: 14, color: { argb: `FF${COLORS.wavestonePurple}` } };

  ws.mergeCells(2, 1, 2, weekCount + 4);
  ws.getCell(2, 1).value = `${book.client} - ${book.engagement}`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: `FF${COLORS.gray}` } };

  const headerRow = ws.getRow(4);
  headerRow.values = [
    'Role', 'Consultant', 'Rate Card',
    ...Array.from({ length: weekCount }, (_, i) => `W${i + 1}`),
    'Total',
  ];
  headerRow.eachCell(cell => styleHeader(cell));

  book.lineItems.forEach((item, index) => {
    const r = index + 5;
    const totalCol = weekCount + 4;
    ws.getCell(r, 1).value = item.role;
    ws.getCell(r, 2).value = item.name || '';
    ws.getCell(r, 3).value = item.rateCardName ?? book.baseRateCardName;
    for (let w = 0; w < weekCount; w += 1) {
      const cell = ws.getCell(r, 4 + w);
      cell.value = item.days[w] ?? 0;
      styleEditable(cell, NUMBER_FORMAT);
    }
    const totalCell = ws.getCell(r, totalCol);
    totalCell.value = { formula: `SUM(D${r}:${ws.getColumn(totalCol - 1).letter}${r})` };
    styleFormula(totalCell, NUMBER_FORMAT);
  });
}

function addPhasedPricingSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const phasedRows = book.phasedPricing ?? [];
  const ws = workbook.addWorksheet('Phased Pricing', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });
  ws.columns = [
    { width: 12 }, { width: 24 }, { width: 32 },
    { width: 18 }, { width: 18 }, { width: 18 },
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Phased Pricing';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${COLORS.wavestonePurple}` } };

  const headers = ['Phase #', 'Phase Name', 'Deliverable Name', 'Estimated Start Date', 'Estimated End Date', 'Proposed Fee'];
  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.eachCell(cell => styleHeader(cell));

  phasedRows.forEach((row, i) => {
    const r = i + 5;
    ws.getCell(r, 1).value = row.phaseNumber;
    ws.getCell(r, 2).value = row.phaseName;
    ws.getCell(r, 3).value = row.deliverableName;
    ws.getCell(r, 4).value = row.estimatedStartDate;
    ws.getCell(r, 5).value = row.estimatedEndDate;
    ws.getCell(r, 6).value = row.proposedFee;
    ws.getCell(r, 6).numFmt = MONEY_FORMAT;
    for (let c = 1; c <= 6; c += 1) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
  });
}

function addHandoffNotesSheet(workbook: ExcelJS.Workbook, book: PricingBook) {
  const ws = workbook.addWorksheet('Handoff Notes', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 22 }, { width: 96 }];

  ws.mergeCells('A1:B1');
  ws.getCell('A1').value = 'Handoff Notes';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${COLORS.wavestonePurple}` } };

  const rows: Array<[string, string]> = [
    ['Client', book.client],
    ['Engagement', book.engagement],
    ['Rate Card(s)', book.baseRateCardName],
    ['Status', book.status],
    ['Notes', book.notes || 'No notes entered.'],
  ];
  rows.forEach(([label, value], i) => {
    const r = ws.getRow(i + 3);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = value;
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });
}

export interface ExportOptions {
  teamAndFee: boolean;
  weeklyAllocation: boolean;
  phasedPricing: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  teamAndFee: true,
  weeklyAllocation: true,
  phasedPricing: true,
};

function resolveExportOptions(book: PricingBook, options?: ExportOptions): ExportOptions {
  return options ?? {
    teamAndFee: true,
    weeklyAllocation: shouldShowWeeklyAllocation(book.showWeeklyAllocation, book.lineItems),
    phasedPricing: (book.phasedPricing?.length ?? 0) > 0,
  };
}

export function buildBookWorkbook(book: PricingBook, rateCards: RateCard[] = [], options?: ExportOptions): ExcelJS.Workbook {
  const resolvedOptions = resolveExportOptions(book, options);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'probook';
  workbook.lastModifiedBy = 'probook';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = `${book.client} - ${book.engagement}`;
  workbook.company = 'Wavestone';
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.views = [{ x: 0, y: 0, width: 16000, height: 9000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  if (resolvedOptions.teamAndFee) addPricingSheet(workbook, book, rateCards);
  if (resolvedOptions.weeklyAllocation) addWeeklyAllocationSheet(workbook, book);
  if (resolvedOptions.phasedPricing) addPhasedPricingSheet(workbook, book);
  if (resolvedOptions.teamAndFee) addHandoffNotesSheet(workbook, book);

  return workbook;
}

export async function exportBookToExcel(book: PricingBook, rateCards: RateCard[] = [], options?: ExportOptions): Promise<void> {
  const workbook = buildBookWorkbook(book, rateCards, options);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const client = cleanFilePart(book.client) || 'Client';
  const engagement = cleanFilePart(book.engagement) || 'Engagement';
  const link = document.createElement('a');
  link.href = url;
  link.download = `Wavestone_NA_Pricing_Template_${client}_${engagement}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
