-- Seed varieties table for managing crop varieties
CREATE TABLE IF NOT EXISTS seed_varieties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crop_type VARCHAR(100) NOT NULL,
    variety_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_crop_variety (crop_type, variety_name)
);

-- Insert lettuce varieties from the image
INSERT IGNORE INTO seed_varieties (crop_type, variety_name) VALUES
-- Lettuce - batavian varieties
('lettuce_batavian', 'Junction'),
('lettuce_batavian', 'Starfighter'),

-- Lettuce - butter varieties  
('lettuce_butter', 'Analera'),
('lettuce_butter', 'Anandria'),
('lettuce_butter', 'EZME'),
('lettuce_butter', 'Faustina'),
('lettuce_butter', 'Abonned'),
('lettuce_butter', 'Rafael'),
('lettuce_butter', 'Rosaire'),
('lettuce_butter', 'Tiberius'),

-- Lettuce - cos varieties
('lettuce_cos', 'Carmim'),
('lettuce_cos', 'Dabi'),
('lettuce_cos', 'Levistro'),
('lettuce_cos', 'Lucano'),
('lettuce_cos', 'Red Sead'),
('lettuce_cos', 'Vela'),
('lettuce_cos', 'Wildebest'),

-- Lettuce - little gem varieties
('lettuce_icty', 'Pinocrio'),
('lettuce_icty', 'Sudica da'),
('lettuce_icty', 'Angelica'),
('lettuce_icty', 'Gloria'),
('lettuce_icty', 'Lunix'),
('lettuce_icty', 'Mik'),

-- General lettuce varieties (for base lettuce type)
('lettuce', 'Junction'),
('lettuce', 'Starfighter'),
('lettuce', 'Analera'),
('lettuce', 'Anandria'),
('lettuce', 'EZME'),
('lettuce', 'Faustina'),
('lettuce', 'Carmim'),
('lettuce', 'Dabi'),
('lettuce', 'Levistro'),
('lettuce', 'Pinocrio');