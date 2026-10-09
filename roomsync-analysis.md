# RoomSync issue analysis

Analyzed revision: `2d072b50871ceaf9d02d23a9754e752aba039129` on 2026-10-09. Application files were not changed.

## Summary

15 findings: 3 high, 10 medium, 2 low. Priority: fix reservation authorization and status races, restrict the development bypass, then repair availability/features and fresh database setup.

Scope: backend routes, controllers, services, repositories, authentication, core frontend flows, SQL schema/migrations, documentation and dependency audit. This is a bounded repository analysis, not a guarantee that every possible bug has been found. Findings distinguish focused reproductions from static inspection.

## Findings

### 1. High: Reservation details exposed to unrelated users

Location: [src/services/reservationService.js:137](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/services/reservationService.js:137)

Reproduced with a stubbed repository. An authenticated student who knows a reservation ID can PATCH its status to its existing value and receive the full reservation, including owner, purpose and notes. The early return happens before ownership/role authorization. Authorize access before returning, including idempotent requests.

### 2. High: Concurrent status changes can resurrect cancelled bookings

Location: [src/services/reservationService.js:160](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/services/reservationService.js:160)

Reproduced with controlled service interleaving. Approval reads pending; the owner cancels successfully; the original approval then overwrites cancelled with approved. The repository UPDATE checks only ID, not previous status. A new overlapping booking created after cancellation can consequently collide with the revived booking. Validate and update under the same transaction and room lock, or use conditional updates with conflict rechecks. Admin edits also validate status outside the transaction and can race with approval.

### 3. High: Default environment enables a fixed administrator bypass

Location: [src/middleware/authMiddleware.js:48](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/middleware/authMiddleware.js:48)

Static finding, conditional on deployment configuration. NODE_ENV defaults to development, where a fixed token grants administrator access without a database account or password. npm start does not set production mode. Any network-accessible installation using the defaults permits this bypass. Require explicit local-only opt-in, and fail closed in deployment configuration.

### 4. Medium: Room availability uses the wrong SQL parameter order

Location: [src/repositories/roomRepository.js:87](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/repositories/roomRepository.js:87)

Query-capture reproduction confirmed that SQL expects room ID, end time, start time, but receives end time, start time, room ID. Every room-specific availability call uses this branch, so results do not reflect the requested room/range. Bind values in placeholder order and use the shared UTC conversion.

### 5. Medium: Editing room features silently clears them

Location: [src/repositories/roomRepository.js:68](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/repositories/roomRepository.js:68)

Query-capture reproduction: updating features to ["Projector"] binds "[]". The update builds a literal ["features", "features"] entry instead of retaining patch.features, so the array check always fails. Preserve the supplied array.

### 6. Medium: Fresh-install instructions leave laboratory features unusable

Location: [README.md:250](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/README.md:250)

Schema inspection confirmed sql/roomsync_database.sql creates users, rooms, reservations and audit_logs, but neither equipment nor laboratory_reports. Quick Start instructs fresh installs to import this file and describes the lab migration for existing installations. Runtime repositories unconditionally query the missing tables. Include the reporting migration in fresh-install instructions or consolidate the schema. Live import was not executed.

### 7. Medium: Self-service password changes retain the existing session

Location: [src/controllers/userController.js:41](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/controllers/userController.js:41)

Controller reproduction confirmed the password hash changes without resetting token. A previously copied bearer token remains usable until expiry/logout, unlike admin password changes which explicitly invalidate it. Revoke or rotate the session when a password changes.

### 8. Medium: CSV export allows spreadsheet formula injection

Location: [src/controllers/reportController.js:103](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/controllers/reportController.js:103)

Export reproduction confirmed a user-controlled purpose of =1+1 appears as "=1+1". CSV quoting escapes delimiters but does not prevent spreadsheet formula interpretation. Opening an export in a spreadsheet can evaluate untrusted cells; exact behavior depends on the spreadsheet. Neutralize formula prefixes in exported user-controlled text.

### 9. Medium: Utilization includes cancelled and rejected reservations

