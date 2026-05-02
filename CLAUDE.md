# Claude Guidance

Use `AGENTS.md` as the canonical repository instruction file. Follow it fully for Next.js, pricing behavior, layout, testing, and compatibility rules.

Quick reminders:

- Read the relevant `node_modules/next/dist/docs/` guide before changing Next.js code.
- Keep pricing rate cards flat with `Hybrid` as the only mode that enables per-consultant rate-card selection.
- Do not reintroduce Region into pricing screens, workbook cards, or exports.
- Run `npm test`, `npm run lint`, and `npm run build` before pushing.
