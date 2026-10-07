-- RoomSync: non-destructive migration for an EXISTING database
-- Target: MariaDB 10.4 / phpMyAdmin
-- Back up the database before running. This migration does not drop or recreate tables.
-- It separates building and floor from rooms.location while retaining the old location field.

USE lecture_room_reservation;

ALTER TABLE rooms
  ADD COLUMN building VARCHAR(100) NULL AFTER code,
  ADD COLUMN floor_number TINYINT UNSIGNED NULL AFTER building;

UPDATE rooms
SET building = CASE
    WHEN location LIKE 'Acad4%' THEN 'Acad4'
    ELSE NULL
  END,
  floor_number = CASE
    WHEN location LIKE '%Floor 1%' THEN 1
    WHEN location LIKE '%Floor 2%' THEN 2
    WHEN location LIKE '%Floor 3%' THEN 3
    WHEN location LIKE '%Floor 4%' THEN 4
    ELSE NULL
  END
WHERE location IS NOT NULL;

CREATE INDEX idx_rooms_building_floor ON rooms (building, floor_number);

-- Verify the migrated values before changing application queries:
SELECT id, name, code, building, floor_number, location
FROM rooms
ORDER BY floor_number, name;
