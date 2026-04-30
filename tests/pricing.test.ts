import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcTotals,
  lineSubtotal,
  resizeDays,
  setWeekDays,
  totalDays,
  uniformDays,
} from '../src/lib/calculations';
import { buildBookWorkbook } from '../src/lib/export';
import {
  buildLineItemFromRateCard,
  HYBRID_RATE_CARD_ID,
  normalizeRateCardIds,
  rateCardIdsForSelection,
  reassignLineItemsToAvailableCards,
} from '../src/lib/rate-card-selection';
import { canAddWeeklyAllocation, shouldShowWeeklyAllocation } from '../src/lib/weekly-allocation';
import { LineItem, PricingBook, RateCard } from '../src/lib/types';

function line(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: overrides.id ?? 'line-1',
    role: overrides.role ?? 'Consultant',
    name: overrides.name ?? '',
    days: overrides.days ?? uniformDays(4, 5),
    dailyRate: overrides.dailyRate ?? 1000,
    dailyCost: overrides.dailyCost ?? 400,
    rateCardId: overrides.rateCardId,
    rateCardName: overrides.rateCardName,
    rateCardRegion: overrides.rateCardRegion,
  };
}

function book(overrides: Partial<PricingBook> = {}): PricingBook {
  return {
    id: overrides.id ?? 'book-1',
    client: overrides.client ?? 'Globex Industries',
    engagement: overrides.engagement ?? 'Integration Planning',
    region: overrides.region ?? 'US',
    baseRateCardId: overrides.baseRateCardId ?? 'rc-1',
    baseRateCardName: overrides.baseRateCardName ?? 'US Standard',
    status: overrides.status ?? 'Draft',
    discount: overrides.discount ?? 0,
    markup: overrides.markup ?? 0,
    tePercent: overrides.tePercent ?? 0,
    lineItems: overrides.lineItems ?? [line()],
    showWeeklyAllocation: overrides.showWeeklyAllocation,
    phasedPricing: overrides.phasedPricing,
    notes: overrides.notes ?? '',
    versions: overrides.versions ?? [],
    createdAt: overrides.createdAt ?? '2026-04-30T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-04-30T00:00:00.000Z',
  };
}

function rateCard(overrides: Partial<RateCard> = {}): RateCard {
  return {
    id: overrides.id ?? 'rc-us',
    name: overrides.name ?? 'US Standard',
    region: overrides.region ?? 'US',
    currency: overrides.currency ?? 'USD',
    roles: overrides.roles ?? [
      { role: 'Consultant', dailyRate: 1500, dailyCost: 500 },
      { role: 'Manager', dailyRate: 3000, dailyCost: 1000 },
    ],
    createdAt: overrides.createdAt ?? '2026-04-30T00:00:00.000Z',
  };
}

test('totals and ADR return zero for an empty team', () => {
  const totals = calcTotals([], 10, 25, 7);

  assert.equal(totals.subtotal, 0);
  assert.equal(totals.totalDays, 0);
  assert.equal(totals.averageDailyRate, 0);
  assert.equal(totals.grandTotal, 0);
  assert.equal(totals.grossMarginPct, 0);
});

test('ADR is weighted by allocated days and totals honor commercial assumptions', () => {
  const lineItems = [
    line({ days: [2], dailyRate: 1000, dailyCost: 300 }),
    line({ days: [4, 4], dailyRate: 500, dailyCost: 200 }),
  ];

  const totals = calcTotals(lineItems, 10, 20, 5);

  assert.equal(totals.totalDays, 10);
  assert.equal(totals.subtotal, 6000);
  assert.equal(totals.averageDailyRate, 600);
  assert.equal(totals.discountAmount, 600);
  assert.equal(totals.afterDiscount, 5400);
  assert.equal(totals.markupAmount, 1080);
  assert.equal(totals.afterMarkup, 6480);
  assert.equal(totals.teAmount, 324);
  assert.equal(totals.grandTotal, 6804);
  assert.equal(totals.totalCost, 2200);
  assert.equal(totals.grossMargin, 4280);
});

test('weekly day helpers pad, trim, extend, and clamp safely', () => {
  assert.deepEqual(uniformDays(0, 5), []);
  assert.deepEqual(uniformDays(-2, 5), []);
  assert.deepEqual(resizeDays([3, 4], 4, 5), [3, 4, 5, 5]);
  assert.deepEqual(resizeDays([3, 4, 2], 2, 5), [3, 4]);
  assert.deepEqual(resizeDays([3, 4], 0, 5), []);
  assert.deepEqual(setWeekDays([], 2, 6), [0, 0, 6]);
  assert.deepEqual(setWeekDays([4, 4], 1, -3), [4, 0]);
});

test('editing weekly allocation updates line subtotals and pricing totals', () => {
  const original = line({ days: [5, 5], dailyRate: 1200, dailyCost: 500 });
  const edited = { ...original, days: setWeekDays(original.days, 1, 2) };

  assert.equal(totalDays(original), 10);
  assert.equal(totalDays(edited), 7);
  assert.equal(lineSubtotal(original), 12000);
  assert.equal(lineSubtotal(edited), 8400);
  assert.equal(calcTotals([original], 0, 0, 0).grandTotal, 12000);
  assert.equal(calcTotals([edited], 0, 0, 0).grandTotal, 8400);
  assert.equal(calcTotals([edited], 0, 0, 0).averageDailyRate, 1200);
});

test('weekly allocation visibility is opt-in and never appears without team fees', () => {
  const lineItems = [line()];

  assert.equal(canAddWeeklyAllocation([]), false);
  assert.equal(canAddWeeklyAllocation(lineItems), true);
  assert.equal(shouldShowWeeklyAllocation(undefined, lineItems), false);
  assert.equal(shouldShowWeeklyAllocation(false, lineItems), false);
  assert.equal(shouldShowWeeklyAllocation(true, []), false);
  assert.equal(shouldShowWeeklyAllocation(true, lineItems), true);
});

