/**
 * Chart mark colors — concrete hex so they resolve as SVG fill/stroke
 * attributes (CSS var() does not resolve inside SVG presentation attributes).
 * Each value is drawn from the WHFC brand palette in globals.css and has been
 * validated for lightness, chroma, and colorblind separation against the white
 * panel surface. Text, grid, and axes keep the neutral ink tokens.
 */
export const chartColors = {
  // Stock-health status (reserved status hues, always shown with labels)
  healthy: "#15803d", // --color-success (green)
  low: "#d98a0a", // amber — low stock
  out: "#c23b17", // brand red-orange — out of stock

  // Inventory movement (two-series categorical)
  received: "#16788e", // --color-primary (deep sky blue)
  consumed: "#b24a12", // --color-attention (brown-orange)

  // Replenishment priority (single-hue magnitude)
  replenishment: "#b24a12", // --color-attention

  // Chart chrome
  grid: "#e5ddd5", // --color-border
  axis: "#6b635c", // --color-fg-muted
  surface: "#ffffff", // --color-surface (segment gaps / rings)
} as const;

export const CHART_FONT_FAMILY = "var(--font-sans)";
export const CHART_TICK_FONT_SIZE = 12;
