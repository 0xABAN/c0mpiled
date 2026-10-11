# Roster pitch

- Present or share `roster-pitch.pdf`: two widescreen slides.
- Edit `index.html`; open it in a browser and use ← / → or the navigation buttons. Keep `assets/` beside it. No server or internet is needed to present.
- The 5% is deducted from the book price, not added to the buyer's bill. The split is before processor costs; the deck describes the business model, not live payment or payout availability.

Regenerate the PDF and check slide count, text, overflow, and navigation:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/export-pitch.mjs
```

Optional `SHOT_DIR=/tmp/roster-pitch-check` exports images for visual review. The deck reuses the app's Nunito Latin font; its OFL license is in `assets/OFL.txt`.
