# RoomSync UI/UX Standardization — Specification

**Artifact type**: `spec.md`
**Repository root**: `c:\xampp\htdocs\Void\RoomSync - Void Syndicate`
**Source references**: `public/css/main.css` (design tokens), `public/pages/index.html` (Landing reference), `public/pages/login.html` (Login reference)
**Pages in scope (not to be redesigned — LOCKED):** index.html, login.html
**Pages in scope (to be updated):** dashboard.html, admin.html, calendar.html, rooms.html, labs.html, my-reservations.html, profile.html, reservation.html
**Components in scope:** header.html (locked unless required), sidebar.html, footer.html, modals/reserve-modal.html

---

## 1. Problem

RoomSync's eight authenticated application pages and components were authored independently. While a robust design system already exists in `main.css` and the reference pages (Landing/Login), the remaining pages — Dashboard, Admin, Calendar, Rooms, Labs, My Reservations, Profile, Reservation — have inconsistent:

- Ambient page setup (decorative blobs, body::before/body::after, scroll-behavior, overflow-x, z-index layering, min-height on main)
- Page header composition (eyebrow, gradient title, lead paragraph wrapped in `.page-title-block`)
- Sidebar structure (missing `.sidebar-user` user card, nav-group splits, `::before` dot indicators, active nav item treatment)
- Section & card headers (missing `.section-label` eyebrow labels above card titles)
- Table wrapping (tables not wrapped in `.table-wrap` card container)
- Form field composition (labels wrapping inputs directly instead of `.field > label + .input-wrap`)
- Missing entrance animation (`.hero-entrance` staggered reveal)
- `prefers-reduced-motion` guards on per-page blob animations
- Button variant usage (Refresh button in admin missing `.ghost`)
- Navigation splits (some inline sidebar navs single `<ul>` instead of split groups with dashed divider)

The overall effect is that the authenticated UI reads as "pages by different designers" rather than a single application. The codebase already has the tokens (main.css) — the task is to apply them rigorously and consistently, without changing functionality or adding features.

## 2. Users, Goals, Non-Goals

### Users
- **Students / Faculty / Lab Techs / Admins using RoomSync
- Capstone reviewers and defense audience
- Future maintainers of the RoomSync codebase

