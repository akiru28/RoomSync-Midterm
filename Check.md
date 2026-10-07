# RoomSync Role-Based Access Control Audit

**Scope:** Frontend/UI, backend API, authentication, authorization, reservation workflow, and in-memory data layer.  
**Audit type:** Static code review; no code changes were made as part of the audit.

## A. Overall System Assessment

🔴 **Not production-ready as a role-based reservation system.** The project has an Express API with some useful role middleware and reservation validation, but the actual frontend is a separate localStorage demo and does not call the backend API. As a result, the UI’s login, reservation, calendar, and admin approval features do not use server-enforced authentication or persisted data.

There is no real database, migration, test suite, or durable session/token implementation.

## B. Role/Permission Matrix

| Capability | Admin | Faculty / Instructor | Student |
|---|---:|---:|---:|
| Login via backend | ✅ | ✅ | ✅ |
| Login via frontend UI | ⚠️ Any email/password accepted | ⚠️ | ⚠️ |
| View rooms/labs | ✅ | ✅ | ✅ |
| View schedules | ⚠️ Demo calendar only | ⚠️ Demo calendar only | ⚠️ Demo calendar only |
| Create reservation | ✅ Auto-approved | 🔴 Auto-approved | ✅ Pending in API |
| View own reservations | ✅ | ⚠️ Can view all through API | ✅ List endpoint filters to own |
| View another user’s reservation | ✅ | 🔴 Allowed | 🔴 Allowed by detail endpoint |
| Update another user’s reservation | ✅ | 🔴 Allowed | 🔴 Allowed |
| Cancel own reservation | ✅ | ✅ | ✅ |
| Approve/reject reservations | ✅ | 🔴 Allowed by backend | 🔴 Allowed in frontend admin page |
| Manage rooms | ✅ API protected | ❌ API denied | ❌ API denied |
| Access Admin page UI | ✅ | 🔴 Allowed | 🔴 Allowed |
| Manage users | ⚠️ List/delete only | ❌ | ❌ |
| Reports | ✅ API protected | ❌ | ❌ |
| System settings | ❌ | ❌ | ❌ |

The backend role is named `instructor`, not `faculty`; there is no `faculty` role constant. See [roles.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\constants\roles.js:1).

## C. Admin Features

- ✅ **Room CRUD API:** Admin-only `POST`, `PATCH`, and `DELETE /api/rooms`. Enforced through `authenticate` and `requireAdmin`. [roomRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\roomRoutes.js:25)

- ✅ **View users, reservations, and reports API:** `/api/admin/*` is correctly protected by router-level admin middleware. [adminRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\adminRoutes.js:11)

- ⚠️ **User management:** Admin can list and delete users, but cannot create, edit roles, reset passwords, deactivate accounts, or protect against deleting the final/current admin. [adminRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\adminRoutes.js:30)

- ⚠️ **Reservation approval UI:** Approve/reject controls exist, but they only update the browser’s shared localStorage demo store; they do not call `/api/reservations/:id/status`. [admin.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\admin.js:25)

- 🔴 **Admin UI page protection:** `admin.html` only checks whether any localStorage token exists. It does not verify role, call `/api/auth/me`, or restrict the sidebar link. Any user can open the page and use its local demo approval controls. [admin.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\admin.js:4), [main.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\main.js:155)

- ❌ **Manage system settings:** No settings routes, models, controllers, or UI exist.

- ❌ **Admin room-management interface:** The Admin page claims rooms can be added/edited/deleted, but no corresponding UI exists. The rooms page is read-only demo data.

## D. Faculty Features

The backend calls this role `instructor`, not Faculty.

- ✅ **Backend login:** Existing instructor records can log in through `/api/auth/login`.

- ⚠️ **View rooms/labs and schedule:** API endpoints exist, but the frontend reads hard-coded/localStorage demo data instead of the API. [rooms.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\rooms.js:3), [calendar.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\calendar.js:24)

- 🔴 **Reservation approval bypass:** An instructor-created reservation is automatically `approved`, bypassing the requested Admin/authorized approval workflow. Instructors can also approve or reject other users’ reservations through the API. [reservationService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\reservationService.js:73)

- ⚠️ **Own reservation history:** There is no dedicated “My Reservations” page. The dashboard and calendar show all local demo reservations, not the current user’s actual API reservations.

- ✅ **Cancel own reservation through API:** The status route supports an owner changing a reservation to `cancelled`.

- 🔴 **Can view other users’ data:** Instructors are not restricted to their own reservation list, and the reservation detail endpoint has no ownership check.

## E. Student Features

- ✅ **Backend login and registration support:** Students can authenticate, and API registration defaults to Student.

- ⚠️ **Frontend login and registration:** The UI does not use the API. Login accepts any email/password with four characters, and registration does not persist an account. [auth.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\auth.js:3), [register.html](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\pages\register.html:39)

- ⚠️ **View rooms/labs and schedules:** Screens exist, but are demo-only and may differ from API data.

