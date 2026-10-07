-- ============================================================
-- RoomSync - Room / Laboratory Reservation System
-- Database: MySQL / MariaDB (XAMPP compatible)
-- ============================================================
-- IMPORTANT:
-- 1. Import this file in phpMyAdmin or run it through MySQL/MariaDB.
-- 2. The application currently expects the database name:
--      lecture_room_reservation
-- 3. Current application roles:
--      student, instructor, lab_tech, admin
-- 4. Only instructor can create reservations.
-- 5. Only admin can approve/reject reservations.
-- 6. Lab Tech is view/report-only and cannot reserve or approve.
-- ============================================================

CREATE DATABASE IF NOT EXISTS lecture_room_reservation
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lecture_room_reservation;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,

    role ENUM(
        'student',
        'instructor',
        'lab_tech',
        'admin'
    ) NOT NULL DEFAULT 'student',

    department VARCHAR(150) NULL DEFAULT NULL,
    token VARCHAR(255) NULL DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_token (token),

    KEY idx_users_role (role),
    KEY idx_users_department (department),

    CONSTRAINT chk_users_name
        CHECK (CHAR_LENGTH(TRIM(name)) >= 2)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- ROOMS / LABORATORIES
-- ------------------------------------------------------------
CREATE TABLE rooms (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,

    type ENUM(
        'lecture',
        'lab',
        'seminar',
        'hall'
    ) NOT NULL,

    capacity INT UNSIGNED NOT NULL,

    location VARCHAR(200) NULL DEFAULT NULL,

    -- Stored as JSON because the existing Node.js repository
    -- reads/writes this field as an array.
    features JSON NULL,

    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_rooms_code (code),

    KEY idx_rooms_type (type),
    KEY idx_rooms_active (is_active),
    KEY idx_rooms_capacity (capacity),

    CONSTRAINT chk_rooms_capacity_positive
        CHECK (capacity > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- RESERVATIONS
-- ------------------------------------------------------------
CREATE TABLE reservations (
    id VARCHAR(100) NOT NULL,

    room_id INT UNSIGNED NOT NULL,
    user_id VARCHAR(100) NOT NULL,

    purpose VARCHAR(255) NOT NULL,
    program_section VARCHAR(150) NOT NULL DEFAULT '',

    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,

    attendees INT UNSIGNED NOT NULL DEFAULT 1,

    notes TEXT NULL,

    status ENUM(
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed'
    ) NOT NULL DEFAULT 'pending',

    approved_by VARCHAR(100) NULL DEFAULT NULL,
    approved_at DATETIME NULL DEFAULT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_reservations_room_dates
        (room_id, start_date, end_date),

    KEY idx_reservations_user_status
        (user_id, status),

    KEY idx_reservations_status
        (status),

    KEY idx_reservations_approved_by
        (approved_by),

    CONSTRAINT chk_reservations_time_range
        CHECK (start_date < end_date),

    CONSTRAINT chk_reservations_attendees_positive
        CHECK (attendees > 0),

    CONSTRAINT fk_reservation_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservation_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------
-- The current application does not actively write to this table
-- yet, but it is included for system auditing and future use.
CREATE TABLE audit_logs (
    id VARCHAR(100) NOT NULL,

    actor_id VARCHAR(100) NULL DEFAULT NULL,

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,

    metadata JSON NULL,

    ip VARCHAR(100) NULL DEFAULT NULL,
    user_agent TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_audit_actor (actor_id),
    KEY idx_audit_logs_entity (entity_type, entity_id),
    KEY idx_audit_logs_created_at (created_at),

    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED DATA
-- ============================================================
-- These are development seed accounts only.
-- Replace passwords before any real deployment.
-- These credentials are for local development/testing only.
-- Password hashing should be enabled before production use.

-- ------------------------------------------------------------
-- SEED USERS
-- ------------------------------------------------------------
INSERT INTO users
    (id, name, email, password, role, department, token)
VALUES
    (
        'user-demo-admin',
        'Demo Admin',
        'admin@my.cspc.edu.ph',
        'admin123',
        'admin',
        'College of Computer Studies',
        'demo-token-admin'
    ),
    (
        'user-demo-student',
        'Demo Student',
        'student@my.cspc.edu.ph',
        'student123',
        'student',
        'College of Computer Studies',
        'demo-token-student'
    ),
    (
        'user-demo-instructor',
        'Demo Instructor',
        'instructor@my.cspc.edu.ph',
        'prof123',
        'instructor',
        'College of Computer Studies',
        'demo-token-instructor'
    ),
    (
        'user-demo-labtech',
        'Demo Laboratory Technician',
        'labtech@my.cspc.edu.ph',
        'labtech123',
        'lab_tech',
        'College of Computer Studies',
        'demo-token-labtech'
    );


-- ------------------------------------------------------------
-- SEED ROOMS / LABORATORIES
-- ------------------------------------------------------------
INSERT INTO rooms
    (name, code, type, capacity, location, features, description, is_active)
VALUES
    (
        'Lab A - Room 101',
        'LAB-101',
        'lab',
        24,
        'Building 1, Floor 1',
        '["Projector", "24 Computers", "Whiteboard"]',
        'General purpose computer laboratory',
        TRUE
    ),
    (
        'Lab B - Room 102',
        'LAB-102',
        'lab',
        30,
        'Building 1, Floor 1',
        '["Linux Workstations", "3D Printer", "Projector"]',
        'Advanced laboratory with specialized equipment',
        TRUE
    ),
    (
        'Room C - 203',
        'RM-203',
        'seminar',
        12,
        'Building 1, Floor 2',
        '["Whiteboard", "TV Screen"]',
        'Small seminar room',
        TRUE
    ),
    (
        'Lab D - Room 205',
        'LAB-205',
        'lab',
        20,
        'Building 1, Floor 2',
        '["Mac Lab", "Projector", "Drawing Tablets"]',
        'Mac laboratory for design and media courses',
        TRUE
    ),
    (
        'Lecture Hall 301',
        'LH-301',
        'lecture',
        80,
        'Building 2, Floor 3',
        '["Stage", "Large Projector", "Sound System"]',
        'Large lecture hall for general assemblies',
        TRUE
    ),
    (
        'Seminar Room 302',
        'SR-302',
        'seminar',
        18,
        'Building 2, Floor 3',
        '["Video Conferencing", "Whiteboard", "TV"]',
        'Seminar room with video conferencing',
        TRUE
    );


-- ------------------------------------------------------------
-- SEED RESERVATIONS
-- ------------------------------------------------------------
-- IMPORTANT:
-- Students are NOT used as reservation owners here because the
-- current reservationService.js restricts creation to instructor only.
-- All instructor reservations default to pending and require Admin approval.

INSERT INTO reservations
    (
        id,
        room_id,
        user_id,
        purpose,
        start_date,
        end_date,
        attendees,
        notes,
        status,
        approved_by,
        approved_at
    )
VALUES
    (
        'res-demo-001',
        1,
        'user-demo-instructor',
        'Web Development Class',
        DATE_ADD(NOW(), INTERVAL 1 DAY),
        DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 2 HOUR),
        24,
        'Demo reservation for development/testing.',
        'pending',
        NULL,
        NULL
    ),
    (
        'res-demo-002',
        2,
        'user-demo-instructor',
        'Laboratory Maintenance Training',
        DATE_ADD(NOW(), INTERVAL 2 DAY),
        DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 2 HOUR),
        15,
        'Demo approved reservation.',
        'approved',
        'user-demo-admin',
        NOW()
    ),
    (
        'res-demo-003',
        5,
        'user-demo-instructor',
        'System Orientation',
        DATE_ADD(NOW(), INTERVAL 3 DAY),
        DATE_ADD(DATE_ADD(NOW(), INTERVAL 3 DAY), INTERVAL 2 HOUR),
        40,
        'Demo administrator reservation.',
        'approved',
        'user-demo-admin',
        NOW()
    );


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these after importing if you want to verify the database.

-- SELECT * FROM users;
-- SELECT * FROM rooms;
-- SELECT * FROM reservations;
-- SELECT * FROM audit_logs;

-- Check reservation + room + user relationships:
-- SELECT
--     r.id,
--     rooms.code AS room_code,
--     rooms.name AS room_name,
--     users.name AS reserved_by,
--     users.role,
--     r.purpose,
--     r.start_date,
--     r.end_date,
--     r.status
-- FROM reservations r
-- JOIN rooms ON rooms.id = r.room_id
-- JOIN users ON users.id = r.user_id
-- ORDER BY r.start_date;
