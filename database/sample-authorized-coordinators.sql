-- ============================================================
-- FICTIONAL LOCAL TEST DATA - DO NOT USE IN A REAL DEPLOYMENT
-- ============================================================
--
-- These two people do not exist. The names contain "Sample" and the email
-- addresses use the reserved ".test" domain so they cannot be mistaken for
-- real faculty or Student Council members.
--
-- Run this file only when you want demo/sample authorized records:
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source C:/Users/shiva/CollegeEventManagement/database/sample-authorized-coordinators.sql"
--
-- Registration test values:
--   Faculty
--     Full Name:       Sample Faculty Coordinator
--     College Email:   sample.faculty@demo.college.test
--     Designation:     Faculty
--     Department:      Computer Science
--     Employee ID:     TEST-EMP-1001
--
--   Student Council Member
--     Full Name:       Sample Student Council Coordinator
--     College Email:   sample.council@demo.college.test
--     Designation:     Student Council Member
--     Department:      Student Affairs
--     Student Council ID: TEST-SC-2001
--
-- You still choose the password when you register.
-- ============================================================

USE college_events;

INSERT IGNORE INTO authorized_coordinators
  (full_name, email, designation, department, employee_id, student_council_id)
VALUES
  ('Sample Faculty Coordinator',
   'sample.faculty@demo.college.test',
   'Faculty',
   'Computer Science',
   'TEST-EMP-1001',
   NULL),
  ('Sample Student Council Coordinator',
   'sample.council@demo.college.test',
   'Student Council Member',
   'Student Affairs',
   NULL,
   'TEST-SC-2001');
