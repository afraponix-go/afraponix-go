-- Migration: Add enhanced fields to custom_crops table
-- Date: 2025-01-14
-- Description: Add additional fields for comprehensive crop management

-- Add enhanced fields to custom_crops table
ALTER TABLE custom_crops 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'leafy_greens' AFTER target_ec,
ADD COLUMN IF NOT EXISTS plant_spacing INT DEFAULT 15 AFTER category,
ADD COLUMN IF NOT EXISTS growth_days INT DEFAULT 30 AFTER plant_spacing,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'beginner' AFTER growth_days,
ADD COLUMN IF NOT EXISTS season VARCHAR(20) DEFAULT 'year_round' AFTER difficulty,
ADD COLUMN IF NOT EXISTS description TEXT AFTER season,
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) AFTER description,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT 0 AFTER image_url,
ADD COLUMN IF NOT EXISTS submission_status VARCHAR(20) DEFAULT 'private' AFTER is_verified,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER submission_status;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_crops_category ON custom_crops(category);
CREATE INDEX IF NOT EXISTS idx_custom_crops_difficulty ON custom_crops(difficulty);
CREATE INDEX IF NOT EXISTS idx_custom_crops_season ON custom_crops(season);
CREATE INDEX IF NOT EXISTS idx_custom_crops_user_category ON custom_crops(user_id, category);

-- Update existing records with default values
UPDATE custom_crops 
SET 
    category = 'leafy_greens',
    plant_spacing = 15,
    growth_days = 30,
    difficulty = 'beginner',
    season = 'year_round',
    description = '',
    is_verified = 0,
    submission_status = 'private'
WHERE category IS NULL;