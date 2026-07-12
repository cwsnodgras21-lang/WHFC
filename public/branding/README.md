# WHFC brand assets

Official White House Family Care artwork used by the app.

## Files

- `White House Family Care Banner.jpg` — the official source artwork (heart + wordmark
  lockup with the retro brand stripes). This is the visual source of truth.
- `whfc-logo.png` — the official **logo lockup** (heart + "White House Family Care"
  wordmark). Loaded by the app at `/branding/whfc-logo.png` in the sidebar and on the
  sign-in screen. Produced by a **lossless crop** of the banner above — original pixels,
  no recolor, redraw, or substitution.
- `whfc-mark.png` — the heart-only mark, cropped from the same banner. Available for
  compact/square placements.

## Rules

- Use the official artwork only — do not recolor, distort, redraw, or substitute the logo.
- If `whfc-logo.png` is ever **missing**, the sidebar and sign-in screens fall back to an
  intentional text-only lockup (no broken image, no empty gap).

## Regenerating the logo from the banner

The crop is a plain extraction of the lockup region (no color changes):

```js
// node, with sharp
const sharp = require("sharp");
const src = "public/branding/White House Family Care Banner.jpg";
sharp(src).extract({ left: 440, top: 408, width: 1262, height: 316 })
  .png().toFile("public/branding/whfc-logo.png");
sharp(src).extract({ left: 438, top: 410, width: 274, height: 314 })
  .png().toFile("public/branding/whfc-mark.png");
```
