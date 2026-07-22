import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LocationsCatalog,
  matchesLocationSearch,
  resolveLocationDialogMode,
} from "@/components/locations/locations-catalog";
import type { LocationRow } from "@/lib/data/locations-page";

const refresh = vi.fn();
const setLocationActiveAction = vi.fn();
const createLocationAction = vi.fn();
const updateLocationAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/actions/locations", () => ({
  setLocationActiveAction: (...args: unknown[]) => setLocationActiveAction(...args),
  createLocationAction: (...args: unknown[]) => createLocationAction(...args),
  updateLocationAction: (...args: unknown[]) => updateLocationAction(...args),
}));

const locations: LocationRow[] = [
  {
    id: "location-1",
    locationName: "Supply Closet",
    active: true,
    hasTransactions: false,
  },
  {
    id: "location-2",
    locationName: "Exam Room Overflow",
    active: false,
    hasTransactions: true,
  },
];

describe("locations catalog helpers", () => {
  it("matches by location name", () => {
    expect(matchesLocationSearch(locations[0], "closet")).toBe(true);
    expect(matchesLocationSearch(locations[0], "cabinet")).toBe(false);
  });

  it("resolves row click mode from permissions", () => {
    expect(resolveLocationDialogMode(true)).toBe("edit");
    expect(resolveLocationDialogMode(false)).toBe("view");
  });
});

describe("locations catalog interaction", () => {
  beforeEach(() => {
    refresh.mockReset();
    setLocationActiveAction.mockReset();
    createLocationAction.mockReset();
    updateLocationAction.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
  });

  it("opens edit mode when a manager clicks a row", () => {
    render(<LocationsCatalog locations={locations} canManage />);

    fireEvent.click(screen.getByText("Supply Closet"));

    expect(screen.getByRole("heading", { name: "Edit location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("opens view-only mode when a non-manager clicks a row", () => {
    render(<LocationsCatalog locations={locations} canManage={false} />);

    fireEvent.click(screen.getAllByText("Supply Closet")[0]!);

    expect(screen.getByRole("heading", { name: "Location details" })).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("uses the explicit View action for non-managers", () => {
    render(<LocationsCatalog locations={locations} canManage={false} />);

    expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Activate" })).not.toBeInTheDocument();
  });

  it("activates and deactivates from explicit actions", async () => {
    setLocationActiveAction.mockResolvedValue({ success: true, locationId: "location-2" });

    render(<LocationsCatalog locations={locations} canManage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Activate" })[0]!);

    await waitFor(() => {
      expect(setLocationActiveAction).toHaveBeenCalledWith("location-2", true);
      expect(refresh).toHaveBeenCalled();
    });
  });
});
