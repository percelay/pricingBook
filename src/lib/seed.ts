import { RateCard, PricingBook } from './types';
import { getRateCards, upsertRateCard, getPricingBooks, upsertPricingBook } from './store';

export function seedDemoData(): void {
  if (getRateCards().length > 0) return;

  const now = new Date().toISOString();

  const usCard: RateCard = {
    id: 'rc-us-2025',
    name: 'US Standard 2025',
    region: 'US',
    currency: 'USD',
    roles: [
      { role: 'Consultant', dailyRate: 1500 },
      { role: 'Senior Consultant', dailyRate: 2200 },
      { role: 'Manager', dailyRate: 3000 },
      { role: 'Senior Manager', dailyRate: 4200 },
      { role: 'Partner', dailyRate: 6500 },
    ],
    createdAt: now,
  };

  const frCard: RateCard = {
    id: 'rc-fr-2025',
    name: 'France Standard 2025',
    region: 'France',
    currency: 'EUR',
    roles: [
      { role: 'Consultant', dailyRate: 1200 },
      { role: 'Senior Consultant', dailyRate: 1800 },
      { role: 'Manager', dailyRate: 2600 },
      { role: 'Senior Manager', dailyRate: 3600 },
      { role: 'Partner', dailyRate: 5500 },
    ],
    createdAt: now,
  };

  upsertRateCard(usCard);
  upsertRateCard(frCard);

  if (getPricingBooks().length > 0) return;

  const books: PricingBook[] = [
    {
      id: 'book-1',
      client: 'Acme Corporation',
      engagement: 'Supply Chain Transformation',
      region: 'US',
      baseRateCardId: 'rc-us-2025',
      baseRateCardName: 'US Standard 2025',
      status: 'Final',
      discount: 5,
      markup: 0,
      lineItems: [
        { id: 'li-1', role: 'Partner', days: 10, dailyRate: 6500, expenses: 0, travel: 1500 },
        { id: 'li-2', role: 'Manager', days: 30, dailyRate: 3000, expenses: 500, travel: 0 },
        { id: 'li-3', role: 'Senior Consultant', days: 60, dailyRate: 2200, expenses: 1000, travel: 2000 },
        { id: 'li-4', role: 'Consultant', days: 40, dailyRate: 1500, expenses: 0, travel: 0 },
      ],
      notes: 'Fixed-fee engagement with 5% loyalty discount. Travel for SC team in Chicago.',
      versions: [],
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-02-01T14:00:00Z',
    },
    {
      id: 'book-2',
      client: 'Meridian Financial',
      engagement: 'Digital Strategy Review',
      region: 'US',
      baseRateCardId: 'rc-us-2025',
      baseRateCardName: 'US Standard 2025',
      status: 'Draft',
      discount: 0,
      markup: 10,
      lineItems: [
        { id: 'li-5', role: 'Partner', days: 5, dailyRate: 6500, expenses: 0, travel: 0 },
        { id: 'li-6', role: 'Senior Manager', days: 20, dailyRate: 4200, expenses: 2000, travel: 3000 },
        { id: 'li-7', role: 'Senior Consultant', days: 30, dailyRate: 2200, expenses: 500, travel: 0 },
      ],
      notes: '',
      versions: [],
      createdAt: '2025-03-10T09:00:00Z',
      updatedAt: '2025-03-10T09:00:00Z',
    },
    {
      id: 'book-3',
      client: 'Lafarge Group',
      engagement: 'Operational Excellence',
      region: 'France',
      baseRateCardId: 'rc-fr-2025',
      baseRateCardName: 'France Standard 2025',
      status: 'Draft',
      discount: 0,
      markup: 0,
      lineItems: [
        { id: 'li-8', role: 'Partner', days: 8, dailyRate: 5500, expenses: 0, travel: 2000 },
        { id: 'li-9', role: 'Manager', days: 25, dailyRate: 2600, expenses: 1500, travel: 1000 },
        { id: 'li-10', role: 'Consultant', days: 50, dailyRate: 1200, expenses: 0, travel: 0 },
      ],
      notes: 'Paris-based engagement. Partner travel from NYC included.',
      versions: [],
      createdAt: '2025-04-01T08:00:00Z',
      updatedAt: '2025-04-01T08:00:00Z',
    },
  ];

  books.forEach(upsertPricingBook);
}