Location: [src/controllers/reportController.js:25](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/controllers/reportController.js:25)

Controller reproduction counted a cancelled one-hour booking as 60 reserved minutes. The range query returns every status and utilization filters only room ID. It also counts the entire duration of bookings crossing the report boundary. Define qualifying statuses and clip intervals to the requested period before calculating occupancy.

### 10. Medium: Equipment endpoint lacks the documented authentication guard

Location: [src/routes/roomRoutes.js:23](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/routes/roomRoutes.js:23)

Static route inspection: GET /api/rooms/:id/equipment directly invokes the controller, unlike the authenticated access promised in the README. Anonymous callers can read inventory codes, descriptions and status. Add authenticate if inventory is intended to remain restricted, or explicitly revise the access policy.

### 11. Medium: Input validation permits values exceeding database column sizes

Location: [src/validators/authValidator.js:12](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/validators/authValidator.js:12)

Static schema/validator comparison. Public registration does not cap name/email/department at VARCHAR(150), profile updates also omit caps, and instructor reservation creation does not cap purpose at VARCHAR(255). Admin paths already enforce these bounds. Oversized values reach MySQL and produce database errors under strict mode or truncation otherwise. Apply consistent validation to every entry point.

### 12. Medium: Deleting referenced rooms/users fails as an internal error

Location: [src/repositories/roomRepository.js:81](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/src/repositories/roomRepository.js:81)

Static schema/path inspection. Room and user removal issue hard DELETE statements while reservation foreign keys use ON DELETE RESTRICT. Deleting an entity with reservation history therefore fails; the global error handler returns the raw database message with HTTP 500. Prefer deactivation/archival where needed, or return an actionable 409 explaining existing references. Equipment and laboratory report references add similar restrictions.

### 13. Medium: Development dependency tree contains known vulnerabilities

Location: [package.json:34](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/package.json:34)

npm audit reported 14 affected package entries: 9 high and 5 moderate, rooted in the old nodemon dependency chain. These are package entries including inherited advisories, not 14 independently demonstrated application exploits. npm audit --omit=dev reported zero. Update or replace the development watcher and regenerate/recheck the lockfile.

### 14. Low: Reserve buttons lose the selected room

Location: [public/js/rooms.js:177](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/public/js/rooms.js:177)

Static browser-code inspection. Room cards navigate to reservation.html?roomId=..., but reservation.js never reads URLSearchParams or selects that room after loading options. The user must select the room again and can accidentally choose a different one. Apply the query parameter after checking it against available options.

### 15. Low: Profile membership date always shows today

Location: [public/pages/profile.html:165](/home/vercel-sandbox/workspace/repos/github.com/akiru28/roomsync-midterm/public/pages/profile.html:165)

Static inspection. The Member since row formats new Date() instead of user.createdAt, so existing accounts appear to have joined today. Render the stored creation date.

## Validation and limitations

- Existing suite: **7/7 tests passed** (`npm test`).
- JavaScript parsing: **50/50 files passed** under `src/` and `public/js/`. Inline HTML scripts were not included.
- Focused scratch checks: seven defect assertions passed, plus a separate cancellation/approval race reproduction. Repository/database dependencies were stubbed; these are not live database or browser tests.
- Dependency audit: **14 development dependency entries** (9 high, 5 moderate); **0 production dependency entries**.
- Database connectivity: **blocked — ECONNREFUSED** with the current configuration. No database was installed or schema imported during this analysis. Browser workflows and real database concurrency remain unverified.
- Existing concurrency coverage simulates connections and room locks; it does not exercise actual MySQL isolation or concurrent status changes.
- No applicable repository knowledge-base or AGENTS.md files were found during inspection.

## Additional gaps

Authentication routes have no rate limiting and permit four-character passwords. Notifications currently accumulate in an in-memory array; SMTP settings do not cause email delivery. The README also advertises scripts absent from package.json (seed, migrate, lint) and contains stale architecture descriptions. These are implementation/documentation gaps rather than additional reproduced runtime failures.
