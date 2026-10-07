CREATE DATABASE IF NOT EXISTS lecture_room_reservation
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lecture_room_reservation;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'instructor', 'lab_tech', 'admin')
        NOT NULL DEFAULT 'student',
    department VARCHAR(150),
    token VARCHAR(255) UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('lecture', 'lab', 'seminar', 'hall') NOT NULL,
    capacity INT NOT NULL,
    location VARCHAR(200),
    features JSON,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_rooms_capacity_positive CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(100) PRIMARY KEY,
    room_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    attendees INT NOT NULL DEFAULT 1,
    notes TEXT,
    status ENUM(
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed'
    ) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(100),
    approved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_reservations_time_range CHECK (start_date < end_date),
    CONSTRAINT chk_reservations_attendees_positive CHECK (attendees > 0),

    CONSTRAINT fk_reservation_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reservation_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    actor_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(100),
    user_agent TEXT,

    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_reservations_room_dates
    ON reservations (room_id, start_date, end_date);

CREATE INDEX idx_reservations_user_status
    ON reservations (user_id, status);

CREATE INDEX idx_reservations_status
    ON reservations (status);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs (entity_type, entity_id);

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
    'Earl Student',
    'eaalaraz@my.cspc.edu.ph',
    'earlpogi123',
    'student',
    'College of Computer Studies',
    'demo-token-student'
),
(
    'user-demo-instructor',
    'Prof. Rizal',
    'rizal@my.cspc.edu.ph',
    'prof123',
    'instructor',
    'College of Computer Studies',
    'demo-token-instructor'
);

INSERT INTO rooms
(name, code, type, capacity, location, features, description)
VALUES
(
    'Lab A - Room 101',
    'LAB-101',
    'lab',
    24,
    'Building 1, Floor 1',
    '["Projector", "24 Computers", "Whiteboard"]',
    'General purpose computer laboratory'
),
(
    'Lab B - Room 102',
    'LAB-102',
    'lab',
    30,
    'Building 1, Floor 1',
    '["Linux Workstations", "3D Printer", "Projector"]',
    'Advanced lab with specialized equipment'
),
(
    'Room C - 203',
    'RM-203',
    'seminar',
    12,
    'Building 1, Floor 2',
    '["Whiteboard", "TV Screen"]',
    'Small seminar room'
),
(
    'Lab D - Room 205',
    'LAB-205',
    'lab',
    20,
    'Building 1, Floor 2',
    '["Mac Lab", "Projector", "Drawing Tablets"]',
    'Mac lab for design and media courses'
),
(
    'Lecture Hall 301',
    'LH-301',
    'lecture',
    80,
    'Building 2, Floor 3',
    '["Stage", "Large Projector", "Sound System"]',
    'Large lecture hall for general assemblies'
),
(
    'Seminar Room 302',
    'SR-302',
    'seminar',
    18,
    'Building 2, Floor 3',
    '["Video Conferencing", "Whiteboard", "TV"]',
    'Seminar room with video conferencing'
);

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
    'res-1',
    1,
    'user-demo-instructor',
    'Project Meeting',
    DATE_ADD(NOW(), INTERVAL 1 DAY),
    DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 2 HOUR),
    6,
    '',
    'pending',
    NULL,
    NULL
),
(
    'res-2',
    2,
    'user-demo-instructor',
    'Class: Web Development',
    DATE_ADD(NOW(), INTERVAL 3 DAY),
    DATE_ADD(DATE_ADD(NOW(), INTERVAL 3 DAY), INTERVAL 2 HOUR),
    30,
    '',
    'approved',
    'user-demo-admin',
    NOW()
),
(
    'res-3',
    3,
    'user-demo-instructor',
    'Study Group',
    DATE_ADD(NOW(), INTERVAL 2 DAY),
    DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 2 HOUR),
    8,
    '',
    'pending',
    NULL,
    NULL
);