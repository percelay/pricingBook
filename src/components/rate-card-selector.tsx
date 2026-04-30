'use client';

import { BookRegion, RateCard, BOOK_REGION_FLAG, REGION_FLAG } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RateCardSelectorProps {
  region: BookRegion;
  rateCards: RateCard[];
  selectedRateCardIds: string[];
  onRegionChange: (region: BookRegion) => void;
  onSingleRateCardChange: (rateCardId: string) => void;
  onToggleRateCard: (rateCardId: string) => void;
}

const BOOK_REGIONS: BookRegion[] = ['US', 'France', 'England', 'Hybrid'];

export default function RateCardSelector({
  region,
  rateCards,
  selectedRateCardIds,
  onRegionChange,
  onSingleRateCardChange,
  onToggleRateCard,
}: RateCardSelectorProps) {
  const selectedSet = new Set(selectedRateCardIds);
  const singleRegionCards = region === 'Hybrid' ? [] : rateCards.filter(card => card.region === region);
  const singleValue = region === 'Hybrid' ? '' : selectedRateCardIds[0] ?? singleRegionCards[0]?.id ?? '';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Region</Label>
        <Select value={region} onValueChange={value => value && onRegionChange(value as BookRegion)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOOK_REGIONS.map(value => (
              <SelectItem key={value} value={value}>
                {BOOK_REGION_FLAG[value]} {value === 'US' ? 'United States' : value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {region !== 'Hybrid' ? (
        <div className="space-y-1.5">
          <Label>Rate Card</Label>
          <Select value={singleValue} onValueChange={value => value && onSingleRateCardChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select rate card">
                {(value: string) => rateCards.find(card => card.id === value)?.name ?? 'Select rate card'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {singleRegionCards.map(card => (
                <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2 sm:col-span-2">
          <Label>Hybrid Rate Cards</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rateCards.map(card => {
              const checked = selectedSet.has(card.id);
              return (
                <label
                  key={card.id}
                  className="flex cursor-pointer items-start gap-2 border border-gray-200 p-2.5 text-sm transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRateCard(card.id)}
                    className="mt-0.5 h-4 w-4 border-gray-300 accent-[#5fa07a]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-800">{card.name}</span>
                    <span className="text-xs text-gray-400">{REGION_FLAG[card.region]} {card.region}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
