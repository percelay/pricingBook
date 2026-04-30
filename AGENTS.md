<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ProBook Project Rules

## Commands

- Run `npm test` for pricing calculations, workbook export coverage, and core edge cases.
- Run `npm run lint` after TSX or shared TypeScript edits.
- Run `npm run build` before pushing UI or Next.js route changes.

## Pricing UX

- Treat rate cards as one flat pool. Do not add region filtering to pricing workflows.
- Keep flags next to rate card names so users can distinguish US, France, and England cards.
- The main Rate Card dropdown must include a `Hybrid` option.
- Only show per-consultant Rate Card controls when `Hybrid` is selected. In Hybrid, each consultant must be able to choose any rate card.
- Do not expose Region in pricing UI, workbook selection cards, or pricing exports. Region may remain as internal legacy data for saved books and rate card administration.

## Layout

- Pricing editor pages should sit close to the left nav with a small gutter, not centered far away from it.
- Avoid forced horizontal scrolling inside editor cards. Team & Fees and Phased Pricing should fit cleanly in the left work area; weekly allocation can remain naturally wide.
- Keep dense pricing controls compact and scannable. Prefer icon buttons for repeated table actions.

## Data Compatibility

- Preserve existing saved books in localStorage when changing UI behavior.
- Keep `PricingBook.region` and rate-card region fields compatible with legacy records unless a migration is explicitly requested.
