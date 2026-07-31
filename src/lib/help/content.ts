export type HelpTopicKey =
  | "dashboard"
  | "items"
  | "vendors"
  | "locations"
  | "receive"
  | "consume"
  | "procedure-kits"
  | "dispense"
  | "transfer"
  | "physical-counts"
  | "reorder-suggestions"
  | "expiration"
  | "samples"
  | "samples-dispense"
  | "user-administration"
  | "settings";

export type HelpTopic = {
  title: string;
  purpose: string;
  whatYouCanDo: string[];
  requiredFields?: string[];
  steps: string[];
  commonMistakes: string[];
  roleNotes?: string;
};

/**
 * Centralized contextual help content. To add help to a new page: add one
 * entry here, then render <HelpButton topic="..." /> near that page's
 * heading. No per-page modal implementations.
 */
export const HELP_TOPICS: Record<HelpTopicKey, HelpTopic> = {
  dashboard: {
    title: "Dashboard",
    purpose:
      "A single view of what's on hand, what needs attention today, and how inventory is trending.",
    whatYouCanDo: [
      "See active items, locations, and recent activity at a glance",
      "Work through Today's Tasks — the prioritized list of things that need action",
      "Review low-stock, expiring, and (if enabled) sample alerts",
      "Jump to the reorder report, expiration center, or recent activity feed",
    ],
    steps: [
      "Start with Today's Tasks — it's sorted by urgency (critical first)",
      "Click a task to go straight to the page that resolves it",
      "Check the Needs Attention table for items below their reorder point",
      "Scroll to Recent Activity to see what staff have been doing",
    ],
    commonMistakes: [
      "Ignoring a critical task because it's below the fold — critical items are always listed first",
      "Assuming a resolved task will stay hidden forever — it reappears if the underlying condition returns",
    ],
  },
  items: {
    title: "Items",
    purpose:
      "The catalog of consumable supplies the clinic tracks — every item's category, stocking unit, reorder settings, and expiration rules live here.",
    whatYouCanDo: [
      "View active items, on-hand quantities, and stock status",
      "Add or edit items (administrators and inventory managers)",
      "Set the reorder point, par level, and expiration warning override per item",
      "Manage which vendors can supply an item and which is preferred",
    ],
    requiredFields: [
      "Item name",
      "Internal SKU",
      "Category",
      "Stocking unit",
      "Reorder point and par level",
    ],
    steps: [
      "Click New item and fill in the required fields",
      "Set reorder point (when to flag as low) and par level (target stock)",
      "Turn on Track expiration if the item has lots/expiration dates",
      "Leave the expiration warning field blank to inherit the category or clinic default",
    ],
    commonMistakes: [
      "Setting par level lower than reorder point — par must be at or above the reorder point",
      "Forgetting to mark a preferred vendor, which reorder suggestions rely on",
    ],
    roleNotes:
      "Only administrators and inventory managers can create or edit items. Everyone else has read-only access.",
  },
  vendors: {
    title: "Vendors & sourcing",
    purpose:
      "Vendor contacts and per-item sourcing details — SKUs, cost, lead time, and ordering links — used to build reorder suggestions.",
    whatYouCanDo: [
      "Add and edit vendors, including a free-shipping / order-minimum threshold",
      "Attach one or more vendor sources to an item, with exactly one marked preferred",
      "Record vendor SKU, pack size, lead time, typical cost, and minimum order quantity per source",
      "Deactivate a specific sourcing relationship without deactivating the whole vendor",
    ],
    requiredFields: ["Vendor name (for vendors)", "Vendor (for a sourcing entry)"],
    steps: [
      "Create the vendor first, from Administration → Vendors",
      "Open an item's sourcing page to attach that vendor as a source",
      "Mark the best source as Preferred — reorder suggestions and PO drafts use it automatically",
    ],
    commonMistakes: [
      "Leaving no preferred source — reorder suggestions can't group by vendor without one",
      "Entering a non-http(s) ordering link, which is rejected for safety",
    ],
    roleNotes: "Administrators and inventory managers only.",
  },
  locations: {
    title: "Locations",
    purpose:
      "The physical storage areas inventory is tracked against — every quantity is always item + location.",
    whatYouCanDo: [
      "View active storage locations and their current stock",
      "Add, rename, or deactivate locations (administrators and inventory managers)",
      "Print QR code sheets for scan-assisted counts and consumption",
    ],
    requiredFields: ["Location name"],
    steps: [
      "Click New location and name it clearly (e.g. \"Exam Room 2\")",
      "Print a QR sheet if staff will scan into this location for counts or use",
    ],
    commonMistakes: [
      "Deleting a location instead of deactivating it — deactivate to preserve ledger history",
    ],
    roleNotes: "Only administrators and inventory managers can create, edit, or delete locations.",
  },
  receive: {
    title: "Receive",
    purpose:
      "Record inventory arriving at the clinic — every receipt increases on-hand quantity through an auditable transaction.",
    whatYouCanDo: [
      "Log a delivery: item, location, quantity, and reason",
      "Record a lot number and expiration date for tracked items",
    ],
    requiredFields: ["Item", "Location", "Quantity", "Reason"],
    steps: [
      "Select the item and the location it's being stored in",
      "Enter the quantity received and a reason (e.g. vendor delivery)",
      "If the item tracks expiration, enter the lot number and expiration date",
      "Submit — the on-hand quantity updates immediately",
    ],
    commonMistakes: [
      "Receiving into the wrong location — quantities are location-specific",
      "Skipping the expiration date on a tracked item, which blocks accurate expiration alerts",
    ],
    roleNotes: "Administrators, inventory managers, and staff can receive. Medic and read-only cannot.",
  },
  consume: {
    title: "Use stock",
    purpose:
      "Record supplies used in clinical care — decrements on-hand quantity through an auditable transaction.",
    whatYouCanDo: [
      "Log stock used at a location with a reason (clinic use, expired disposal, damaged disposal)",
      "Choose a specific lot, or let the system use the oldest-expiring lot first automatically",
    ],
    requiredFields: ["Item", "Location", "Quantity", "Reason"],
    steps: [
      "Select the item, location, and quantity used",
      "Pick a reason — clinic use is the most common",
      "For tracked items, confirm the lot (or leave automatic for oldest-first)",
      "Submit — you cannot decrement below zero on hand",
    ],
    commonMistakes: [
      "Trying to consume more than is available — the system blocks negative inventory",
      "Using the wrong reason code, which affects reporting accuracy",
    ],
    roleNotes: "Administrators, inventory managers, staff, and medic can use stock. Read-only cannot.",
  },
  "procedure-kits": {
    title: "Procedure kits",
    purpose:
      "Reusable bundles of inventory items consumed together for a clinical procedure (e.g. testosterone injection, blood draw).",
    whatYouCanDo: [
      "Create and edit kits: name, category, default location, and instructions",
      "Add components with a fixed quantity, or an adjustable (variable-dose) quantity",
      "Configure quick-select dosage presets for adjustable components",
      "Reorder components and deactivate a kit without deleting its history",
    ],
    requiredFields: ["Kit name", "At least one component"],
    steps: [
      "Click New procedure kit and name it clearly",
      "Add each component item, marking it fixed or adjustable",
      "For adjustable components, set the calculation type (concentration or multiplier) and optional dosage presets",
      "Save — the kit becomes available on the Dispense page",
    ],
    commonMistakes: [
      "Adding dosage presets to a fixed-quantity component — presets only apply to adjustable ones",
      "Forgetting to set a default location, which staff then have to pick manually every time",
    ],
    roleNotes: "Only administrators and inventory managers can manage kits. Everyone with dispense access can use them.",
  },
  dispense: {
    title: "Dispense",
    purpose:
      "Execute a procedure kit — consumes every component's inventory in one atomic transaction.",
    whatYouCanDo: [
      "Select a kit and location, review what it will consume, and confirm",
      "Enter a dosage for adjustable components, using quick-select presets when available",
    ],
    requiredFields: ["Procedure kit", "Location", "Administered amount for each adjustable component"],
    steps: [
      "Select the kit and location — the default location pre-fills automatically",
      "Enter the administered amount for any adjustable component, or tap a preset",
      "Review the inventory impact preview before confirming",
      "Confirm — either every component is consumed, or nothing is (no partial dispenses)",
    ],
    commonMistakes: [
      "Confirming without checking the impact preview for insufficient-stock warnings",
      "Ignoring an expired-lot warning without understanding it will consume expired stock",
    ],
    roleNotes: "Administrators, inventory managers, staff, and medic can dispense kits.",
  },
  transfer: {
    title: "Transfer",
    purpose: "Move inventory from one location to another without changing the total on hand.",
    whatYouCanDo: ["Record a transfer as a linked pair of transactions (out of one location, into another)"],
    requiredFields: ["Item", "From location", "To location", "Quantity"],
    steps: [
      "Select the item and the source and destination locations",
      "Enter the quantity to move",
      "Submit — both sides of the transfer post together",
    ],
    commonMistakes: ["Selecting the same location for both source and destination"],
    roleNotes: "Only administrators and inventory managers can transfer stock.",
  },
  "physical-counts": {
    title: "Physical counts",
    purpose:
      "Reconcile system on-hand quantities against what's physically on the shelf, posting corrections for any variance.",
    whatYouCanDo: [
      "Start a count for a location, optionally using QR-code scanning",
      "Enter counted quantities per item (or per lot, for tracked items)",
      "Complete the count to post correction transactions for any variance",
      "Cancel a count in progress without posting anything",
    ],
    steps: [
      "Start a count for the location being counted — this locks it against other writes",
      "Walk the location and enter the counted quantity for each item",
      "Review variances, then complete the count to post corrections",
    ],
    commonMistakes: [
      "Leaving a count open indefinitely — the location stays locked until it's completed or cancelled",
      "Entering a negative counted quantity — the system rejects it",
    ],
    roleNotes: "Only administrators and inventory managers can run physical counts.",
  },
  "reorder-suggestions": {
    title: "Reorder suggestions",
    purpose:
      "Usage-based purchasing recommendations — combines stock levels, recent consumption, and expiration to suggest what to order and how much.",
    whatYouCanDo: [
      "Review suggested order quantities with the math behind each one",
      "See the preferred vendor, lead time, and free-shipping threshold per item",
      "Dismiss or mark reviewed (suppresses for 7 days) or add straight to a PO draft",
    ],
    steps: [
      "Open a suggestion's Math to see exactly how the quantity was calculated",
      "Add it to a PO draft, mark it reviewed, or dismiss it if it's a false positive",
    ],
    commonMistakes: [
      "Dismissing a real shortage instead of ordering — dismiss only suppresses the suggestion for 7 days, it doesn't fix the stock level",
    ],
    roleNotes:
      "Viewing suggestions is available to administrators, inventory managers, staff, and read-only. Managing them (PO drafts, dismiss/review) requires administrator or inventory manager. Medic does not have access.",
  },
  expiration: {
    title: "Expiration center",
    purpose:
      "See every lot approaching or past its expiration date, using the clinic's configured warning windows.",
    whatYouCanDo: [
      "Filter by expired, expiring soon, and upcoming windows",
      "Dispose of expired or damaged lots with an auditable transaction",
    ],
    steps: [
      "Filter to the bucket you care about (expired first)",
      "Dispose of anything expired that's still counted on hand",
    ],
    commonMistakes: [
      "Leaving expired lots counted on hand — they count against available stock in reorder math until disposed",
    ],
  },
  samples: {
    title: "Samples",
    purpose:
      "Medication sample inventory — separate from ordinary supplies — with its own receiving, dispensing, and expiration tracking.",
    whatYouCanDo: [
      "View sample products, quantity on hand, and low-stock / expiration status",
      "Manage the sample product catalog (administrators and inventory managers)",
      "Jump to Receive samples or Give sample",
    ],
    steps: [
      "Check the summary stats for out-of-stock, low, expired, and expiring-soon counts",
      "Use Manage products to add a new sample product before it can be received",
    ],
    commonMistakes: [
      "Trying to receive a sample product that hasn't been added to the catalog yet",
    ],
  },
  "samples-dispense": {
    title: "Give sample",
    purpose:
      "Record a medication sample provided to a patient — reduces sample inventory through an auditable transaction.",
    whatYouCanDo: [
      "Select a sample product, quantity, and patient reference, and confirm",
    ],
    requiredFields: [
      "Sample product",
      "Quantity",
      "Patient reference (MRN or initials only)",
    ],
    steps: [
      "Select the sample product and enter the quantity given",
      "Enter a patient reference — MRN or initials only, never a full name",
      "Submit — you cannot give more than is available",
    ],
    commonMistakes: [
      "Entering a patient's full name in the reference field — use MRN or initials only",
      "Trying to give more than the available quantity — the system blocks it and shows what's available",
    ],
    roleNotes: "Administrators, inventory managers, staff, and medic can give samples.",
  },
  "user-administration": {
    title: "User administration",
    purpose: "Manage who has access to the app and what role they have.",
    whatYouCanDo: [
      "Activate or deactivate user accounts",
      "Assign a role: administrator, inventory manager, staff, medic, or read-only",
    ],
    steps: [
      "Find the user and change their role or active status",
      "Deactivate a departing staff member's account rather than deleting it, to preserve their transaction history",
    ],
    commonMistakes: [
      "Assigning administrator when a lower-privileged role (like medic or staff) would fit the person's actual duties",
    ],
    roleNotes: "Only administrators can manage users and roles.",
  },
  settings: {
    title: "Settings",
    purpose:
      "Clinic-wide configuration: feature modules, expiration warning defaults, and (for administrators) billing.",
    whatYouCanDo: [
      "Turn optional modules on or off (procedure kits, samples, imaging log, analytics, and more)",
      "Set the clinic-wide default expiration warning window for items and for samples",
      "Override the warning window per category or per item/sample product",
    ],
    steps: [
      "Open Expiration settings to set the clinic-wide defaults",
      "Override at the category level for a group of items, or per item/product for a single exception",
    ],
    commonMistakes: [
      "Expecting an item-level override to change once you edit the category default — item overrides always win",
    ],
    roleNotes: "Module toggles and billing are administrator-only. Expiration settings are open to administrators and inventory managers.",
  },
};
