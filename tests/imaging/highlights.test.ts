import { describe, expect, it } from "vitest";

import {
  computeImagingHighlights,
  type ImagingOrderRow,
} from "@/lib/data/imaging-page";

const TODAY = "2026-07-13";

function order(overrides: Partial<ImagingOrderRow>): ImagingOrderRow {
  return {
    id: crypto.randomUUID(),
    patientReference: "A.B.",
    orderingProvider: "Dr. Lin",
    imagingType: "MRI",
    imagingLocation: "Radiology West",
    dateOrdered: "2026-07-01",
    appointmentDate: null,
    appointmentTime: null,
    status: "ordered",
    authorizationStatus: "not_required",
    authorizationNumber: null,
    notes: null,
    ...overrides,
  };
}

describe("computeImagingHighlights", () => {
  it("buckets appointments into today / upcoming / overdue for open orders", () => {
    const rows = [
      order({ appointmentDate: TODAY, status: "scheduled" }),
      order({ appointmentDate: "2026-07-20", status: "scheduled" }),
      order({ appointmentDate: "2026-07-01", status: "ordered" }),
    ];

    const result = computeImagingHighlights(rows, TODAY);

    expect(result.appointmentsToday).toBe(1);
    expect(result.upcomingAppointments).toBe(1);
    expect(result.overdueImaging).toBe(1);
  });

  it("does not count completed or cancelled orders as overdue", () => {
    const rows = [
      order({ appointmentDate: "2026-07-01", status: "completed" }),
      order({ appointmentDate: "2026-07-01", status: "cancelled" }),
      order({ appointmentDate: "2026-07-01", status: "results_received" }),
    ];

    expect(computeImagingHighlights(rows, TODAY).overdueImaging).toBe(0);
  });

  it("counts required and pending authorizations as pending", () => {
    const rows = [
      order({ authorizationStatus: "required" }),
      order({ authorizationStatus: "pending" }),
      order({ authorizationStatus: "approved" }),
      order({ authorizationStatus: "denied" }),
    ];

    expect(computeImagingHighlights(rows, TODAY).pendingAuthorizations).toBe(2);
  });
})
