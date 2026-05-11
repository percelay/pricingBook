'use client';

import { HYBRID_RATE_CARD_ID } from '@/lib/rate-card-selection';
import { RateCard, REGION_FLAG } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RateCardSelectorProps {
  value: string;
  rateCards: RateCard[];
  onChange: (value: string) => void;
}

export default function RateCardSelector({
  value,
  rateCards,
  onChange,
}: RateCardSelectorProps) {
  return (
    <Select value={value} onValueChange={next => next && onChange(next)}>
        <SelectTrigger className="h-8 w-full text-sm">
          <SelectValue placeholder="Select rate card">
            {(selected: string) => {
              if (selected === HYBRID_RATE_CARD_ID) return 'Hybrid';
              const card = rateCards.find(candidate => candidate.id === selected);
              return card ? `${REGION_FLAG[card.region]} ${card.name}` : 'Select rate card';
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={HYBRID_RATE_CARD_ID}>Hybrid</SelectItem>
          {rateCards.map(card => (
            <SelectItem key={card.id} value={card.id}>
              {REGION_FLAG[card.region]} {card.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
}