- ✅ **Submit reservation through API:** Student-created reservations are pending and undergo date, capacity, active-room, and conflict checks. [reservationService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\reservationService.js:28)

- ⚠️ **Submit reservation through UI:** The UI submits only to localStorage, without API validation, capacity checking, availability checking, or server persistence. [reservation.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\reservation.js:24)

- ✅ **List own reservations through API:** `GET /api/reservations` forces the Student’s `userId` filter. [reservationService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\reservationService.js:154)

- 🔴 **Can access Admin UI:** A Student can visit `admin.html`; the client has no role guard.

- 🔴 **Can update any reservation via API:** `PATCH /api/reservations/:id` directly updates records without ownership, role, status, or conflict validation. [reservationController.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\controllers\reservationController.js:69)

## F. Authentication and Authorization

- ⚠️ **Backend authentication:** Bearer tokens are checked against the in-memory user records. API room-admin routes and `/api/admin/*` are protected correctly.

- 🔴 **Frontend authentication is disconnected from backend:** `Auth.login()` generates a client-only fake token and stores arbitrary user information in localStorage. It does not call the API. [main.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\main.js:158)

- 🔴 **Frontend authorization is absent:** `requireAuth()` checks only that `rr_token` and `rr_user` exist; it never verifies a token or a role. A user can manually set those values and access all protected static pages, including Admin.

- 🔴 **Registration privilege escalation:** `/api/auth/register` accepts any valid role supplied in the request body, including `admin`, `instructor`, and `lab_tech`. A public registrant can create an Admin account. [authService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\authService.js:30)

- 🔴 **Plaintext passwords:** Demo seed accounts and newly registered passwords are stored and compared as plaintext. [database.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\config\database.js:5), [authService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\authService.js:53)

- 🔴 **Development admin bypass token:** In development, a hard-coded bearer token grants Admin privileges. It must never be available outside explicitly controlled local development. [authMiddleware.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\middleware\authMiddleware.js:5)

- 🔴 **User-information disclosure:** Any authenticated user can request `/api/users/:id`; there is no self-or-admin authorization condition. [userRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\userRoutes.js:18)

## G. Reservation Workflow

Expected workflow:

`User → Request → Admin approval/rejection → confirmed schedule`

Actual backend workflow:

- ✅ Student API request becomes `pending`.
- 🔴 Only Instructor API requests can create reservations, and they start as `pending`.
- ⚠️ Admin can approve/reject through the API status route.
- 🔴 Only Admin may approve or reject reservations through the status API.
- 🔴 The UI workflow is separate: it creates and approves/rejects localStorage records, not API records.
- ⚠️ Status transition rules exist: pending → approved/rejected/cancelled; approved → cancelled/rejected/completed. [reservationService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\reservationService.js:10)

Reservation protections:

- ✅ **Basic date validation:** prevents past start dates, end-before-start, durations under 15 minutes, and durations over 8 hours.

- ✅ **Capacity validation:** API rejects attendee counts above room capacity.

- ✅ **Inactive room check:** API reservation creation rejects inactive rooms.

- ⚠️ **Double-booking prevention:** API detects overlapping reservation records for the same room. However:
  - It treats pending, rejected, and cancelled reservations as conflicts.
  - It has no database transaction or lock, so concurrent API requests could both pass conflict checks.
  - UI submissions do not perform any conflict check.
  - The generic update endpoint can create conflicts after creation.

- 🔴 **Availability endpoint incorrect:** `GET /api/rooms/:id/availability` ignores the room ID and requested time range; it returns every active room. [roomController.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\controllers\roomController.js:111), [roomRepository.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\repositories\roomRepository.js:124)

- 🔴 **Unauthorized reservation modification:** Any authenticated user can call generic reservation `PATCH` for any reservation and alter fields including status, user, room, time, or approval metadata.

- 🔴 **Reservation details are not owner-protected:** `GET /api/reservations/:id` returns any reservation to any authenticated user.

- ⚠️ **Cancellation behavior inconsistent:** `DELETE` permanently deletes a reservation, while the status endpoint marks it cancelled. Permanent deletion removes history and auditability.

## H. Database Support

- 🔴 **No database exists.** The configured “database” is process-memory arrays seeded at startup. All users, tokens, rooms, reservations, and changes disappear on server restart. [database.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\config\database.js:3)

- ⚠️ **Models are specifications only:** `User`, `Room`, and `Reservation` describe fields, but no ORM, database tables, migrations, constraints, or foreign keys exist.

- ❌ **No actual tables or migrations:** Despite README references to `database/`, migrations, seeds, tests, and documentation, those directories/files are absent.

- ❌ **Audit logging is not implemented.**

## I. Missing Features

- ❌ Real database, migrations, indexes, and constraints.
- ❌ API-connected frontend.
- ❌ Role-based frontend navigation and protected-page checks.
- ❌ Faculty role naming and policy definition.
- ❌ Dedicated “My Reservations” and history views.
- ❌ Admin user create/edit/deactivate/reset-role capabilities.
- ❌ Admin room management UI.
- ❌ System settings feature.
- ❌ Accurate time-range room availability.
- ❌ Real email/SMS notifications; messages are only stored in memory.
- ❌ Audit trail and approval/rejection reason.
- ❌ Automated tests; `package.json` has no test script despite README claims.
- ❌ Safe session/token implementation, password hashing, password reset, and account lifecycle controls.

