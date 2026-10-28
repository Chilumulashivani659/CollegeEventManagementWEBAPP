-- ============================================================
-- College Event Management System - MySQL database script
-- Works with MySQL Server 8.0+
--
-- Run from PowerShell (you will be prompted for the root password):
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source C:/Users/shiva/CollegeEventManagement/database.sql"
-- ============================================================

CREATE DATABASE IF NOT EXISTS college_events
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_events;

CREATE TABLE IF NOT EXISTS events (
  id INT NOT NULL AUTO_INCREMENT,
  event_name VARCHAR(150) NOT NULL,
  event_date DATE NOT NULL,
  venue VARCHAR(150) NOT NULL,
  organizer VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_event_name (event_name),
  INDEX idx_event_date (event_date),
  CONSTRAINT chk_event_name_not_blank CHECK (CHAR_LENGTH(TRIM(event_name)) > 0),
  CONSTRAINT chk_venue_not_blank CHECK (CHAR_LENGTH(TRIM(venue)) > 0),
  CONSTRAINT chk_organizer_not_blank CHECK (CHAR_LENGTH(TRIM(organizer)) > 0)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Confirm the table structure after running the script:
-- SHOW CREATE TABLE events;
