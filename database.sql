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

-- Event coordinators (Faculty and authorized Student Council Members).
-- New rows always start as 'pending' and can only manage events after an
-- administrator approves them with: npm run approve -- <college-email>
CREATE TABLE IF NOT EXISTS coordinators (
  id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  designation ENUM('Faculty', 'Student Council Member') NOT NULL,
  department VARCHAR(120) NOT NULL,
  employee_id VARCHAR(60) NULL,
  student_council_id VARCHAR(60) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coordinators_email (email),
  INDEX idx_coordinators_status (status),
  CONSTRAINT chk_coordinator_identifier CHECK (
    (designation = 'Faculty' AND employee_id IS NOT NULL AND student_council_id IS NULL)
    OR
    (designation = 'Student Council Member' AND student_council_id IS NOT NULL AND employee_id IS NULL)
  )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Confirm the table structure after running the script:
-- SHOW CREATE TABLE events;
-- SHOW CREATE TABLE coordinators;