## J. Bugs or Security Issues

1. 🔴 Public API registration can create an Admin account.
2. 🔴 Students/Faculty can access the Admin page UI and approve/reject local demo reservations.
3. 🔴 Any authenticated user can update any reservation.
4. 🔴 Any authenticated user can view any reservation by ID.
5. 🔴 Only Instructors can create reservation requests, and only Admin can approve/reject them.
6. 🔴 Frontend fake authentication is unrelated to backend authentication.
7. 🔴 Passwords are plaintext; tokens are non-cryptographic demo strings.
8. 🔴 No persistence means all operational data is lost on restart.
9. 🔴 Availability endpoint falsely reports all active rooms as available.
10. ⚠️ Conflict detection blocks time slots for rejected/cancelled reservations and has race-condition risk.
11. ⚠️ Static room/lab and calendar data can disagree with API data.
12. ⚠️ Admin reports count reservations regardless of status, so utilization can include rejected/cancelled reservations.
13. ⚠️ Hard-coded development Admin bypass token exists.
14. ⚠️ User profile and dashboard behavior are demo-only and not authorization-backed.

## K. Recommended Improvements

1. Replace the in-memory arrays with MySQL/MariaDB tables, migrations, foreign keys, indexes, and transactional conflict checks.
2. Replace frontend localStorage demo modules with an API client that sends the backend-issued bearer token.
3. Use secure password hashing and signed/expiring tokens; remove the hard-coded bypass token from deployable code.
4. Public registration must always create only Student accounts; Admin-created workflows should assign Faculty/Instructor/Admin roles.
5. Add backend ownership authorization to reservation detail, update, cancellation, and list endpoints.
6. Remove or strictly define Instructor/Lab Tech approval powers. If only Admin approves, enforce `requireAdmin` on approval/rejection.
7. Replace generic reservation PATCH with an owner-safe request-edit operation restricted to pending reservations; revalidate room, time, capacity, and conflicts.
8. Protect `admin.html` through verified identity/role checks, hide Admin navigation for non-admins, and always rely on API enforcement.
9. Implement actual room availability queries that exclude only blocking statuses, usually `pending` and `approved`.
10. Use soft cancellation/status history and audit every administrative action.
11. Build a real Admin management interface and personal reservation-history screens.
12. Add unit/integration tests for authorization, privilege escalation, ownership, schedule conflicts, unavailable rooms, and concurrent booking.

## L. Exact Files That Need Changes

Priority security/backend:

- [src/services/authService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\authService.js:15) — prevent self-assigned privileged roles; implement secure authentication.
- [src/middleware/authMiddleware.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\middleware\authMiddleware.js:1) — replace demo tokens and remove deployable Admin bypass.
- [src/controllers/reservationController.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\controllers\reservationController.js:52) — authorize detail/update operations and remove unrestricted generic patching.
- [src/services/reservationService.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\services\reservationService.js:28) — correct approval policy, cancellation policy, conflict status filtering, and owner-safe updates.
- [src/routes/reservationRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\reservationRoutes.js:7) — apply role/ownership middleware to sensitive operations.
- [src/controllers/userController.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\controllers\userController.js:49) and [src/routes/userRoutes.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\routes\userRoutes.js:18) — restrict user lookup to self/Admin.
- [src/repositories/roomRepository.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\repositories\roomRepository.js:124) and [src/controllers/roomController.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\controllers\roomController.js:111) — implement accurate availability.
- [src/config/database.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\config\database.js:1) — replace memory data with real persistence.
- [src/repositories/reservationRepository.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\repositories\reservationRepository.js:112) — implement persistent conflict-safe querying and controlled updates.
- [src/constants/roles.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\src\constants\roles.js:1) — define the Faculty role/policy consistently.

Priority frontend:

- [public/js/main.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\main.js:155) — replace fake localStorage auth and demo store.
- [public/js/auth.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\auth.js:1) — call actual login/register API endpoints.
- [public/js/admin.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\admin.js:1) — enforce Admin role and call protected Admin/reservation APIs.
- [public/js/reservation.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\reservation.js:24) — submit through API and display server validation/conflict results.
- [public/js/rooms.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\rooms.js:3) — load rooms and availability from API.
- [public/js/calendar.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\calendar.js:24) — load authorized schedule data from API.
- [public/js/dashboard.js](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\js\dashboard.js:1) — show role-appropriate, API-backed data.
- [public/pages/admin.html](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\pages\admin.html:1), [public/pages/dashboard.html](C:\xampp\htdocs\RL_Res-Void\room-reservation-system\public\pages\dashboard.html:1), and all sidebar pages — remove unconditional Admin links and apply role-aware navigation.
