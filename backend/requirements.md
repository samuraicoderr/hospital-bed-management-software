# Bedflow — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Last updated:** March 2026  
**Audience:** Engineering (frontend + backend), Design, Product, Investors

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users](#2-target-users)
3. [Core Concepts & Terminology](#3-core-concepts--terminology)
4. [User Stories](#4-user-stories)
5. [Feature Requirements](#5-feature-requirements)
6. [Financial Data Model](#6-financial-data-model)
7. [Canvas & Component System](#7-canvas--component-system)
8. [Real-Time Behavior](#8-real-time-behavior)
9. [Accounting Basis](#9-accounting-basis)
10. [Templates](#10-templates)
11. [Permissions & Access Control](#11-permissions--access-control)
12. [Navigation & Pages](#12-navigation--pages)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Out of Scope (v1)](#14-out-of-scope-v1)
15. [Glossary](#15-glossary)

---

## 1. Product Overview

### What is Bedflow?

Bedflow is a financial planning workspace for early-stage founders. It replaces the Excel dashboards that most founders use to manage their company finances — where manually updating one number (like a salary) requires them to manually fix every connected formula across multiple sheets.

In Bedflow, **everything is connected automatically**. A founder adds an expense, and the income statement, cash flow, burn rate, and every related chart updates instantly — with no formula wiring required.

### The core problem it solves

Early-stage founders typically manage finances through one of two approaches:

1. **Excel/Google Sheets** — powerful but brittle. Formulas break. Updating one cell requires updating many others manually. Sharing with investors means exporting files. There is no real-time collaboration or automatic computation.

2. **Accounting software (QuickBooks, Xero)** — built for accountants, not operators. Too complex, too focused on historical bookkeeping, not forward-looking planning.

Bedflow sits in between: as intuitive as a spreadsheet, as structured as accounting software, and purpose-built for founders who need to understand and communicate their financial position without being financial experts.

### The core value proposition

> "Add a budget line and watch your income statement, runway, and investor deck update in real time — no formulas, no manual updates, no broken spreadsheets."

### Inspiration

The product interface is inspired by **Figma** — an infinite canvas where financial components (sheets, charts, KPIs, statements) live as panels that can be freely arranged. Unlike Figma, the content of each panel is reactive: changing one panel's data propagates automatically to all related panels.

---

## 2. Target Users

### Primary user — the early-stage founder

- Pre-seed to Series A stage
- 1–20 person company
- Does not have a dedicated finance hire
- Manages finances themselves or with a co-founder
- Understands their business but not necessarily GAAP accounting
- Uses Excel/Sheets today and finds it painful
- Needs to present financials to investors, board members, or advisors regularly

### Secondary user — the investor / board member

- Receives read-only access to an Organization's Plans
- Wants to see GAAP-formatted financial statements
- Wants clean, exportable data for their own models
- Does not need to edit — only review and comment

### Tertiary user — the finance operator / CFO

- Joins later-stage companies as they grow
- Needs more control over the accounting setup
- May toggle between cash and accrual basis views
- Manages multi-department budgets and headcount planning

---

## 3. Core Concepts & Terminology

These terms are used consistently across the product, codebase, and all communications. Do not substitute synonyms.

| Term | Definition |
|---|---|
| **Bedflow** | The product name. Always spelled with a capital A. |
| **Organization** | The top-level account entity. A company has one Organization. Users belong to an Organization. |
| **Plan** | A financial canvas inside an Organization. A Plan represents a defined financial view — e.g. "2024 Operating Plan" or "Series A Fundraise". An Organization can have multiple Plans. |
| **Component** | A panel on the Plan canvas. Components are the building blocks: sheets, charts, KPIs, statements, and calendars. |
| **Canvas** | The infinite, pannable, zoomable surface on which Components live. Inspired by Figma. |
| **Template** | A pre-configured Plan with a default set of Components and layout, ready to use immediately. |
| **Entity** | A unit of financial data in the backend — a revenue stream, expense line, budget, or derived statement. Entities are the nodes in the dependency graph. |
| **Dependency graph** | The internal graph that connects financial entities. Changing an upstream entity (e.g. an expense line) triggers automatic recomputation of all downstream entities (e.g. income statement, KPIs). |
| **Propagation** | The process of traversing the dependency graph after a mutation, recomputing all affected entities, and broadcasting the updated values to all connected clients. |
| **Accounting basis** | Whether financial figures are computed on a cash basis (when money moves) or accrual basis (when revenue/expense is earned/incurred). |
| **Period** | A calendar month. All financial entities are scoped to a period. The default Plan duration is 12 months (6 historical + 6 forecast). |

---

## 4. User Stories

### Organization management

- As a founder, I can create an Organization for my company so that all my financial Plans live in one place.
- As a founder, I can invite co-founders, advisors, and investors to my Organization with different permission levels so they can view or edit my Plans.
- As a founder, I can switch between Organizations if I am involved with multiple companies.

### Plan management

- As a founder, I can create a new Plan from scratch (blank canvas) or from a template so I can get started quickly.
- As a founder, I can choose a Plan type (Operator, Fundraising, or Strategic) so the default components match my current goal.
- As a founder, I can set the Plan duration (default 12 months) and its fiscal year start date so the timeline reflects my company's actual financial year.
- As a founder, I can rename, duplicate, and delete Plans so I can manage multiple scenarios.
- As a founder, I can see all my Plans on the Organization dashboard so I always know what exists.

### Canvas interaction

- As a founder, I can pan and zoom the canvas freely so I can arrange components however I want.
- As a founder, I can add a Component to the canvas from a toolbar so I can build my financial view.
- As a founder, I can drag Components to reposition them on the canvas so I can organize my layout.
- As a founder, I can resize Components so I can control how much space each one takes up.
- As a founder, I can select multiple Components and move them together so I can reorganize efficiently.
- As a founder, I can see a minimap of the full canvas so I can navigate when the canvas is large.

### Financial data entry

- As a founder, I can add revenue lines to a Sheet component so I can record what my company earns.
- As a founder, I can add expense lines to a Sheet component so I can record what my company spends.
- As a founder, I can set a date and recurrence (one-time, monthly, annual) for each revenue and expense entry so the timeline is accurate.
- As a founder, I can edit any value inline in a Sheet so the experience feels like a spreadsheet.

### Automatic calculation

- As a founder, when I add or edit a revenue or expense line, I expect all connected components (income statement, cash flow, KPIs, charts) to update automatically — without me doing anything else.
- As a founder, I can see my runway in months, automatically calculated from my cash position and burn rate, so I always know how much time I have.
- As a founder, I can toggle between a cash view and an accrual view of the same data so I can switch between operational and investor-facing perspectives.

### Investor & stakeholder access

- As a founder, I can share a Plan with an investor via a link so they can view my financials without needing an Bedflow account.
- As an investor, I can view a founder's income statement, balance sheet, and cash flow statement in a clean format so I can do diligence without asking for Excel files.
- As a founder, I can export a Plan to PDF so I can attach it to board decks or investor updates.

---

## 5. Feature Requirements

### F-01 — Organization dashboard

**Priority:** P0 (must have at launch)

The dashboard is the first screen a user sees after login. It has two primary sections:

**My Plans section**
- Displays all Plans belonging to the Organization in a responsive card grid (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each Plan card shows:
  - Plan name
  - Plan type badge (Operator / Fundraising / Strategic) with color coding
  - Last edited timestamp ("Edited 2 hours ago")
  - Mini canvas preview — small colored blocks representing the component types on the canvas
  - On hover: "Open Plan" button and options menu (⋯) with rename, duplicate, delete
- A "+ New Plan" card always appears as the last item in the grid
- Empty state when no Plans exist: illustration + "Create your first Plan" CTA

**Templates section**
- Section title: "Start from a template"
- Displays 6 featured template cards in a 3-column grid
- Each template card shows: name, type badge, one-line description, component count, "Use template" button
- "Browse all templates →" link below the grid opens a full template library modal or page
- See [Section 10](#10-templates) for the full template list

---

### F-02 — Plan creation flow

**Priority:** P0

Triggered by clicking "+ New Plan" or "Use template". A modal or dedicated page that collects:

1. **Plan name** — text input, required
2. **Plan type** — single select: Operator / Fundraising / Strategic
3. **Template** — optional; default is blank canvas; shows 6 featured templates + "Browse all" option
4. **Duration** — default 12 months; configurable as history months + forecast months (e.g. 6 + 6)
5. **Fiscal year start** — date picker, defaults to January

On confirmation, the system:
- Creates the Plan record in the database
- Seeds `CanvasComponent` records based on the selected template config
- Seeds the dependency graph edges for the workspace
- Redirects the user to the new Plan canvas

---

### F-03 — Infinite canvas

**Priority:** P0

The canvas is the core interaction surface of a Plan.

**Canvas behaviors:**
- Infinite pan in all directions via click-drag on the canvas background
- Smooth zoom in/out via scroll wheel or trackpad pinch, range 30%–200%
- "Fit to view" resets zoom and pan to frame all components
- Dotted grid background for spatial orientation
- Components snap to a 20px grid on drag
- Canvas state (pan position, zoom level) is persisted per Plan per user

**Component interactions:**
- Click to select; shift-click for multi-select; drag-select via marquee box
- Drag header to move; drag corner handle to resize
- Selected component displays a purple highlight border
- Minimum component size enforced per component type
- z-index: selected component always renders above others

**Toolbar:**
- Fixed to the top of the canvas (not part of the infinite surface)
- Buttons: "+ KPI", "+ Sheet", "+ Chart", "+ Statement", "+ Calendar"
- Clicking a button drops a new component at the center of the current viewport

**Controls:**
- Zoom in / zoom out / fit view buttons (bottom right)
- Minimap (bottom right, above controls) — thumbnail view of full canvas with viewport indicator

---

### F-04 — Sheet component

**Priority:** P0

A spreadsheet-style table for entering revenue and expense data.

**Sheet types:**
- Revenue sheet — records income streams
- Expense sheet — records outgoing costs

**Row fields (revenue):**

| Field | Type | Required |
|---|---|---|
| Name | Text | Yes |
| Category | Select (SaaS, Services, Marketplace, Other) | Yes |
| Amount | Currency | Yes |
| Cash date | Date | Yes |
| Accrual start | Date | Yes |
| Accrual end | Date | Yes |
| Recurrence | Select (One-time, Monthly, Annual) | Yes |

**Row fields (expense):**

| Field | Type | Required |
|---|---|---|
| Name | Text | Yes |
| Category | Select (Payroll, Infrastructure, Marketing, COGS, G&A, Other) | Yes |
| Amount | Currency | Yes |
| Cash date | Date | Yes |
| Status | Select (Actual, Projected) | Yes |

**Behaviors:**
- Clicking a cell activates inline edit mode
- Tab / Enter confirm and advance to the next cell
- Pressing Escape cancels an edit
- "Add row" button appends a new empty row
- Rows can be deleted via a row-level options menu
- On any cell blur, the updated value is sent to the backend and propagation is triggered
- All other components on the canvas update within 500ms of a change

---

### F-05 — Chart component

**Priority:** P0

A read-only visualization panel. Charts are derived — they display computed data from the dependency engine, never directly edited.

**Available chart types:**

| Chart | Data source | Chart type |
|---|---|---|
| Monthly burn | `CashPosition.outflows` per month | Bar chart |
| MRR growth | `RevenueStream` monthly totals | Line chart |
| Revenue vs expenses | Income statement | Grouped bar |
| Runway trend | `CashPosition.runway_months` | Line chart |
| Budget vs actuals | `Budget` vs `ExpenseLine` actuals | Grouped bar |
| Cash balance | `CashPosition.closing_balance` | Area chart |

**Behaviors:**
- Chart type is set at component creation time; can be changed from component settings
- Updates automatically when upstream entity data changes
- Hovering a data point shows a tooltip with the exact value
- Chart title is editable inline

---

### F-06 — KPI widget component

**Priority:** P0

A small, read-only panel displaying a single computed metric.

**Available KPI metrics:**

| Metric | Definition |
|---|---|
| MRR | Monthly recurring revenue |
| ARR | MRR × 12 |
| Burn rate | Total monthly cash outflows |
| Runway | `cash_balance / burn_rate` in months |
| Gross margin | `(revenue - cogs) / revenue × 100` |
| Cash balance | Current closing cash position |
| Net income | Revenue minus all expenses |
| Headcount | Number of employees (manual input) |

**Display:**
- Large primary value (e.g. "$42,800")
- Metric label below (e.g. "Monthly burn")
- Month-over-month delta with directional indicator (↑ green / ↓ red)
- Each KPI widget shows one metric; add multiple widgets for multiple metrics

**Behaviors:**
- KPI metric is selected at component creation time via a dropdown
- Value updates automatically within 500ms of any upstream change
- Delta is computed against the prior period month

---

### F-07 — Statement component

**Priority:** P0

A structured, read-only display of a GAAP financial statement. All values are derived — never directly edited.

**Statement types:**

**Income statement** — shows for each month:
- Revenue (by category)
- Cost of revenue (COGS)
- Gross profit + gross margin %
- Operating expenses (R&D, Sales & Marketing, G&A)
- Operating income / loss
- Net income / loss

**Cash flow statement** — shows for each month:
- Operating cash flows
- Investing cash flows (placeholder in v1)
- Financing cash flows (placeholder in v1)
- Net change in cash
- Closing cash balance

**Balance sheet** — shows as of a specific date:
- Assets: cash + accounts receivable
- Liabilities: accounts payable + deferred revenue
- Equity: paid-in capital + retained earnings

**Behaviors:**
- Month columns are displayed horizontally, scrollable
- Positive values in black; negative values in red with parentheses — e.g. `($9,372)`
- Subtotal rows are bold
- Updates automatically when any upstream entity changes
- Accounting basis (cash / accrual) toggle is available at statement level

---

### F-08 — Calendar component

**Priority:** P1 (target for v1, may slip to v2)

A timeline view of financial entries across the plan period.

**Behaviors:**
- Displays revenue and expense entries as date-anchored events on a monthly timeline
- Color-coded by type: revenue = teal, expense = coral
- Clicking an event opens an inline edit popover (same fields as the Sheet row)
- Creating a new entry on the calendar creates a corresponding row in the relevant Sheet
- Dragging an event to a different month updates its `cash_date` and triggers propagation

---

### F-09 — Accounting basis toggle

**Priority:** P1

Available at the Plan level and individually on Statement components.

**Cash basis:**
- Revenue recognized when cash is received (`cash_date`)
- Expenses recognized when cash leaves the account (`cash_date`)
- Simplest view; closest to a bank statement

**Accrual basis:**
- Revenue recognized across the accrual period (`accrual_date_start` to `accrual_date_end`)
- Expenses matched to the period they relate to
- GAAP-compliant; required for investor diligence

**Behavior:**
- The toggle is a Plan-level setting stored as `default_view`
- Changing the toggle triggers a full recomputation of all statement entities for all months
- All statement components and KPIs update to reflect the selected basis within 1 second
- The basis toggle does not affect Sheet input — both date fields are always stored regardless

---

### F-10 — Sharing & export

**Priority:** P1

**Sharing:**
- Founders can generate a shareable read-only link to a Plan
- Recipients can view the canvas (read-only) without an Bedflow account
- Shared links can be revoked at any time
- Permissions: view-only by default; editor access requires an Organization invite

**Export:**
- Export Plan to PDF — generates a clean, paginated document with all statements and charts
- Export individual statements to CSV
- Export to PDF is formatted for investor sharing — not a screenshot of the canvas

---

## 6. Financial Data Model

### Entity hierarchy

All financial data is modeled as entities connected in a directed acyclic graph (DAG). Leaf entities are edited by users; derived entities are computed by the engine.

```
User edits (leaf nodes)
├── RevenueStream       → income_statement, cash_flow, cash_position, kpi, forecast
├── ExpenseLine         → budget, income_statement, cash_flow, cash_position, kpi
└── Budget              → income_statement, kpi

Engine computes (derived nodes)
├── IncomeStatement     → balance_sheet, kpi, forecast
├── CashPosition        → balance_sheet, kpi, forecast
├── BalanceSheet        → kpi
├── Forecast            → kpi
└── KPI                 (terminal — nothing depends on KPI)
```

### Period scoping

All entities are scoped to a **period month** (first day of month, e.g. `2024-03-01`). The Plan duration determines which months are computed. Historical months show actual data; future months show projected data.

### Versioning

Every entity write increments a `version` integer. Clients use this to detect stale data. The WebSocket broadcast includes the version so clients can ignore out-of-order updates.

---

## 7. Canvas & Component System

### Component data model

Each Component on the canvas has:
- **Type** — determines which React component renders it
- **Position** — `x`, `y` coordinates on the infinite canvas
- **Size** — `width`, `height` in pixels
- **Config** — JSON blob with type-specific settings (e.g. which chart type, which KPI metric, which sheet type)
- **z-index** — render order; selected component always on top

### Component type → color mapping

| Component type | Badge color | Accent |
|---|---|---|
| KPI widget | Purple | #534AB7 / #EEEDFE |
| Sheet | Teal | #0F6E56 / #E1F5EE |
| Chart | Amber | #854F0B / #FAEEDA |
| Statement | Coral | #993C1D / #FAECE7 |
| Calendar | Pink | #993556 / #FBEAF0 |

### Plan type → color mapping

| Plan type | Color |
|---|---|
| Operator | Purple |
| Fundraising | Teal |
| Strategic | Amber |

---

## 8. Real-Time Behavior

### Update flow

When a user edits a value in a Sheet component, the following sequence occurs:

```
1. User blurs an edited cell
2. Frontend sends WebSocket message: { action: 'update_entity', entity_id, data }
3. Django Channels consumer receives message
4. Consumer saves the updated entity to PostgreSQL
5. Consumer dispatches a Celery task: propagate_change(entity_id, workspace_id)
6. Celery task performs BFS traversal of the dependency graph
7. Each downstream entity is recomputed by the formula engine
8. After all writes are committed, a broadcast task fires
9. Django Channels broadcasts updated entity snapshots to all clients in the workspace room
10. Frontend receives the broadcast and updates Zustand store
11. All connected React components re-render with new values
```

### Latency targets

| Operation | Target |
|---|---|
| Cell edit → WebSocket sent | < 50ms |
| WebSocket sent → propagation complete | < 500ms |
| Propagation complete → client render | < 100ms |
| Total: edit → all components updated | < 700ms |

### Layout persistence

Canvas layout changes (drag, resize) are persisted via a debounced REST API call. The debounce window is 500ms — the API is not called on every pixel of drag, only after the user stops moving.

---

## 9. Accounting Basis

Both dates are stored on every transaction at write time, regardless of the current view setting. This means switching between cash and accrual views never requires re-entering data — it is purely a recomputation of existing data.

| Field | Description |
|---|---|
| `cash_date` | The date money actually moved |
| `accrual_date_start` | Start of the recognition period |
| `accrual_date_end` | End of the recognition period |

**Example:** A $12,000 annual SaaS subscription paid on January 15th.
- Cash basis: $12,000 appears in January's revenue.
- Accrual basis: $1,000/month appears across January–December.

The formula engine reads `workspace.default_view` to determine which date field to filter on when computing statement totals.

---

## 10. Templates

Templates are pre-configured Plans with a default set of Components and layout. Selecting a template at Plan creation seeds the canvas with the relevant components, positioned and sized for immediate use.

### Featured templates (shown on dashboard)

| Template name | Plan type | Description | Components |
|---|---|---|---|
| SaaS Operator | Operator | Track burn, MRR, and runway month by month | 4 KPIs, 1 expense sheet, 1 revenue sheet, 1 burn chart, 1 income statement |
| Seed Round Prep | Fundraising | 3-statement model ready for investor diligence | 3 KPIs, 3 statements (income, cash flow, balance sheet), 1 MRR chart |
| Annual Plan | Strategic | Full-year budget with headcount and forecast | 4 KPIs, 1 expense sheet, 1 revenue sheet, 2 charts, 1 income statement |
| Board Meeting Pack | Fundraising | Income statement, cash flow, and KPI summary | 6 KPIs, 2 statements, 2 charts |
| Growth Model | Strategic | Revenue projections with scenario comparison | 3 KPIs, 2 revenue sheets (base + bull), 2 forecast charts |
| Pre-Revenue Startup | Operator | Cash tracking and expense management pre-launch | 3 KPIs, 1 expense sheet, 1 cash flow statement, 1 runway chart |

### Template config format (backend)

Each template is a JSON config stored server-side. On Plan creation, the selected config seeds the `CanvasComponent` table.

```json
{
  "key": "saas_operator",
  "name": "SaaS Operator",
  "plan_type": "operator",
  "description": "Track burn, MRR, and runway month by month",
  "history_months": 6,
  "forecast_months": 6,
  "component_count": 8,
  "components": [
    { "type": "kpi",       "x": 0,   "y": 0,   "w": 200, "h": 110, "config": { "metric": "mrr" } },
    { "type": "kpi",       "x": 220, "y": 0,   "w": 200, "h": 110, "config": { "metric": "burn_rate" } },
    { "type": "kpi",       "x": 440, "y": 0,   "w": 200, "h": 110, "config": { "metric": "runway_months" } },
    { "type": "kpi",       "x": 660, "y": 0,   "w": 200, "h": 110, "config": { "metric": "gross_margin" } },
    { "type": "sheet",     "x": 0,   "y": 140, "w": 420, "h": 300, "config": { "sheet_type": "expense" } },
    { "type": "chart",     "x": 440, "y": 140, "w": 420, "h": 300, "config": { "chart_type": "burn_by_month" } },
    { "type": "sheet",     "x": 0,   "y": 460, "w": 420, "h": 280, "config": { "sheet_type": "revenue" } },
    { "type": "statement", "x": 440, "y": 460, "w": 420, "h": 280, "config": { "statement_type": "income" } }
  ]
}
```

---

## 11. Permissions & Access Control

### Roles

| Role | Description |
|---|---|
| **Owner** | The founder who created the Organization. Full access to everything. Can delete the Organization. |
| **Editor** | Can create, edit, and delete Plans and their data. Cannot manage billing or delete the Organization. |
| **Viewer** | Read-only access to all Plans in the Organization. Cannot edit any data. |
| **Guest** | Access to a single Plan via a shared link. No account required. Read-only. |

### Permission matrix

| Action | Owner | Editor | Viewer | Guest |
|---|---|---|---|---|
| View Plans | ✓ | ✓ | ✓ | ✓ (linked Plan only) |
| Create Plan | ✓ | ✓ | — | — |
| Edit Plan data | ✓ | ✓ | — | — |
| Delete Plan | ✓ | ✓ | — | — |
| Invite members | ✓ | — | — | — |
| Manage billing | ✓ | — | — | — |
| Export PDF | ✓ | ✓ | ✓ | ✓ |
| Generate share link | ✓ | ✓ | — | — |
| Revoke share link | ✓ | ✓ | — | — |

### Authentication

- JWT-based authentication for all authenticated users
- Access tokens expire after 15 minutes; refresh tokens expire after 7 days
- WebSocket connections are authenticated via JWT passed as a query parameter on connect
- Shared-link Guests receive a signed, time-limited token scoped to a single Plan

---

## 12. Navigation & Pages

### Page inventory

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Email + password. Magic link option. |
| Register | `/register` | Org name, user name, email, password. |
| Dashboard | `/dashboard` | Plans grid + templates. Default page after login. |
| Plan canvas | `/plans/[id]` | The infinite canvas for a specific Plan. |
| Plan settings | `/plans/[id]/settings` | Name, duration, accounting basis, sharing. |
| Template library | `/templates` | Full browsable template gallery. |
| Organization settings | `/settings/organization` | Name, members, billing. |
| Profile settings | `/settings/profile` | Name, email, password, avatar. |
| Shared Plan (guest) | `/share/[token]` | Read-only Plan view for guests. |

### Global navigation (sidebar)

Present on all authenticated pages.

```
[Bedflow logo]

Dashboard
Plans
Templates

─────────────

Settings
[Organization switcher]
[User avatar + name]
```

### Canvas toolbar (Plan canvas only)

Fixed top bar on the canvas page:

```
← Back    [Plan name]    [Cash | Accrual toggle]    [Share]    [Export]    [User avatar]

+ KPI    + Sheet    + Chart    + Statement    + Calendar
```

---

## 13. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Dashboard initial load | < 2 seconds |
| Canvas load (all components) | < 3 seconds |
| Cell edit → all components updated | < 700ms |
| WebSocket reconnect on disconnect | < 3 seconds with exponential backoff |
| PDF export generation | < 10 seconds |

### Browser support

- Chrome 110+ (primary)
- Firefox 110+
- Safari 16+
- Edge 110+
- Mobile Safari / Chrome (canvas is touch-enabled for pan and zoom; editing is desktop-optimized)

### Accessibility

- All interactive elements keyboard-navigable
- ARIA labels on icon buttons
- Color is never the sole indicator of meaning (always paired with text or icon)
- Minimum contrast ratio 4.5:1 for all text

### Security

- All API endpoints require authentication except `/login`, `/register`, `/share/[token]`
- Row-level security: every database query is scoped to the authenticated user's Organization
- WebSocket connections verify Organization membership on connect
- Shared-link tokens are signed, scoped to a single Plan, and revocable
- No financial data is stored in browser localStorage (Zustand store is in-memory only)
- All data in transit encrypted via TLS 1.2+
- Passwords hashed with bcrypt, minimum cost factor 12

### Availability

- Target uptime: 99.5% (allows ~3.6 hours downtime/month)
- WebSocket disconnections are handled gracefully: client reconnects automatically, re-fetches latest state on reconnect
- Background Celery tasks are retried up to 3 times with exponential backoff on failure

---

## 14. Out of Scope (v1)

The following features are explicitly excluded from the v1 release. They may be considered for future versions.

| Feature | Reason deferred |
|---|---|
| Real-time multiplayer (live cursors, simultaneous editing) | Engineering complexity; adds ~3 months. Deferred to v2. |
| Mobile-optimized canvas editing | Canvas interaction is fundamentally mouse-driven. Mobile view is read-only in v1. |
| Bank account / accounting software integration (Plaid, QuickBooks sync) | Requires complex data mapping and error handling. Deferred to v2. |
| Formula bar (Excel-style cell formulas like `=SUM`) | Scope risk. Row-based input covers 90% of use cases in v1. |
| Multi-currency conversion | Adds complexity to formula engine. Single currency per Organization in v1. |
| AI-generated financial insights / anomaly detection | Requires sufficient data volume to be useful. Deferred to v2. |
| Version history / undo beyond the current session | Snapshot system supports this but UI is not prioritized for v1. |
| Custom KPI metric definitions | Fixed metric set covers v1 use cases. Custom metrics deferred to v2. |
| White-labeling / embedded mode | B2B2C use case; not the primary go-to-market for v1. |

---

## 15. Glossary

| Term | Definition |
|---|---|
| **GAAP** | Generally Accepted Accounting Principles. The standard framework for financial reporting used by investors and auditors. |
| **MRR** | Monthly Recurring Revenue. The predictable revenue a company earns each month from subscriptions or contracts. |
| **ARR** | Annual Recurring Revenue. MRR × 12. |
| **Burn rate** | The rate at which a company spends its cash reserves each month. |
| **Runway** | How many months a company can operate before running out of cash, given its current burn rate. |
| **Gross margin** | Revenue minus cost of goods sold (COGS), expressed as a percentage of revenue. |
| **COGS** | Cost of Goods Sold. The direct costs attributable to producing the goods or services sold. |
| **Accrual accounting** | Revenue and expenses are recorded when earned/incurred, not when cash moves. Required for GAAP compliance. |
| **Cash basis accounting** | Revenue and expenses are recorded when cash is received/paid. Simpler; not GAAP. |
| **DAG** | Directed Acyclic Graph. The data structure used to model financial entity dependencies. Ensures no circular dependencies. |
| **BFS** | Breadth-First Search. The algorithm used to traverse the dependency graph during propagation. Ensures entities are recomputed in correct dependency order. |
| **WebSocket** | A persistent, full-duplex communication protocol used to push real-time updates from the server to all connected clients. |
| **Celery** | A Python task queue used to run propagation and computation jobs asynchronously, off the main request thread. |
| **Django Channels** | A Django extension that adds WebSocket support, enabling real-time push communication. |
| **React Flow** | The frontend library used to implement the infinite canvas. Nodes (Components) are standard React components; pan/zoom/drag/resize are provided by the library. |
| **Zustand** | A lightweight React state management library. Used to manage canvas layout state and financial entity data on the frontend. |
| **TimescaleDB** | A PostgreSQL extension that optimizes time-series queries, used to efficiently query financial entities by period month. |

---

*This document reflects the product decisions made as of v1.0. Changes require sign-off from product and engineering leads.*
