-- ============================================================
-- College Event Management System - MySQL database script
-- Works with MySQL Server 8.0+
--
-- Run from PowerShell (you will be prompted for the root password):
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source C:/Users/shiva/CollegeEventManagement/database.sql"
--
-- This script is safe to run more than once. It does not delete event data.
--
-- If your database still has the old "approval workflow" coordinators table
-- (the one with a status column containing pending/approved/rejected), this
-- script moves it to "coordinators_legacy_backup" and creates the new
-- pre-authorized tables. The old rows are preserved in the backup table.
-- ============================================================

CREATE DATABASE IF NOT EXISTS college_events
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_events;

-- ------------------------------------------------------------
-- Events (unchanged)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Authorized coordinators (the pre-approved directory)
--
-- Only people whose name, college email, designation, department and
-- employee/Student Council ID are stored here can create a coordinator
-- account. This table is populated by the college administrator with the
-- CLI command documented in README.md, or by running a private SQL insert.
-- There is intentionally NO public API for adding rows to this table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authorized_coordinators (
  id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  designation ENUM('Faculty', 'Student Council Member') NOT NULL,
  department VARCHAR(120) NOT NULL,
  employee_id VARCHAR(60) NULL,
  student_council_id VARCHAR(60) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  registered_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_authorized_coordinators_email (email),
  INDEX idx_authorized_coordinators_active (is_active),
  INDEX idx_authorized_coordinators_designation (designation),
  INDEX idx_authorized_coordinators_registered (registered_at),
  CONSTRAINT chk_authorized_name_not_blank CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT chk_authorized_email_not_blank CHECK (CHAR_LENGTH(TRIM(email)) > 0),
  CONSTRAINT chk_authorized_department_not_blank CHECK (CHAR_LENGTH(TRIM(department)) > 0),
  CONSTRAINT chk_authorized_is_active CHECK (is_active IN (0, 1)),
  CONSTRAINT chk_authorized_identifier CHECK (
    (designation = 'Faculty'
      AND employee_id IS NOT NULL AND CHAR_LENGTH(TRIM(employee_id)) > 0
      AND student_council_id IS NULL)
    OR
    (designation = 'Student Council Member'
      AND student_council_id IS NOT NULL AND CHAR_LENGTH(TRIM(student_council_id)) > 0
      AND employee_id IS NULL)
  )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Preserve an existing approval-workflow coordinators table.
-- This is a one-time migration; on a fresh database it does nothing.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS migrate_preauthorized_coordinators;

DELIMITER //
CREATE PROCEDURE migrate_preauthorized_coordinators()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'coordinators'
      AND COLUMN_NAME = 'approved_at'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'coordinators_legacy_backup'
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Migration stopped: coordinators_legacy_backup already exists. Resolve the old coordinators table manually.';
    ELSE
      RENAME TABLE coordinators TO coordinators_legacy_backup;
    END IF;
  END IF;
END//
DELIMITER ;

CALL migrate_preauthorized_coordinators();
DROP PROCEDURE migrate_preauthorized_coordinators;

-- ------------------------------------------------------------
-- Coordinator accounts (active registrations only)
--
-- A row is created only after a registration request matches an active row
-- in authorized_coordinators. New accounts are active immediately. There is
-- no pending/approval state.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coordinators (
  id INT NOT NULL AUTO_INCREMENT,
  authorized_coordinator_id INT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  designation ENUM('Faculty', 'Student Council Member') NOT NULL,
  department VARCHAR(120) NOT NULL,
  employee_id VARCHAR(60) NULL,
  student_council_id VARCHAR(60) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coordinators_email (email),
  UNIQUE KEY uq_coordinators_authorization (authorized_coordinator_id),
  INDEX idx_coordinators_status (status),
  CONSTRAINT fk_coordinators_authorization
    FOREIGN KEY (authorized_coordinator_id)
    REFERENCES authorized_coordinators (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_coord_account_name_not_blank CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT chk_coord_account_email_not_blank CHECK (CHAR_LENGTH(TRIM(email)) > 0),
  CONSTRAINT chk_coord_account_department_not_blank CHECK (CHAR_LENGTH(TRIM(department)) > 0),
  CONSTRAINT chk_coord_account_identifier CHECK (
    (designation = 'Faculty'
      AND employee_id IS NOT NULL AND CHAR_LENGTH(TRIM(employee_id)) > 0
      AND student_council_id IS NULL)
    OR
    (designation = 'Student Council Member'
      AND student_council_id IS NOT NULL AND CHAR_LENGTH(TRIM(student_council_id)) > 0
      AND employee_id IS NULL)
  )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Confirm the table structure after running the script:
-- SHOW CREATE TABLE events;
-- SHOW CREATE TABLE authorized_coordinators;
-- SHOW CREATE TABLE coordinators;
--
-- If you upgraded an existing database, inspect the preserved old rows with:
-- SELECT id, full_name, email, designation, status FROM coordinators_legacy_backup;
--
-- Fictional local-test records are available in:
--   database/sample-authorized-coordinators.sql
-- Do not use those sample records in a real college deployment.
