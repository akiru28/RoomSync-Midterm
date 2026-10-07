-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
-- Verify seeded room names and codes against official records before production use.

USE lecture_room_reservation;
-- Host: 127.0.0.1
-- Generation Time: Oct 02, 2026 at 07:54 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lecture_room_reservation`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(100) NOT NULL,
  `actor_id` varchar(100) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(100) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip` varchar(100) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `equipment`
--

CREATE TABLE `equipment` (
  `id` int(10) UNSIGNED NOT NULL,
  `room_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('operational','maintenance','retired') NOT NULL DEFAULT 'operational',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laboratory_reports`
--

CREATE TABLE `laboratory_reports` (
  `id` varchar(100) NOT NULL,
  `room_id` int(10) UNSIGNED NOT NULL,
  `equipment_id` int(10) UNSIGNED DEFAULT NULL,
  `reported_by` varchar(100) NOT NULL,
  `issue_type` varchar(100) NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `description` text NOT NULL,
  `status` enum('reported','under_review','in_progress','resolved') NOT NULL DEFAULT 'reported',
  `resolution_notes` text DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` varchar(100) NOT NULL,
  `room_id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `purpose` varchar(255) NOT NULL,
  `program_section` varchar(150) NOT NULL DEFAULT '',
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `attendees` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  CONSTRAINT `chk_reservation_valid_time` CHECK (`end_date` > `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('lecture','lab','seminar','hall') NOT NULL,
  `capacity` int(10) UNSIGNED NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `name`, `code`, `type`, `capacity`, `location`, `features`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(7, 'IT Laboratory 1', 'IT-LAB1', 'lab', 40, 'Acad4 - Floor 3', '[]', '', 1, '2026-09-28 16:45:04', '2026-09-28 16:45:04'),
(8, 'IT Laboratory 2', 'IT-LAB2', 'lab', 40, 'Acad4 - Floor 3', '[]', '', 1, '2026-09-28 16:47:41', '2026-09-28 16:48:58'),
(9, 'CS Laboratory', 'CS-LAB', 'lab', 40, 'Acad4 - Floor 4', '[]', '', 1, '2026-09-28 16:48:48', '2026-09-28 16:48:48'),
(10, 'Mac Laboratory', 'MAC-LAB', 'lab', 40, 'Acad4 - Floor 2', '[]', '', 1, '2026-09-28 16:50:23', '2026-09-28 16:50:53'),
(11, 'NAS Laboratory', 'NAS-LAB', 'lab', 40, 'Acad4 - Floor 4', '[]', '', 1, '2026-09-28 16:51:41', '2026-09-28 16:51:41'),
(12, 'RISE Laboratory', 'RISE-LAB', 'lab', 40, 'Acad4 - Floor 4', '[]', '', 1, '2026-09-28 16:52:50', '2026-09-28 16:52:50'),
(13, 'CEA Baynet Laboratory', 'CEA-BAYNET', 'lab', 40, 'Acad4 - Floor 2', '[]', '', 1, '2026-09-28 16:53:47', '2026-09-28 17:08:03'),
(14, 'Open Laboratory', 'OPEN-LAB', 'lab', 40, 'Acad4 - Floor 2', '[]', '', 1, '2026-09-28 16:54:43', '2026-09-28 16:54:43'),
(15, 'ERP Laboratory', 'ERP-LAB', 'lab', 40, 'Acad4 - Floor 4', '[]', '', 1, '2026-09-28 16:56:03', '2026-09-28 17:09:06'),
(16, 'Lecture Room 1', 'AB4-TROO1', 'lecture', 40, 'Acad4 - Floor 1', '[]', '', 1, '2026-09-28 17:00:57', '2026-09-28 17:00:57'),
(17, 'Lecture Room 2', 'AB4-TROO2', 'lecture', 40, 'Acad4 - Floor 1', '[]', '', 1, '2026-09-28 17:02:19', '2026-09-28 17:02:19'),
(18, 'Lecture Room 3', 'AB4-TROO3', 'lecture', 40, 'Acad4 - Floor 1', '[]', '', 1, '2026-09-28 17:03:46', '2026-09-28 17:08:43'),
(19, 'Lecture Room 4', 'AB4-TROO4', 'lecture', 40, 'Acad4 - Floor 1', '[]', '', 1, '2026-09-28 17:04:53', '2026-09-28 17:04:53'),
(20, 'Lecture Room 5', 'AB4-TROO5', 'lecture', 40, 'Acad4 - Floor 1', '[]', '', 1, '2026-09-28 17:06:16', '2026-09-28 17:08:22');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','instructor','lab_tech','admin') NOT NULL DEFAULT 'student',
  `department` varchar(150) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

-- Demo accounts only; remove or replace them before production deployment.
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `department`, `token`, `created_at`, `updated_at`) VALUES
('user-demo-admin', 'CCS Admin', 'admin@my.cspc.edu.ph', '$2b$12$KarLum0UHPzRb3mbAjWwre6EJtf7wqNv4yrb5ycN/kZpEa6y89Kgu', 'admin', 'College of Computer Studies', 'logged-out-1790911336571', '2026-09-28 15:45:18', '2026-10-02 11:22:16'),
('user-demo-instructor', 'CCS Instructor', 'instructor@my.cspc.edu.ph', '$2b$12$bJ6qX7cDgCF6sh2khPj7N.xQFiowzxfxHQ7l9xSq/Lx25XYp2ouNe', 'instructor', 'College of Computer Studies', 'logged-out-1790910770212', '2026-09-28 15:45:18', '2026-10-02 11:12:50'),
('user-demo-labtech', 'CCS Laboratory Technician', 'labtech@my.cspc.edu.ph', '$2b$12$vNasT6PUyAK.rG2ehsJw6O464ZAj7ZdikIF0x2.F3Rk2xtf0MVRsK', 'lab_tech', 'College of Computer Studies', 'logged-out-1790789243807', '2026-09-28 15:45:18', '2026-10-01 01:27:23'),
('user-demo-student', 'CCS Student', 'student@my.cspc.edu.ph', '$2b$12$k5X/cnqFiZIrip0sS1DtbOsilCsVWZVMH5r7WpiJlGBJbR0UUmow6', 'student', 'College of Computer Studies', 'logged-out-1790910601809', '2026-09-28 15:45:18', '2026-10-02 11:10:01');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_actor` (`actor_id`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_created_at` (`created_at`);

--
-- Indexes for table `equipment`
--
ALTER TABLE `equipment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_equipment_code` (`code`),
  ADD UNIQUE KEY `uq_equipment_id_room` (`id`,`room_id`),
  ADD KEY `idx_equipment_room_status` (`room_id`,`status`);

--
-- Indexes for table `laboratory_reports`
--
ALTER TABLE `laboratory_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_laboratory_reports_room_status` (`room_id`,`status`),
  ADD KEY `idx_laboratory_reports_reporter` (`reported_by`,`created_at`),
  ADD KEY `idx_laboratory_reports_equipment` (`equipment_id`,`room_id`),
  ADD KEY `idx_laboratory_reports_status` (`status`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reservations_room_dates` (`room_id`,`start_date`,`end_date`),
  ADD KEY `idx_reservations_user_status` (`user_id`,`status`),
  ADD KEY `idx_reservations_status` (`status`),
  ADD KEY `idx_reservations_approved_by` (`approved_by`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rooms_code` (`code`),
  ADD KEY `idx_rooms_type` (`type`),
  ADD KEY `idx_rooms_active` (`is_active`),
  ADD KEY `idx_rooms_capacity` (`capacity`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD UNIQUE KEY `uq_users_token` (`token`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_department` (`department`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `equipment`
--
ALTER TABLE `equipment`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `equipment`
--
ALTER TABLE `equipment`
  ADD CONSTRAINT `fk_equipment_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `laboratory_reports`
--
ALTER TABLE `laboratory_reports`
  ADD CONSTRAINT `fk_laboratory_report_equipment_room` FOREIGN KEY (`equipment_id`, `room_id`) REFERENCES `equipment` (`id`, `room_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_laboratory_report_reporter` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_laboratory_report_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `fk_reservation_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservation_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
