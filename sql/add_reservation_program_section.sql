USE lecture_room_reservation;

CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(100) NOT NULL,
    room_id INT UNSIGNED NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    program_section VARCHAR(150) NOT NULL DEFAULT '',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    attendees INT UNSIGNED NOT NULL DEFAULT 1,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed')
        NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(100) NULL DEFAULT NULL,
    approved_at DATETIME NULL DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reservations_room_dates (room_id, start_date, end_date),
    KEY idx_reservations_user_status (user_id, status),
    KEY idx_reservations_status (status),
    KEY idx_reservations_approved_by (approved_by),
    CONSTRAINT chk_reservation_valid_time CHECK (end_date > start_date),
    CONSTRAINT chk_reservations_attendees_positive CHECK (attendees > 0),
    CONSTRAINT fk_reservation_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_approved_by FOREIGN KEY (approved_by)
        REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS program_section VARCHAR(150) NOT NULL DEFAULT '' AFTER purpose;

SET @roomsync_sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'reservations'
          AND constraint_name = 'chk_reservation_valid_time'
          AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE reservations ADD CONSTRAINT chk_reservation_valid_time CHECK (end_date > start_date)'
);
PREPARE roomsync_stmt FROM @roomsync_sql;
EXECUTE roomsync_stmt;
DEALLOCATE PREPARE roomsync_stmt;
