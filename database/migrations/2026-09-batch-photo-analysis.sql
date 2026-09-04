-- Deficiency analysis + the label/feedback loop on batch photos. The `analysis`
-- column (the engine's JSON result) already exists; this adds which engine ran
-- and when, plus the operator's confirm/correct label — the training signal a
-- future in-house engine learns from.
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS analysis_engine VARCHAR(60) DEFAULT NULL;
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS analyzed_at DATETIME DEFAULT NULL;
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS label_status VARCHAR(20) DEFAULT NULL;   -- confirmed | corrected | not_deficiency
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS label_nutrient VARCHAR(40) DEFAULT NULL; -- confirmed cause (operator)
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS labeled_by INT DEFAULT NULL;
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS labeled_at DATETIME DEFAULT NULL;
