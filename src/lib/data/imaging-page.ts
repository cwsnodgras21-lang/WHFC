import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageImaging } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  OPEN_IMAGING_STATUSES,
  PENDING_AUTHORIZATION_STATUSES,
  type ImagingAuthorizationStatus,
  type ImagingStatus,
} from "@/lib/imaging/constants";
import type { ImagingPageFilters } from "@/lib/validation/imaging-page";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ImagingOrderRow = {
  id: string;
  patientReference: string;
  orderingProvider: string;
  imagingType: string;
  imagingLocation: string | null;
  dateOrdered: string;
  appointmentDate: string | null;
  appointmentTime: string | null;
  status: ImagingStatus;
  authorizationStatus: ImagingAuthorizationStatus;
  authorizationNumber: string | null;
  notes: string | null;
};

export type ImagingHighlights = {
  appointmentsToday: number;
  upcomingAppointments: number;
  overdueImaging: number;
  pendingAuthorizations: number;
};

export type ImagingPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  rows: ImagingOrderRow[];
  highlights: ImagingHighlights;
  providers: string[];
  locations: string[];
  filters: ImagingPageFilters;
  today: string;
  loadError: string | null;
};

const EMPTY_HIGHLIGHTS: ImagingHighlights = {
  appointmentsToday: 0,
  upcomingAppointments: 0,
  overdueImaging: 0,
  pendingAuthorizations: 0,
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOpen(status: ImagingStatus): boolean {
  return (OPEN_IMAGING_STATUSES as readonly ImagingStatus[]).includes(status);
}

function isPendingAuth(status: ImagingAuthorizationStatus): boolean {
  return (
    PENDING_AUTHORIZATION_STATUSES as readonly ImagingAuthorizationStatus[]
  ).includes(status);
}

export function computeImagingHighlights(
  rows: ImagingOrderRow[],
  today: string
): ImagingHighlights {
  const highlights: ImagingHighlights = { ...EMPTY_HIGHLIGHTS };
  for (const row of rows) {
    if (isPendingAuth(row.authorizationStatus)) {
      highlights.pendingAuthorizations += 1;
    }
    if (row.appointmentDate && isOpen(row.status)) {
      if (row.appointmentDate === today) {
        highlights.appointmentsToday += 1;
      } else if (row.appointmentDate > today) {
        highlights.upcomingAppointments += 1;
      } else {
        highlights.overdueImaging += 1;
      }
    }
  }
  return highlights;
}

function applyFilters(
  rows: ImagingOrderRow[],
  filters: ImagingPageFilters
): ImagingOrderRow[] {
  return rows.filter((row) => {
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (
      filters.authorization !== "all" &&
      row.authorizationStatus !== filters.authorization
    ) {
      return false;
    }
    if (
      filters.provider &&
      row.orderingProvider.toLowerCase() !== filters.provider.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.location &&
      (row.imagingLocation ?? "").toLowerCase() !==
        filters.location.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.appointmentDate &&
      row.appointmentDate !== filters.appointmentDate
    ) {
      return false;
    }
    return true;
  });
}

export async function getImagingPageData(
  supabase: Client,
  session: AppSession,
  filters: ImagingPageFilters
): Promise<ImagingPageData> {
  const today = utcToday();
  const canManage = canManageImaging(
    session.profile.role,
    session.profile.active
  );

  if (!session.profile.active) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view the imaging log.",
      rows: [],
      highlights: EMPTY_HIGHLIGHTS,
      providers: [],
      locations: [],
      filters,
      today,
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("imaging_orders")
    .select(
      "id, patient_reference, ordering_provider, imaging_type, imaging_location, date_ordered, appointment_date, appointment_time, status, authorization_status, authorization_number, notes"
    )
    .order("appointment_date", { ascending: true, nullsFirst: false })
    .order("date_ordered", { ascending: false });

  if (error) {
    return {
      canView: true,
      canManage,
      permissionMessage: null,
      rows: [],
      highlights: EMPTY_HIGHLIGHTS,
      providers: [],
      locations: [],
      filters,
      today,
      loadError: error.message,
    };
  }

  const allRows: ImagingOrderRow[] = (data ?? []).map((row) => ({
    id: row.id,
    patientReference: row.patient_reference,
    orderingProvider: row.ordering_provider,
    imagingType: row.imaging_type,
    imagingLocation: row.imaging_location,
    dateOrdered: row.date_ordered,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    status: row.status,
    authorizationStatus: row.authorization_status,
    authorizationNumber: row.authorization_number,
    notes: row.notes,
  }));

  const providers = Array.from(
    new Set(allRows.map((row) => row.orderingProvider).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const locations = Array.from(
    new Set(
      allRows
        .map((row) => row.imagingLocation)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    canView: true,
    canManage,
    permissionMessage: null,
    rows: applyFilters(allRows, filters),
    highlights: computeImagingHighlights(allRows, today),
    providers,
    locations,
    filters,
    today,
    loadError: null,
  };
}
