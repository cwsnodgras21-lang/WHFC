/** Routes that require an authenticated Supabase session. */
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/items",
  "/locations",
  "/receive",
  "/consume",
  "/dispense",
  "/procedure-kits",
  "/transfer",
  "/physical-counts",
  "/transactions",
  "/reorder-report",
  "/reorder-suggestions",
  "/purchase-order-drafts",
  "/expiration",
  "/administration",
  "/admin",
] as const;

export const AUTH_ROUTE_PREFIXES = ["/login"] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
