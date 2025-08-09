-- Water Quality Backup Archive
-- Archived on: 2025-08-07T19:35:48.266Z
-- Original table: water_quality (migrated to nutrient_readings)

CREATE TABLE water_quality_backup (
  id INT PRIMARY KEY,
  system_id VARCHAR(255),
  date DATETIME,
  ph DECIMAL(3,2),
  ec DECIMAL(8,2),
  dissolved_oxygen DECIMAL(8,2),
  temperature DECIMAL(8,2),
  ammonia DECIMAL(8,2),
  humidity DECIMAL(8,2),
  salinity DECIMAL(8,2),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

INSERT INTO water_quality_backup VALUES (5, 'system_1754420872309', '2025-08-07', NULL, '0.00', '1.40', '23.40', '65.00', '0.30', NULL, NULL, Thu Aug 07 2025 15:08:37 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 16:27:21 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (6, 'system_1754420872309', '2025-07-25', '7.10', '523.00', '7.10', '22.10', NULL, NULL, '0.07', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (7, 'system_1754420872309', '2025-07-26', '6.50', '532.00', '4.20', '21.10', NULL, NULL, '0.36', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (8, 'system_1754420872309', '2025-07-27', '7.50', '531.00', '7.20', '22.60', NULL, NULL, '0.29', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (9, 'system_1754420872309', '2025-07-28', '6.10', '593.00', '5.90', '27.30', NULL, NULL, '0.34', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (10, 'system_1754420872309', '2025-07-29', '7.40', '432.00', '7.80', '26.30', NULL, NULL, '0.48', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (11, 'system_1754420872309', '2025-07-30', '6.40', '496.00', '4.10', '24.70', NULL, NULL, '0.24', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (12, 'system_1754420872309', '2025-07-31', '6.20', '681.00', '6.30', '19.50', NULL, NULL, '0.10', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (13, 'system_1754420872309', '2025-08-01', '7.70', '433.00', '7.90', '27.00', NULL, NULL, '0.08', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (14, 'system_1754420872309', '2025-08-02', '7.70', '529.00', '7.20', '20.50', NULL, NULL, '0.45', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (15, 'system_1754420872309', '2025-08-03', '7.10', '586.00', '8.00', '24.50', NULL, NULL, '0.14', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (16, 'system_1754420872309', '2025-08-04', '7.00', '417.00', '5.40', '19.10', '61.00', '0.50', '0.49', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:39:57 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (17, 'system_1754420872309', '2025-08-05', '7.30', '590.00', '6.00', '21.00', '68.00', '0.10', '0.49', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:39:57 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (18, 'system_1754420872309', '2025-08-06', '6.70', '689.00', '6.10', '25.20', '58.00', '0.40', '0.16', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 15:39:57 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (19, 'system_1754420872309', '2025-08-07', '7.70', '0.00', '1.40', '23.40', '72.00', '0.20', '0.00', 'Mock data for testing', Thu Aug 07 2025 15:19:05 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 16:27:21 GMT+0200 (South Africa Standard Time));
INSERT INTO water_quality_backup VALUES (20, 'system_1754420872309', '2025-08-07T19:01', NULL, NULL, NULL, NULL, NULL, NULL, '0.07', '', Thu Aug 07 2025 19:01:57 GMT+0200 (South Africa Standard Time), Thu Aug 07 2025 19:01:57 GMT+0200 (South Africa Standard Time));
