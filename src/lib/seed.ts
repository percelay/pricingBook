import { RateCard, PricingBook } from './types';
import { getRateCards, upsertRateCard, getPricingBooks, upsertPricingBook, ensureSchema } from './store';
import { uniformDays } from './calculations';

export function seedDemoData(): void {
  ensureSchema();
  if (getRateCards().length > 0) return;

  const now = new Date().toISOString();

  const cards: RateCard[] = [
    {
      id: 'rc-us-2025',
      name: 'US Standard 2025',
      region: 'US',
      currency: 'USD',
      roles: [
        { role: 'Consultant',        dailyRate: 1500, dailyCost: 520 },
        { role: 'Senior Consultant', dailyRate: 2200, dailyCost: 780 },
        { role: 'Manager',           dailyRate: 3000, dailyCost: 1050 },
        { role: 'Senior Manager',    dailyRate: 4200, dailyCost: 1500 },
        { role: 'Partner',           dailyRate: 6500, dailyCost: 2300 },
        { role: 'Contractor',        dailyRate: 1200, dailyCost: 1000 },
      ],
      createdAt: now,
    },
    {
      id: 'rc-us-acme',
      name: 'Acme Corp — Premium 2025',
      region: 'US',
      currency: 'USD',
      roles: [
        { role: 'Consultant',        dailyRate: 1700, dailyCost: 520 },
        { role: 'Senior Consultant', dailyRate: 2500, dailyCost: 780 },
        { role: 'Manager',           dailyRate: 3400, dailyCost: 1050 },
        { role: 'Senior Manager',    dailyRate: 4700, dailyCost: 1500 },
        { role: 'Partner',           dailyRate: 7200, dailyCost: 2300 },
        { role: 'Contractor',        dailyRate: 1400, dailyCost: 1000 },
      ],
      createdAt: now,
    },
    {
      id: 'rc-us-meridian',
      name: 'Meridian Financial — Volume 2025',
      region: 'US',
      currency: 'USD',
      roles: [
        { role: 'Consultant',        dailyRate: 1350, dailyCost: 520 },
        { role: 'Senior Consultant', dailyRate: 2000, dailyCost: 780 },
        { role: 'Manager',           dailyRate: 2700, dailyCost: 1050 },
        { role: 'Senior Manager',    dailyRate: 3800, dailyCost: 1500 },
        { role: 'Partner',           dailyRate: 6000, dailyCost: 2300 },
        { role: 'Contractor',        dailyRate: 1100, dailyCost: 1000 },
      ],
      createdAt: now,
    },
    {
      id: 'rc-us-globex',
      name: 'Globex Industries — MSA 2025',
      region: 'US',
      currency: 'USD',
      roles: [
        { role: 'Consultant',        dailyRate: 1450, dailyCost: 520 },
        { role: 'Senior Consultant', dailyRate: 2100, dailyCost: 780 },
        { role: 'Manager',           dailyRate: 2900, dailyCost: 1050 },
        { role: 'Senior Manager',    dailyRate: 4000, dailyCost: 1500 },
        { role: 'Partner',           dailyRate: 6200, dailyCost: 2300 },
        { role: 'Contractor',        dailyRate: 1150, dailyCost: 1000 },
      ],
      createdAt: now,
    },
    {
      id: 'rc-fr-2025',
      name: 'France Standard 2025',
      region: 'France',
      currency: 'EUR',
      roles: [
        { role: 'Consultant',        dailyRate: 1200, dailyCost: 440 },
        { role: 'Senior Consultant', dailyRate: 1800, dailyCost: 650 },
        { role: 'Manager',           dailyRate: 2600, dailyCost: 920 },
        { role: 'Senior Manager',    dailyRate: 3600, dailyCost: 1300 },
        { role: 'Partner',           dailyRate: 5500, dailyCost: 1950 },
        { role: 'Contractor',        dailyRate: 1000, dailyCost: 850 },
      ],
      createdAt: now,
    },
    {
      id: 'rc-fr-lafarge',
      name: 'Lafarge Group — Custom 2025',
      region: 'France',
      currency: 'EUR',
      roles: [
        { role: 'Consultant',        dailyRate: 1100, dailyCost: 440 },
        { role: 'Senior Consultant', dailyRate: 1700, dailyCost: 650 },
        { role: 'Manager',           dailyRate: 2400, dailyCost: 920 },
        { role: 'Senior Manager',    dailyRate: 3400, dailyCost: 1300 },
        { role: 'Partner',           dailyRate: 5200, dailyCost: 1950 },
        { role: 'Contractor',        dailyRate: 950,  dailyCost: 850 },
      ],
      createdAt: now,
    },
  ];

  cards.forEach(upsertRateCard);

  if (getPricingBooks().length > 0) return;

  const offset = (n: number, days: number[]): number[] => [...Array(n).fill(0), ...days];

  const books: PricingBook[] = [
    {
      id: 'book-1',
      client: 'Acme Corporation',
      engagement: 'Supply Chain Transformation',
      region: 'US',
      baseRateCardId: 'rc-us-acme',
      baseRateCardName: 'Acme Corp — Premium 2025',
      status: 'Final',
      discount: 5,
      markup: 0,
      tePercent: 5,
      lineItems: [
        { id: 'li-1', role: 'Partner',           name: 'Sarah Chen',     days: uniformDays(2, 5),               dailyRate: 7200, dailyCost: 2300 },
        { id: 'li-2', role: 'Manager',           name: 'Marcus Webb',    days: uniformDays(6, 5),               dailyRate: 3400, dailyCost: 1050 },
        { id: 'li-3', role: 'Senior Consultant', name: 'David Park',     days: offset(2, uniformDays(12, 5)),   dailyRate: 2500, dailyCost: 780 },
        { id: 'li-4', role: 'Consultant',        name: 'Priya Patel',    days: offset(4, uniformDays(8, 5)),    dailyRate: 1700, dailyCost: 520 },
      ],
      notes: 'Fixed-fee engagement with 5% loyalty discount. T&E budgeted at 5% for Chicago site visits.',
      versions: [],
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-02-01T14:00:00Z',
    },
    {
      id: 'book-2',
      client: 'Meridian Financial',
      engagement: 'Digital Strategy Review',
      region: 'US',
      baseRateCardId: 'rc-us-meridian',
      baseRateCardName: 'Meridian Financial — Volume 2025',
      status: 'Draft',
      discount: 0,
      markup: 10,
      tePercent: 6,
      lineItems: [
        { id: 'li-5', role: 'Partner',           name: 'James Wilson',   days: uniformDays(1, 5),              dailyRate: 6000, dailyCost: 2300 },
        { id: 'li-6', role: 'Senior Manager',    name: 'Lisa Tanaka',    days: uniformDays(4, 5),              dailyRate: 3800, dailyCost: 1500 },
        { id: 'li-7', role: 'Senior Consultant', name: 'Roberto Silva',  days: offset(1, uniformDays(6, 5)),   dailyRate: 2000, dailyCost: 780 },
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
      baseRateCardId: 'rc-fr-lafarge',
      baseRateCardName: 'Lafarge Group — Custom 2025',
      status: 'Draft',
      discount: 0,
      markup: 0,
      tePercent: 4,
      lineItems: [
        { id: 'li-8',  role: 'Partner',    name: 'Pierre Dubois',     days: uniformDays(2, 4),               dailyRate: 5200, dailyCost: 1950 },
        { id: 'li-9',  role: 'Manager',    name: 'Elena Marchetti',   days: offset(1, uniformDays(5, 5)),    dailyRate: 2400, dailyCost: 920 },
        { id: 'li-10', role: 'Consultant', name: 'Amit Kumar',        days: offset(2, uniformDays(10, 5)),   dailyRate: 1100, dailyCost: 440 },
      ],
      notes: 'Paris-based engagement. Partner travel from NYC included in T&E.',
      versions: [],
      createdAt: '2025-04-01T08:00:00Z',
      updatedAt: '2025-04-01T08:00:00Z',
    },
    {
      id: 'book-4',
      client: 'Globex Industries',
      engagement: 'M&A Integration Planning',
      region: 'US',
      baseRateCardId: 'rc-us-globex',
      baseRateCardName: 'Globex Industries — MSA 2025',
      status: 'Final',
      discount: 0,
      markup: 5,
      tePercent: 7,
      lineItems: [
        { id: 'li-11', role: 'Partner',           name: 'Helena Reyes',   days: uniformDays(3, 4),               dailyRate: 6200, dailyCost: 2300 },
        { id: 'li-12', role: 'Senior Manager',    name: "Tom O'Brien",    days: uniformDays(8, 5),               dailyRate: 4000, dailyCost: 1500 },
        { id: 'li-13', role: 'Manager',           name: 'Yuki Tanaka',    days: offset(1, uniformDays(8, 5)),    dailyRate: 2900, dailyCost: 1050 },
        { id: 'li-14', role: 'Senior Consultant', name: 'Nadia Hassan',   days: offset(2, uniformDays(6, 5)),    dailyRate: 2100, dailyCost: 780 },
        { id: 'li-15', role: 'Contractor',        name: 'Devon Brooks',   days: offset(2, uniformDays(4, 4)),    dailyRate: 1150, dailyCost: 1000 },
      ],
      notes: 'Cross-border integration. Heavy travel expected — T&E set to 7%. Contractor brought in for SAP expertise.',
      versions: [],
      createdAt: '2025-02-20T11:00:00Z',
      updatedAt: '2025-03-15T16:00:00Z',
    },
  ];

  books.forEach(upsertPricingBook);
}
