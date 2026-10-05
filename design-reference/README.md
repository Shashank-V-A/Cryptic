# Design References

Expected visual references for VDA Ledger:

- `landing-page.png` — editorial landing page composition
- `all-pages-overview.png` — app shell and page overview
- Additional per-screen captures when available

## Status

Reference PNGs are **not checked into the repo**. UI follows the written scrapbook / editorial direction:

- Warm cream / off-white surfaces
- Dark charcoal typography and sidebar
- Muted botanical green + restrained terracotta accents
- Editorial serif headlines + clean sans body
- Subtle paper/editorial texture

## How to add references

1. Capture screens from Figma or production/staging.
2. Drop PNGs into this folder using the names above.
3. Open a PR noting pixel deltas vs current `apps/web` pages.

Until then, treat spacing/typography audits as token-driven (CSS variables in `packages/ui` + `apps/web/src/index.css`), not pixel-perfect against images.
