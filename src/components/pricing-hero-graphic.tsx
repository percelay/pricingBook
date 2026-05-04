'use client';

export default function PricingHeroGraphic({ variant = 'books' }: { variant?: 'books' | 'rates' }) {
  return (
    <div className="compact-pricing-graphic" aria-hidden="true" data-variant={variant}>
      <div className="compact-sheet compact-sheet-back" />
      <div className="compact-sheet compact-sheet-front">
        <div className="compact-sheet-head">
          <span />
          <span />
          <span />
        </div>
        <div className="compact-ledger-grid">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
      <div className="compact-fee-ribbon compact-fee-ribbon-a" />
      <div className="compact-fee-ribbon compact-fee-ribbon-b" />
      <div className="compact-total-chip">
        <span>{variant === 'rates' ? 'RATE' : 'TOTAL'}</span>
        <strong>{variant === 'rates' ? 'ADR' : 'GM'}</strong>
      </div>
      <div className="compact-glint" />
    </div>
  );
}
