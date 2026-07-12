import { describe, expect, it } from "vitest";

import { isAuthRoute, isProtectedRoute } from "@/lib/auth/routes";

describe("auth routes", () => {
  it("marks application routes as protected", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/receive")).toBe(true);
    expect(isProtectedRoute("/items/abc")).toBe(true);
    expect(isProtectedRoute("/expiration")).toBe(true);
    expect(isProtectedRoute("/admin/modules")).toBe(true);
  });

  it("does not protect the public home or login routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isAuthRoute("/login")).toBe(true);
  });
});