test('hiding weekly allocation preserves the totals-driving day arrays', () => {
  const lineItems = [line({ days: [5, 0, 2], dailyRate: 1400, dailyCost: 600 })];
  const visibleTotals = calcTotals(lineItems, 0, 0, 0);
  const hiddenTotals = calcTotals(lineItems, 0, 0, 0);

  assert.deepEqual(lineItems[0].days, [5, 0, 2]);
  assert.equal(visibleTotals.grandTotal, hiddenTotals.grandTotal);
  assert.equal(visibleTotals.totalDays, hiddenTotals.totalDays);
  assert.equal(visibleTotals.averageDailyRate, hiddenTotals.averageDailyRate);
});

test('workbook omits modular sheets until the user adds them', () => {
  const workbook = buildBookWorkbook(book({
    lineItems: [line()],
    showWeeklyAllocation: false,
    phasedPricing: undefined,
  }));

  assert.deepEqual(
    workbook.worksheets.map(sheet => sheet.name),
    ['Pricing Model', 'Handoff Notes']
  );
});

test('workbook includes weekly allocation and phased pricing only when enabled', () => {
  const workbook = buildBookWorkbook(book({
    lineItems: [line()],
    showWeeklyAllocation: true,
    phasedPricing: [{
      id: 'phase-1',
      phaseNumber: '1',
      phaseName: 'Mobilize',
      deliverableName: 'Kickoff',
      estimatedStartDate: '2026-05-01',
      estimatedEndDate: '2026-05-05',
      proposedFee: 25000,
    }],
  }));

  assert.deepEqual(
    workbook.worksheets.map(sheet => sheet.name),
    ['Pricing Model', 'Weekly Allocation', 'Phased Pricing', 'Handoff Notes']
  );
});

test('hybrid rate cards price consultants from different regions individually', () => {
  const us = rateCard();
  const france = rateCard({
    id: 'rc-fr',
    name: 'France Standard',
    region: 'France',
    roles: [
      { role: 'Consultant', dailyRate: 1300, dailyCost: 480 },
      { role: 'Manager', dailyRate: 2825, dailyCost: 1000 },
    ],
  });

  const usConsultant = buildLineItemFromRateCard('li-us', 'Consultant', us);
  const franceConsultant = buildLineItemFromRateCard('li-fr', 'Consultant', france);
  const totals = calcTotals([usConsultant, franceConsultant], 0, 0, 0);

  assert.equal(usConsultant.rateCardId, 'rc-us');
  assert.equal(usConsultant.rateCardRegion, 'US');
  assert.equal(usConsultant.dailyRate, 1500);
  assert.equal(franceConsultant.rateCardId, 'rc-fr');
  assert.equal(franceConsultant.rateCardRegion, 'France');
  assert.equal(franceConsultant.dailyRate, 1300);
  assert.equal(totals.subtotal, 56000);
  assert.equal(totals.totalCost, 19600);
});

test('hybrid rate card selection dedupes, falls back, and reassigns removed cards', () => {
  const us = rateCard();
  const france = rateCard({
    id: 'rc-fr',
    name: 'France Standard',
    region: 'France',
    roles: [
      { role: 'Consultant', dailyRate: 1300, dailyCost: 480 },
      { role: 'Manager', dailyRate: 2825, dailyCost: 1000 },
    ],
  });
  const cards = [us, france];

  assert.deepEqual(normalizeRateCardIds(['missing', 'rc-us', 'rc-us', 'rc-fr'], cards), ['rc-us', 'rc-fr']);
  assert.deepEqual(normalizeRateCardIds([], cards, 'rc-fr'), ['rc-fr']);
  assert.deepEqual(rateCardIdsForSelection(HYBRID_RATE_CARD_ID, cards), ['rc-us', 'rc-fr']);
  assert.deepEqual(rateCardIdsForSelection('rc-fr', cards), ['rc-fr']);

  const reassigned = reassignLineItemsToAvailableCards(
    [buildLineItemFromRateCard('li-fr', 'Consultant', france)],
    cards,
    ['rc-us']
  );

  assert.equal(reassigned[0].rateCardId, 'rc-us');
  assert.equal(reassigned[0].rateCardRegion, 'US');
  assert.equal(reassigned[0].dailyRate, 1500);
  assert.equal(reassigned[0].dailyCost, 500);
});

test('pricing model export includes consultant-level rate cards without region columns', () => {
  const workbook = buildBookWorkbook(book({
    region: 'Hybrid',
    baseRateCardId: HYBRID_RATE_CARD_ID,
    baseRateCardName: 'Hybrid',
    selectedRateCardIds: ['rc-us', 'rc-fr'],
    lineItems: [
      line({ id: 'li-us', rateCardId: 'rc-us', rateCardName: 'US Standard', rateCardRegion: 'US' }),
      line({ id: 'li-fr', rateCardId: 'rc-fr', rateCardName: 'France Standard', rateCardRegion: 'France' }),
    ],
  }));

  const pricingSheet = workbook.getWorksheet('Pricing Model');

  assert.ok(pricingSheet);
  assert.equal(pricingSheet.getCell('C23').value, 'Rate Card');
  assert.equal(pricingSheet.getCell('D23').value, 'Total Days');
  assert.equal(pricingSheet.getCell('C24').value, 'US Standard');
  assert.equal(pricingSheet.getCell('C25').value, 'France Standard');
  assert.notEqual(pricingSheet.getCell('A5').value, 'Region');
});
