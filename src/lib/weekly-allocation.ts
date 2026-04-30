import { LineItem } from './types';

export function canAddWeeklyAllocation(lineItems: LineItem[]): boolean {
  return lineItems.length > 0;
}

export function shouldShowWeeklyAllocation(showWeeklyAllocation: boolean | undefined, lineItems: LineItem[]): boolean {
  return Boolean(showWeeklyAllocation && canAddWeeklyAllocation(lineItems));
}
