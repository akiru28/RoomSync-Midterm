# RoomSync

> Room and laboratory reservation system for academic spaces.

This README reflects the current application scope. Older references to removed modules or legacy project branding were cleaned up to match the system that exists in this repository today.

## Overview

RoomSync is a Node.js + Express reservation platform for managing room bookings, lab usage, equipment inventory, and administrative reporting in an academic environment. The system supports role-based access for students, instructors, lab technicians, and administrators.

The current implementation focuses on:
- scheduling classrooms and labs
- submitting and approving reservations
- managing lab issue reports
- tracking room equipment and admin actions
- exporting reservation reports as CSV

## Current features

### Core features
- Room directory with room type, capacity, location, and equipment metadata
- Room availability checks for conflict detection
- Instructor reservation requests with admin review
- Reservation lifecycle tracking: pending, approved, rejected, cancelled, completed
- Lab report submission and resolution workflow for lab technicians and administrators
- Equipment inventory management for labs and rooms
- Reporting dashboards and CSV export for utilization and activity summaries
- User account management with role-based access control

### Security and platform updates
- JWT-based authentication with token invalidation on logout and password change
- Role-based route and page guards
- Server-side validation for reservation data and user account updates
- CSV sanitization to prevent spreadsheet formula injection
- Explicit local-only bypass option for development, gated behind a configured token

## User roles

| Role | Access overview |
|---|---|
| Student | Browse room and availability data; view approved schedule |
| Instructor | Submit reservations; view own reservations; manage pending/approved requests |
| Lab Tech | Submit and review own lab reports; access lab-related reporting |
| Admin | Full access to user management, room management, equipment, reservations, and reports |

### Role defaults in the app
- Student registration is the default public registration flow
- Instructor, lab tech, and admin accounts are expected to be created by an administrator or seeded in the database
- Reservation creation is restricted to instructor-level roles; admin may create on behalf of instructors

## Tech stack

- Runtime: Node.js 18+
- Web framework: Express.js
- Database: MySQL/MariaDB via mysql2
- Authentication: JWT + bcrypt hashing
- Frontend: Vanilla HTML, CSS, and JavaScript with no build step
- Validation: custom server-side validators
- Testing: Node.js built-in test runner (`node:test`)

## Project structure

```text
RoomSync/
├─ .env.example
├─ .gitignore
├─ package.json
├─ README.md
├─ public/
│  ├─ assets/
│  ├─ components/
│  ├─ css/
│  ├─ js/
│  └─ pages/
├─ sql/
│  ├─ add_laboratory_reporting.sql
│  ├─ add_reservation_program_section.sql
│  ├─ lecture_room_reservation.sql
│  ├─ roomsync.sql
│  ├─ roomsync_database.sql
│  ├─ roomsync_database_full_dump.sql
│  └─ roomsync_update_existing_database.sql
├─ src/
│  ├─ app.js
│  ├─ server.js
│  ├─ config/
│  │  ├─ database.js
│  │  └─ environment.js
│  ├─ constants/
│  │  └─ roles.js
│  ├─ controllers/
│  │  ├─ authController.js
│  │  ├─ equipmentController.js
│  │  ├─ laboratoryReportController.js
│  │  ├─ reportController.js
│  │  ├─ reservationController.js
│  │  └─ roomController.js
│  ├─ middleware/
│  │  ├─ authMiddleware.js
│  │  ├─ errorMiddleware.js
│  │  └─ roleMiddleware.js
│  ├─ models/
│  │  ├─ Reservation.js
│  │  ├─ Room.js
│  │  └─ User.js
│  ├─ repositories/
│  │  ├─ equipmentRepository.js
│  │  ├─ laboratoryReportRepository.js
│  │  ├─ reservationRepository.js
│  │  ├─ roomRepository.js
│  │  └─ userRepository.js
│  ├─ routes/
│  │  ├─ adminRoutes.js
│  │  ├─ authRoutes.js
│  │  ├─ reportRoutes.js
│  │  ├─ reservationRoutes.js
│  │  ├─ roomRoutes.js
│  │  └─ userRoutes.js
│  ├─ services/
│  │  ├─ authService.js
│  │  ├─ conflictService.js
│  │  ├─ laboratoryReportService.js
│  │  ├─ notificationService.js
│  │  └─ reservationService.js
│  ├─ utils/
│  │  ├─ dateUtils.js
│  │  ├─ generateId.js
│  │  └─ response.js
│  ├─ validators/
│  │  ├─ authValidator.js
│  │  └─ reservationValidator.js
│  └─ ...
├─ tests/
│  └─ unit/
├─ uploads/
└─ package-lock.json
```

## Quick start

### Prerequisites
- Node.js 18 or newer
- npm 9+
- MySQL or MariaDB running locally or on a reachable server

### 1) Install dependencies

```bash
npm install
```

### 2) Create environment variables

```bash
cp .env.example .env
```

Update `.env` with your database and JWT configuration. The default example is:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lecture_room_reservation
JWT_SECRET=replace-with-a-unique-random-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### 3) Initialize the database

For a fresh install:

```bash
mysql -u root -p < sql/roomsync_database.sql
```

If you are updating an existing compatible database, apply the additive migration scripts in order:

```bash
mysql -u root -p < sql/add_laboratory_reporting.sql
mysql -u root -p < sql/add_reservation_program_section.sql
```

> The project includes several dump and migration scripts. Use the database script that matches your setup; the full dump and update scripts are intended for migration scenarios.

### 4) Run the app

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Seed accounts

The project includes sample users for local development and testing. These are created by the database seed scripts when available.

| Role | Email | Password |
|---|---|---|
| Admin | admin@my.cspc.edu.ph | admin123 |
| Instructor | instructor@my.cspc.edu.ph | prof123 |
| Student | student@my.cspc.edu.ph | student123 |
| Lab Tech | labtech@my.cspc.edu.ph | labtech123 |

## Development-only bypass

A hard-coded admin bypass is not enabled by default. For local-only testing, set `DEV_BYPASS_TOKEN` in `.env` and send that value as a bearer token. The bypass remains disabled in production unless the token is explicitly configured.

## Key API routes

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Users
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/:id`

### Rooms
- `GET /api/rooms`
- `GET /api/rooms/:id`
- `GET /api/rooms/:id/availability`
- `GET /api/rooms/:id/equipment`
- `POST /api/rooms` (admin)
- `PATCH /api/rooms/:id` (admin)
- `DELETE /api/rooms/:id` (admin)

### Reservations
- `GET /api/reservations`
- `POST /api/reservations`
- `GET /api/reservations/:id`
- `PATCH /api/reservations/:id/status`
- `GET /api/reservations/schedule`

### Lab reports and admin reporting
- `POST /api/reports`
- `GET /api/reports`
- `GET /api/reports/:id`
- `PATCH /api/reports/:id`
- `GET /api/admin/reports/utilization`
- `GET /api/admin/reports/by-status`
- `GET /api/admin/reports/user-activity`
- `GET /api/admin/reports/export.csv`

## Scripts

```bash
npm start    # production server
npm run dev  # nodemon development server
npm test     # run the Node.js test suite
```

## Testing

The repository includes automated checks for core logic such as:
- reservation concurrency safety
- date/time round-tripping with MySQL DATETIME handling
- reservation validation
- JWT token verification and expiry
- role and status authorization
- report access rules
- room feature patch integrity

Run tests with:

```bash
npm test
```

## Notes on scope

This version of RoomSync is intentionally scoped to the academic reservation and lab-management workflow used by the project. Features that are no longer part of the active implementation are intentionally not documented here so the project documentation stays aligned with the codebase.

## License

MIT
