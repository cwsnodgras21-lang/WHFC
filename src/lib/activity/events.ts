/**
 * The application-owned event vocabulary.
 *
 * Event types are plain namespaced strings so a new module can publish new
 * events without any database migration — only this catalog (and the module's
 * own code) needs to change. The database only enumerates the broad `module`
 * bucket, for stable filtering.
 *
 * Convention: `<module>.<verb_in_past_tense>`.
 */
export const ACTIVITY_EVENTS = {
  inventory: {
    received: "inventory.received",
    consumed: "inventory.consumed",
    adjusted: "inventory.adjusted",
    transferred: "inventory.transferred",
  },
  counts: {
    started: "counts.started",
    completed: "counts.completed",
  },
  expiration: {
    disposed: "expiration.disposed",
    reviewed: "expiration.reviewed",
  },
  vendors: {
    created: "vendors.created",
    updated: "vendors.updated",
    preferredChanged: "vendors.preferred_changed",
  },
  purchasing: {
    draftApproved: "purchasing.draft_approved",
    draftOrdered: "purchasing.draft_ordered",
  },
  imaging: {
    orderCreated: "imaging.order_created",
    scheduled: "imaging.scheduled",
    completed: "imaging.completed",
    resultsReceived: "imaging.results_received",
    authApproved: "imaging.auth_approved",
    authDenied: "imaging.auth_denied",
    statusChanged: "imaging.status_changed",
    cancelled: "imaging.cancelled",
  },
} as const;
