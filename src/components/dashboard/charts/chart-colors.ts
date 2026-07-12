/**
 * Chart mark colors — concrete hex so they resolve as SVG fill/stroke
 * attributes (CSS var() does not resolve inside SVG presentation attributes).
 * Each value is drawn from the WHFC brand palette in globals.css and has been
 * validated for lightness, chroma, and colorblind separation against the white
 * panel surface. Text, grid, and axes keep the neutral ink tokens.
 */
export const chartColors = {
  // Stock-health status (reserved status hues, always shown with labels)
  healthy: "#4caf7a", // --color-success-border (green)
  low: "#e0b400", // --color-caution-border (amber) — low stock
  out: "#e59288", // --color-danger-border — out of stock

  // Inventory movement (two-series categorical)
  received: "#0f6b80", // --color-primary (deep teal)
  consumed: "#e8632a", // --color-sidebar-indicator (brand orange)

  // Replenishment priority (single-hue magnitude)
  replenishment: "#0f6b80", // --color-primary

  // Chart chrome
  grid: "#e5ddd5", // --color-border
  axis: "#6b635c", // --color-fg-muted
  surface: "#ffffff", // --color-surface (segment gaps / rings)
} as const;

export const CHART_FONT_FAMILY = "var(--font-sans)";
export const CHART_TICK_FONT_SIZE = 12;
