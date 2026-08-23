-- Operations module — unified programme core (Phase 1a).
--
-- Generalises the spray trio (spray_plans / spray_plan_products / spray_log) into
-- type-agnostic tables so spray, dosing and operating programmes share one
-- calendar and one logbook. This step ONLY creates the tables; the companion
-- backfill node step folds existing spray data in. No behaviour change yet — the
-- spray routes keep reading their own tables until Phase 1b flips the switch.
--
-- system_id is VARCHAR(255) to match spray_plans/systems.id. IDs are preserved on
-- backfill for programmes and programme_log so existing cross-table references
-- line up. programme_log deliberately has NO FK on programme_id: deleting a
-- programme keeps its logged history (matching current spray behaviour).

CREATE TABLE IF NOT EXISTS programmes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  system_id  VARCHAR(255) NOT NULL,
  type       ENUM('spray','dosing','operating') NOT NULL DEFAULT 'spray',
  name       VARCHAR(255) NOT NULL,
  notes      TEXT NULL,
  status     ENUM('active','paused') NOT NULL DEFAULT 'active',
  start_date DATE NULL,
  end_date   DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prog_system_type (system_id, type, status),
  CONSTRAINT fk_prog_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_items (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  programme_id      INT NOT NULL,
  spray_product_id  INT NULL,             -- FK spray_products (spray type)
  dosing_product_id INT NULL,             -- FK dosing_products (Phase 2)
  task_id           INT NULL,             -- FK operation_tasks (Phase 3)
  label             VARCHAR(255) NULL,    -- snapshot / free-text
  rate              VARCHAR(255) NULL,    -- spray rate
  target_nutrient   VARCHAR(16) NULL,     -- dosing: N/K/Ca…
  target_value      DECIMAL(10,3) NULL,   -- dosing: target ppm
  schedule_kind     ENUM('weekdays','monthly','interval','seasonal','manual') NOT NULL DEFAULT 'weekdays',
  weekdays          VARCHAR(40) NULL,     -- CSV mon,tue,… (subsumes spray days)
  day_of_month      TINYINT NULL,
  interval_days     INT NULL,
  anchor_date       DATE NULL,
  time_of_day       ENUM('any','morning','evening') NOT NULL DEFAULT 'any',
  est_minutes       INT NULL,             -- labour totals (operating)
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- NULL spray_product_id repeats freely (dosing/operating items), so this only
  -- constrains spray items to one row per product per programme.
  UNIQUE KEY uniq_prog_spray_product (programme_id, spray_product_id),
  INDEX idx_item_programme (programme_id),
  CONSTRAINT fk_item_programme FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  system_id      VARCHAR(255) NOT NULL,
  programme_id   INT NULL,               -- no FK: history survives programme deletion
  item_id        INT NULL,
  type           ENUM('spray','dosing','operating') NOT NULL DEFAULT 'spray',
  event_date     DATE NOT NULL,
  operator_id    INT NULL,               -- FK spray_operators (going forward)
  operator_name  VARCHAR(120) NULL,      -- snapshot (old spray_log stored a name)
  product_name   VARCHAR(255) NULL,
  rate           VARCHAR(255) NULL,
  scope          VARCHAR(12) NULL,       -- system / beds
  quantity       DECIMAL(10,2) NULL,
  quantity_unit  VARCHAR(12) NULL,
  dilution_value DECIMAL(10,3) NULL,
  dilution_unit  VARCHAR(12) NULL,
  weather        VARCHAR(120) NULL,
  effectiveness  INT NULL,               -- spray: rated separately, later
  phi_days       INT NULL,               -- spray: harvest holds
  reading_before DECIMAL(10,3) NULL,     -- dosing (Epic 1)
  reading_after  DECIMAL(10,3) NULL,
  expected_delta DECIMAL(10,3) NULL,
  retest_date    DATE NULL,
  ph_at_dosing   DECIMAL(4,2) NULL,
  status         ENUM('done','skipped') NOT NULL DEFAULT 'done',  -- operating
  minutes_spent  INT NULL,
  notes          TEXT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_system_type (system_id, type, event_date),
  INDEX idx_log_programme (programme_id),
  CONSTRAINT fk_log_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_log_targets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  log_id      INT NOT NULL,
  grow_bed_id INT NULL,
  bed_name    VARCHAR(255) NULL,
  batch_id    VARCHAR(100) NULL,
  crop_type   VARCHAR(100) NULL,
  INDEX idx_plt_log (log_id),
  CONSTRAINT fk_plt_log FOREIGN KEY (log_id) REFERENCES programme_log(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
