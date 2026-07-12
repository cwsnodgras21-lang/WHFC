/**
 * WHFC Inventory design tokens — reference map for CSS variables in globals.css.
 * Components must use var(--color-*) or semantic utility classes, not raw hex.
 */
export const themeTokens = {
  brand: {
    brown: "var(--color-brand-brown)",
    blue: "var(--color-brand-blue)",
    orange: "var(--color-brand-orange)",
    yellow: "var(--color-brand-yellow)",
    charcoal: "var(--color-brand-charcoal)",
  },
  color: {
    bg: "var(--color-bg)",
    surface: "var(--color-surface)",
    surfaceMuted: "var(--color-surface-muted)",
    surfaceSunken: "var(--color-surface-sunken)",
    surfaceElevated: "var(--color-surface-elevated)",
    border: "var(--color-border)",
    borderSubtle: "var(--color-border-subtle)",
    borderStrong: "var(--color-border-strong)",
    fg: "var(--color-fg)",
    fgMuted: "var(--color-fg-muted)",
    fgFaint: "var(--color-fg-faint)",
    primary: "var(--color-primary)",
    primaryHover: "var(--color-primary-hover)",
    primaryFg: "var(--color-primary-fg)",
    primaryText: "var(--color-primary-text)",
    sidebarBg: "var(--color-sidebar-bg)",
    sidebarFg: "var(--color-sidebar-fg)",
    sidebarMuted: "var(--color-sidebar-muted)",
    sidebarActiveBg: "var(--color-sidebar-active-bg)",
    sidebarActiveFg: "var(--color-sidebar-active-fg)",
    sidebarIndicator: "var(--color-sidebar-indicator)",
    attention: "var(--color-attention)",
    attentionBg: "var(--color-attention-bg)",
    attentionBorder: "var(--color-attention-border)",
    caution: "var(--color-caution)",
    cautionBg: "var(--color-caution-bg)",
    success: "var(--color-success)",
    successBg: "var(--color-success-bg)",
    danger: "var(--color-danger)",
    dangerBg: "var(--color-danger-bg)",
    info: "var(--color-info)",
    infoBg: "var(--color-info-bg)",
    focus: "var(--color-focus-ring)",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    pill: "var(--radius-pill)",
  },
  shadow: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
  },
  font: {
    sans: "var(--font-sans)",
    heading: "var(--font-heading)",
    mono: "var(--font-mono)",
  },
} as const;

export type ThemeTokens = typeof themeTokens;