### Goals
1. Every authenticated page reads visually continuous with the Landing & Login reference pages — same navy-blue professional theme.
2. Every page component visually matches the token system in `main.css` (spacing, radii, shadows, focus, typography).
3. Existing functionality (form posts, API bindings, RBAC gating, routes, JS selectors are preserved.
4. Fully responsive at project breakpoints (1100 → 960 → 768 → 640 → 480).

### Non-Goals
- Do NOT redesign index.html (Landing) or login.html (Login) unless a token-level change strictly requires touching shared markup.
- Do NOT modify backend routes, controllers, services, DB schema.
- Do NOT add features, new sections, new menu items, new pages.
- Do NOT introduce libraries, dependencies or framework migrations.
- Do NOT remove functionality — not even "minor" cleanup of unused forms elements, input ids, or attributes.

## 3. Functional Requirements (F)

- **F1 — Reference Pages Preservation:** index.html and login.html remain functionally and visually intact. Any addition to main.css is token (not subtraction or modification) permitted only when absolutely required for shared component parity across non-reference pages.
- **F2 — No new features/removeal:** Existing content, copy, text, buttons, forms, ids, data attributes remain unchanged. Selectors relied on by JS (e.g. `#refresh-btn`, `.#reservation-form`, `.sidebar`` cannot change names or remove nodes.
- **F3 — Navigation:** Sidebar nav RBAC gating (`data-user-only`, `data-admin-only`, `data-can-reserve`, `data-logout`, `data-guest-only`) functional.
- **F4 — Forms continue working:** All existing validations, submit handlers, API bindings function. `input ids (`#pf-email`, `#res-room`, `#res-start`, etc.) unchanged.
- **F5 — Tables and JS-populated sections (`.table tbody` targets unchanged — dynamic content populates.

## 4. Non-Functional Requirements (N)

### 4.1 Color System (N1)
- **N1.1:** Every non-reference page reuses ONLY colors already defined in `:root` / `[data-theme]` inside `main.css`. No hardcoded hex or new colors.
- **N1.2:** Backgrounds use `--bg / --surface / --surface-2` consistent with Landing/Login references (light mode: F8FAFC / white / slate-50; dark mode: 0B1220 / 111827 / 1E293B).
- **N1.3:** Headings use the gradient text treatment where references use it page titles (`background-clip`.
- **N1.4:** Status colors success/warning/danger/info limited to badges, toasts, fields only functionally necessary states.

### 4.2 Typography (N2)
- **N2.1:** Font stack unchanged (Inter / Segoe UI / system-ui).
- **N2.2:** Explicit type scale consistent sizes, weights, tracking applied through `.eyebrow`, `.section-label`, page-title-block h1`, `lead` classes from the references, not ad-hoc sizes/weights inline.
- **N2.3:** Line-heights from references.

### 4.3 Component Parity (N3)
Every non-reference page implements each of the following exactly as in the references:

- **N3.1 Buttons `.btn primary / ghost / small / large` : focus rings; hover lifts `translateY`.
- **N3.2 Inputs `.field.label + `.input-wrap` field, focus ring 4px accent-soft, error visual states.
- **N3.3 Cards `.card` with `.section-label` eyebrow, hover, section headers.
- **N3.4 Tables`.table-wrapcontainer + `.table` sticky header with surface-2, hover rows surface-2 bg.
- **N3.5 Sidebar: `.sidebar-user` card at top with avatar/name/role pill, split nav groups with dashed border between; nav item`::before` dot indicators on hover/active with glow and active gradient bg (matching sidebar.html component).
- **N3.6 Header: page-header layout.eyebrow pill + gradient h1 + lead paragraph + page-actions grouping.
- **N3.7 Modals close button rotation hover, header sticky layout.
- **N3.8 Badges (pill form  dot prefix colors match index.html hero tile badges approved/pending etc.
- **N3.9 Pagination/empty/sections already exist, are correct; empty state components.
- **N3.10 Icons: nav active hover/focus visible per tokens.

### 4.4 Layout Spacing (N4)
- **N4.1:** `--space-x` token system respected. No inline margin/paddings; always use tokens. All `--radius-sm / / lg / xl applied consistently references.
- **N4.2:** No overcrowding: page-header spacing rhythm 7 5 4 matching references spacing rhythm

### 4.5 Navigation (N5)
- **N5.1:** Sidebar visually matches `sidebar component (sidebar.html structure `.sidebar-user` + split nav groups) on ALL pages using an inline sidebar (not component injection).
- **N5.2:** Active nav items gradient background, glowing dot.
- **N5.3:** 960px and below sidebar collapses to drawer + mobile toggle (already main.css styles).

### 4.6 Responsiveness (N6)
- **N6.1:** Breakpoints 1100 / 960 / 768 / 720 / 640 / 480 match exactly.
- **N6.2:** No horizontal overflow. Tables scroll containers overflow-x:auto on narrow.
- **N6.3:** Desktop layout is not sacrificed. Mobile retains full structure.

### 4.7 UX & UX (N7)
- **N7.1:** All interactive elements have obvious affordance (buttons, inputs, cards have hover/active/focus clearly visible matching reference patterns.
- **N7.2:** Form usability improved visual feedback provided for all states.
- **N7.3:** Accessible contrast WCAG AA on text on backgrounds meets.
- **N7.4:** `prefers-reduced-motion: reduce` honored blob animations disabled.
- **N7.5:** Entrance staggered via `.hero-entrance` with staggered d1-d6 applied to main content sections on every non-reference page.

### 4.8 Ambient page Visual Style (N8)
- **N8.1:** Decorative blurred blob background applied consistently across every authenticated interior pages: fixed body::before / body::after 360/300px + 80px.
- **N8.2:** Page layering correct (`#app z-index 1`).
- **N8.3:** `scroll-behavior smooth, scroll-padding-top 68px, overflow-x hidden.
- **N8.4:** `main.container { min-height: calc(100vh - 68px); }` vertical fills viewport.

## 5. Constraints Dependencies Assumptions Open Questions

- C1: Vanilla JS HTML CSS only.
- C2: Folder structure preserved.
- C3: Backend untouched.
- C4: main.css design tokens are the single source of truth — if a token is missing it's NOT added, existing closest token used.
- A1: components.js injection continues to work unchanged after markup updates.
- A2: Existing JS selectors rely on ids and classNames; only structural DOM wrapping changes that break JS bindings.

Open Questions confirmed via code analysis — none outstanding blocking.

## 6. Acceptance Criteria

### Rule AC-type `rule` — objectively verifiable with yes/no

- **AC1 (rule):** main.css unchanged in the Landing page visually identical to reviewer visual diff shows additions made to index.html render reference screenshots before/after (modification zero (unless explicitly approved shared CSS additions).
- **AC2 (rule):** login.html visually identical reference no before/after render.
- **AC3 (rule):** Every interior page (dashboard, admin, calendar, rooms, labs, my-reservations, profile, reservation) has decorative blob visuals on body::before/ body::after with `filter: blur(80px); opacity: 0.22–0.28`, correct sizes 0.22–0.28`, fixed positioned.
- **AC4 (rule):** Every interior page has `html scroll-behavior smooth; scroll-padding-top: 68px;` and `overflow-x: hidden` and` on `html, body`.
- **AC5 (rule):` page-header composition: has`page-title-block` eyebrow pill + gradient h1 (via class not inline styles) + lead paragraph + `.page-actions` group. Admin, My Reservations, Profile pages currently missing.
- **AC6 (rule):` table-wrap class="table-wrap table-wrap. Missing wrapping table children tables admin.
- **AC7 (rule):` Every inline sidebar has`.sidebar-user block at top exactly structure as sidebar.html component.
- **AC8 (rule):` Every inline sidebar nav has split groups with between main/profile sections with dashed border top (as per main.css `.sidebar nav ul + ul` rule).
- **AC9 (rule):` profile.html form fields use the composition `field > label``.input-wrap >` — labels do wrap inputs directly. Inputs all ids intact.
- **AC10 (rule):` reserve-modal.html form `field structure` correct ` `.input-wrap` ` ids intact.
- **AC11 (rule):` admin refresh button `.ghost` variant class.
- **AC12 (rule):` card headers interior pages interior have eyebrow` labels` labels above card titles (Agenda/Inventory/Updates etc.).
- **AC13 (rule):` `prefers-reduced-motion: reduce` on every custom per page ` ` blob animations disabled (matches `animation-duration / @keyframes rules honoured`.
- **AC14 (rule):` hero entrance` staggered `fade` applied entrance content sections` every interior page with `d1 d6 stagger delays matches login page pattern delays.
- **AC15 (rule):` No new text, buttons, sections, pages, menu items interior pages existing content element for content excepting structural wrappers and standard classes applied tokens.
- **AC16 (rule):` forms reservation form submit handlers work — all reservation / profile / admin action handlers continue functioning after changes. No id selectors relied upon by JS intact.
- **AC17 (rule):` Responsive` horizontal overflow on any interior page breakpoint 960px 640px 480px.
- **AC18 (rule):` Sidebar drawer on pages collapses drawer toggle 960px below works as dashboard.

### Rubric Criteria `rubric` evaluative quality dimensions

- **AC19 (rubric): Visual holism (0 5). Scale: 0 — pages visibly read as five designers; 2 — mostly consistent with occasional jarring mismatches; 3 — consistent; 4 — polished unified identity; 5 every page looks designed single system. Threshold pass >= 4.
- **AC20 (rubric): Typography hierarchy fidelity (0-5). 0 — inconsistent sizes/weights/line-heights. 3 — tokens used, sizes follow scale explicitly. 5 perfectly matches reference rhythm exactly. Pass threshold >= 4.
- **AC21 (rubric): Component state (0-5). 0 — interactions broken or invisible. 3 — most states correct. 5 — every component focus/hover/active/error matches landing/login. Pass >= 4.
- **AC22 (rubric): Spatial balance (0-5). 0 — unbalanced crowding. 3 — acceptable padding margins. 5 — clean breathing room, consistent rhythm. Pass >= 4.
- **AC23 (rubric): Motion accessibility (0-5). 0 — blobs animations ignore reduced-motion. 3 — reduced-motion disables animation. 5 — honours + entrance animations reduced motion fully disabled. Pass >= 4.
