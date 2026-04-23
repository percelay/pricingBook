export type Role =
  | 'Consultant'
  | 'Senior Consultant'
  | 'Manager'
  | 'Senior Manager'
  | 'Partner';

export const ROLES: Role[] = [
  'Consultant',
  'Senior Consultant',
  'Manager',
  'Senior Manager',
  'Partner',
];

export type Region = 'US' | 'France';
export type Currency = 'USD' | 'EUR';
export type BookStatus = 'Draft' | 'Final';

export const CURRENCY_BY_REGION: Record<Region, Currency> = {
  US: 'USD',
  France: 'EUR',
};

export interface RoleRate {
  role: Role;
  dailyRate: number;
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
  days: number;
  dailyRate: number;
  expenses: number;
  travel: number;
}

export interface PricingBookData {
  client: string;
  engagement: string;
  region: Region;
  baseRateCardId: string;
  baseRateCardName: string;
  status: BookStatus;
  discount: number;
  markup: number;
  lineItems: LineItem[];
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
