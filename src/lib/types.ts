export type Role =
  | 'Consultant'
  | 'Senior Consultant'
  | 'Manager'
  | 'Senior Manager'
  | 'Partner'
  | 'Contractor';

export const ROLES: Role[] = [
  'Consultant',
  'Senior Consultant',
  'Manager',
  'Senior Manager',
  'Partner',
  'Contractor',
];

export type Region = 'US' | 'France' | 'England';
export type BookRegion = Region | 'Hybrid';
export type Currency = 'USD' | 'EUR';
export type BookStatus = 'Draft' | 'Final';
export type RateMode = 'daily' | 'hourly';
export type CurrencyMode = 'USD' | 'EUR';

export const HOURS_PER_DAY = 8;
export const TARGET_MARGIN_PCT = 30;
export const EUR_PER_USD = 0.92;

export const CURRENCY_BY_REGION: Record<Region, Currency> = {
  US: 'USD',
  France: 'USD',
  England: 'USD',
};

export const REGION_FLAG: Record<Region, string> = {
  US: '🇺🇸',
  France: '🇫🇷',
  England: '🇬🇧',
};

export const BOOK_REGION_FLAG: Record<BookRegion, string> = {
  ...REGION_FLAG,
  Hybrid: '🌐',
};

export interface RoleRate {
  role: Role;
  dailyRate: number;
  dailyCost: number;
}

export interface RateCard {
  id: string;
  name: string;
  region: Region;
  currency: Currency;
  roles: RoleRate[];
  createdAt: string;
}

export interface LineItem {
  id: string;
  role: Role;
  name: string;
  days: number[];
  dailyRate: number;
  dailyCost: number;
  rateCardId?: string;
  rateCardName?: string;
  rateCardRegion?: Region;
}

export interface PhasedPricingRow {
  id: string;
  phaseNumber: string;
  phaseName: string;
  deliverableName: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  proposedFee: number;
}

export interface PricingBookData {
  client: string;
  engagement: string;
  region: BookRegion;
  baseRateCardId: string;
  baseRateCardName: string;
  selectedRateCardIds?: string[];
  status: BookStatus;
  discount: number;
  markup: number;
  tePercent: number;
  lineItems: LineItem[];
  showWeeklyAllocation?: boolean;
  phasedPricing?: PhasedPricingRow[];
  notes: string;
}

export interface PricingBookVersion {
  version: number;
  savedAt: string;
  snapshot: PricingBookData;
}

export interface PricingBook extends PricingBookData {
  id: string;
  versions: PricingBookVersion[];
  createdAt: string;
  updatedAt: string;
}
