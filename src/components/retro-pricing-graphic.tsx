'use client';

type RetroPricingGraphicProps = {
  mode?: 'login' | 'compact';
  variant?: 'books' | 'rates';
};

export default function RetroPricingGraphic({
  mode = 'login',
  variant = 'books',
}: RetroPricingGraphicProps) {
  return (
    <div className={`retro-pricing-graphic retro-pricing-graphic-${mode}`} data-variant={variant} aria-hidden="true">
      <div className="retro-grid-plane">
        {Array.from({ length: mode === 'login' ? 48 : 24 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="retro-book retro-book-a">
        <span />
        <span />
        <span />
      </div>
      <div className="retro-book retro-book-b">
        <span />
        <span />
        <span />
      </div>
      <div className="retro-scanline retro-scanline-a" />
      <div className="retro-scanline retro-scanline-b" />
      <div className="retro-price-node retro-price-node-a">
        <span>{variant === 'rates' ? 'RATE' : 'BOOK'}</span>
        <strong>{variant === 'rates' ? 'ADR' : 'GM'}</strong>
      </div>
      <div className="retro-price-node retro-price-node-b">
        <span>{variant === 'rates' ? 'COST' : 'FEE'}</span>
        <strong>{variant === 'rates' ? '$/D' : '$K'}</strong>
      </div>
      <svg className="retro-vector" viewBox="0 0 620 360" fill="none">
        <path d="M34 280L164 156L256 214L374 92L586 72" />
        <path d="M70 318L198 212L312 238L444 126L574 158" />
      </svg>
    </div>
  );
}
