-- Additive, rerunnable migration for MariaDB 10.4+ RoomSync installations.
-- Existing report/equipment rows must use the same room_id; the composite
-- foreign key below will reject any cross-room references.
-- Equipment referenced by historical reports cannot be deleted; retire it instead.
USE lecture_room_reservation;

CREATE TABLE IF NOT EXISTS equipment (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    room_id INT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    status ENUM('operational', 'maintenance', 'retired') NOT NULL DEFAULT 'operational',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_equipment_code (code),
    UNIQUE KEY uq_equipment_id_room (id, room_id),
    KEY idx_equipment_room_status (room_id, status),
    CONSTRAINT fk_equipment_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET @roomsync_sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'equipment'
          AND index_name = 'uq_equipment_id_room'
    ),
    'SELECT 1',
    'ALTER TABLE equipment ADD UNIQUE KEY uq_equipment_id_room (id, room_id)'
);
PREPARE roomsync_stmt FROM @roomsync_sql;
EXECUTE roomsync_stmt;
DEALLOCATE PREPARE roomsync_stmt;

CREATE TABLE IF NOT EXISTS laboratory_reports (
    id VARCHAR(100) NOT NULL,
    room_id INT UNSIGNED NOT NULL,
    equipment_id INT UNSIGNED NULL DEFAULT NULL,
    reported_by VARCHAR(100) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    status ENUM('reported', 'under_review', 'in_progress', 'resolved')
        NOT NULL DEFAULT 'reported',
    resolution_notes TEXT NULL,
    resolved_at DATETIME NULL DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_laboratory_reports_room_status (room_id, status),
    KEY idx_laboratory_reports_reporter (reported_by, created_at),
    KEY idx_laboratory_reports_equipment (equipment_id, room_id),
    KEY idx_laboratory_reports_status (status),
    CONSTRAINT fk_laboratory_report_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_laboratory_report_equipment_room
        FOREIGN KEY (equipment_id, room_id) REFERENCES equipment(id, room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_laboratory_report_reporter
        FOREIGN KEY (reported_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

SET @roomsync_sql = CASE
    WHEN EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'laboratory_reports'
          AND index_name = 'idx_laboratory_reports_equipment'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'laboratory_reports'
          AND index_name = 'idx_laboratory_reports_equipment'
          AND seq_in_index = 2
          AND column_name = 'room_id'
    )
    THEN 'ALTER TABLE laboratory_reports DROP INDEX idx_laboratory_reports_equipment, ADD KEY idx_laboratory_reports_equipment (equipment_id, room_id)'
    WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'laboratory_reports'
          AND index_name = 'idx_laboratory_reports_equipment'
    )
    THEN 'ALTER TABLE laboratory_reports ADD KEY idx_laboratory_reports_equipment (equipment_id, room_id)'
    ELSE 'SELECT 1'
END;
PREPARE roomsync_stmt FROM @roomsync_sql;
EXECUTE roomsync_stmt;
DEALLOCATE PREPARE roomsync_stmt;

SET @roomsync_sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'laboratory_reports'
          AND constraint_name = 'fk_laboratory_report_equipment_room'
          AND constraint_type = 'FOREIGN KEY'
    ),
    'SELECT 1',
    'ALTER TABLE laboratory_reports ADD CONSTRAINT fk_laboratory_report_equipment_room FOREIGN KEY (equipment_id, room_id) REFERENCES equipment (id, room_id) ON UPDATE CASCADE ON DELETE RESTRICT'
);
PREPARE roomsync_stmt FROM @roomsync_sql;
EXECUTE roomsync_stmt;
DEALLOCATE PREPARE roomsync_stmt;

SET @roomsync_sql = IF(
    EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'laboratory_reports'
          AND constraint_name = 'fk_laboratory_report_equipment'
          AND constraint_type = 'FOREIGN KEY'
    ),
    'ALTER TABLE laboratory_reports DROP FOREIGN KEY fk_laboratory_report_equipment',
    'SELECT 1'
);
PREPARE roomsync_stmt FROM @roomsync_sql;
EXECUTE roomsync_stmt;
DEALLOCATE PREPARE roomsync_stmt;
