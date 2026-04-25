import { RateCard, PricingBook } from './types';

const RATE_CARDS_KEY = 'pb:rate_cards';
const BOOKS_KEY = 'pb:pricing_books';
const SCHEMA_KEY = 'pb:schema_version';
const SCHEMA_VERSION = '3';

export function ensureSchema(): void {
  if (typeof window === 'undefined') return;
  const v = window.localStorage.getItem(SCHEMA_KEY);
  if (v !== SCHEMA_VERSION) {
    window.localStorage.removeItem(RATE_CARDS_KEY);
    window.localStorage.removeItem(BOOKS_KEY);
    window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
  }
}

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getRateCards(): RateCard[] {
  return get<RateCard[]>(RATE_CARDS_KEY, []);
}

export function upsertRateCard(card: RateCard): void {
  const cards = getRateCards();
  const i = cards.findIndex(c => c.id === card.id);
  if (i >= 0) cards[i] = card;
  else cards.unshift(card);
  set(RATE_CARDS_KEY, cards);
}

export function deleteRateCard(id: string): void {
  set(RATE_CARDS_KEY, getRateCards().filter(c => c.id !== id));
}

export function getPricingBooks(): PricingBook[] {
  return get<PricingBook[]>(BOOKS_KEY, []);
}

export function getPricingBook(id: string): PricingBook | undefined {
  return getPricingBooks().find(b => b.id === id);
}

export function upsertPricingBook(book: PricingBook): void {
  const books = getPricingBooks();
  const i = books.findIndex(b => b.id === book.id);
  if (i >= 0) books[i] = book;
  else books.unshift(book);
  set(BOOKS_KEY, books);
}

export function deletePricingBook(id: string): void {
  set(BOOKS_KEY, getPricingBooks().filter(b => b.id !== id));
}
