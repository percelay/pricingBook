import { LineItem, RateCard, Role, BookRegion } from './types';
import { uniformDays } from './calculations';

export function normalizeRateCardIds(
  ids: Array<string | undefined>,
  cards: RateCard[],
  fallbackId?: string
): string[] {
  const knownIds = new Set(cards.map(card => card.id));
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id))));

  if (uniqueIds.length > 0) return uniqueIds;
  if (fallbackId && knownIds.has(fallbackId)) return [fallbackId];
  return cards[0] ? [cards[0].id] : [];
}

export function selectedRateCards(cards: RateCard[], ids: string[]): RateCard[] {
  const selected = new Set(ids);
  return cards.filter(card => selected.has(card.id));
}

export function describeRateCardSelection(cards: RateCard[], ids: string[]): string {
  const selected = selectedRateCards(cards, ids);
  if (selected.length === 0) return '';
  if (selected.length === 1) return selected[0].name;
  return `Hybrid: ${selected.map(card => card.name).join(' + ')}`;
}

export function bookRegionForRateCards(cards: RateCard[]): BookRegion {
  if (cards.length === 0) return 'US';
  const regions = new Set(cards.map(card => card.region));
  return regions.size === 1 ? cards[0].region : 'Hybrid';
}

export function applyRateCardToLineItem(item: LineItem, card: RateCard | undefined): LineItem {
  const roleRate = card?.roles.find(rate => rate.role === item.role);

  return {
    ...item,
    rateCardId: card?.id,
    rateCardName: card?.name,
    rateCardRegion: card?.region,
    dailyRate: roleRate?.dailyRate ?? 0,
    dailyCost: roleRate?.dailyCost ?? 0,
  };
}

export function buildLineItemFromRateCard(id: string, role: Role, card: RateCard | undefined): LineItem {
  return applyRateCardToLineItem({
    id,
    role,
    name: '',
    days: uniformDays(4, 5),
    dailyRate: 0,
    dailyCost: 0,
  }, card);
}

export function reassignLineItemsToAvailableCards(
  lineItems: LineItem[],
  cards: RateCard[],
  selectedIds: string[]
): LineItem[] {
  const selected = selectedRateCards(cards, selectedIds);
  const fallbackCard = selected[0];

  return lineItems.map(item => {
    const existingCard = selected.find(card => card.id === item.rateCardId);
    return applyRateCardToLineItem(item, existingCard ?? fallbackCard);
  });
}
