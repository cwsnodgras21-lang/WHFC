# WHFC Inventory — Demo Script

**Duration:** ~12 minutes  
**Audience:** Clinic manager or inventory lead  
**MVP modules enabled:** Inventory core, expiration tracking, lot tracking, reorder suggestions

## Before you start

1. Sign in as **Inventory Manager** or **Administrator** (full catalog + transfer/count access).
2. Confirm the database has seed catalog data (`demo_seed.sql`) and **no** prior demo activity — or run `demo_reset_inventory.sql` first.
3. Open the **Dashboard** — you should see the **Getting started** checklist if stock has not been received yet.

## 1. Orient (1 min)

> “This is our clinic supply inventory — not patient records. We track what we have on the shelf, what we use, and what to reorder.”

- Point out sidebar: **Dashboard**, **Items**, **Locations**, **Receive**, **Use stock**.
- Note that **Transfer**, **Physical counts**, and **Administration** are manager tools.
- Disabled modules (procedure kits, PO drafts, analytics) should **not** appear in navigation.

## 2. Catalog (2 min)

**Items** (`/items`)

- Show a few real supplies (gloves, syringes, B12).
- Mention **product code** and **minimum / par levels** on a high-use item (e.g. Gloves Medium).
- Optional: add one new item if the audience cares about setup.

**Locations** (`/locations`)

- Show **Supply Room** and **Exam Room** (two locations enable transfers later).

## 3. Receive stock (3 min)

**Receive** (`/receive`) — primary daily action

1. Select **Gloves (Medium)** → **Supply Room**.
2. Quantity: **10** boxes, reason **Vendor delivery**.
3. Submit — confirm success message and on-hand hint.

Receive a dated item to power expiration demo:

1. **B12** → **Supply Room**, qty **5**, expiration **~60 days out**.
2. If lot tracking is on for the item, enter a lot number; otherwise only expiration appears.

> “Expiration and lot fields only show when the item needs them.”

## 4. Use stock (2 min)

**Use stock** (`/consume`)

1. **Alcohol Prep Pads** → **Supply Room**, qty **2**, reason **Clinic use**.
2. Show recent usage list at the bottom.

## 5. Dashboard & replenishment (2 min)

Return to **Dashboard**

- **Getting started** checklist should mark receive complete.
- **Items needing attention** — only items with minimum levels configured (not the whole catalog).
- **Inventory changes** chart after activity.
- **Recent activity** list.

**Reorder suggestions** (`/reorder-suggestions`)

- Explain suggestions based on stock vs minimum levels and recent usage.
- Dismiss or mark reviewed — no PO draft workflow in MVP.

**Expirations** (`/expiration`) — if enabled

- Show B12 lot with expiration status.

## 6. Manager workflows (2 min) — optional

**Transfer** (`/transfer`)

- Move **5** gloves from **Supply Room** → **Exam Room**.

**Physical counts** (`/physical-counts`)

- Start a count at **Exam Room**, adjust one line, complete count.

**Inventory activity** (`/transactions`)

- Read-only history — plain language, no “ledger” jargon.

## 7. Roles (30 sec)

| Role | Can do |
|------|--------|
| **Staff** | Receive, use stock, view catalog |
| **Inventory Manager** | Everything staff can + items, vendors, transfer, counts, reorder actions |
| **Administrator** | Manager access + units of measure + module settings |
| **Read only** | View only — no receive or use |

## Reset for the next demo

```sql
-- In Supabase SQL editor (not production):
\i supabase/seed/demo_reset_inventory.sql
```

Then receive again from step 3.

## Talking points to avoid

- Patient or PHI data — this app does not store it.
- “Ledger,” “RPC,” “modules” — use **activity history** and **settings** instead.
- Procedure kits / dispense / PO drafts — out of scope for MVP unless modules are turned on.
