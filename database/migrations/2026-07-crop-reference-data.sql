-- Migration: populate reference data (days to harvest, plant spacing,
-- scientific name) for the crop-knowledge crops table.
-- Date: 2026-07-19
--
-- Values sourced primarily from FAO "Small-scale aquaponic food production"
-- (Somerville et al. 2014) — the "12 common aquaponic plants" guidelines —
-- supplemented with standard hydroponic horticulture references for crops not
-- in that guide (arugula, kale, spinach, pac choi, herbs, strawberries).
-- days_to_harvest = typical days from transplant to first harvest;
-- plant_spacing_cm = midpoint of the recommended aquaponic spacing range.
-- EC and pH ranges were already populated and are left unchanged.

-- Leafy greens
UPDATE crops SET days_to_harvest=30, plant_spacing_cm=12, scientific_name='Eruca vesicaria' WHERE code='arugula';
UPDATE crops SET days_to_harvest=30, plant_spacing_cm=24, scientific_name='Lactuca sativa' WHERE code='lettuce';
UPDATE crops SET days_to_harvest=45, plant_spacing_cm=12, scientific_name='Spinacia oleracea' WHERE code='spinach';
UPDATE crops SET days_to_harvest=55, plant_spacing_cm=35, scientific_name='Brassica oleracea var. sabellica' WHERE code='kale';
UPDATE crops SET days_to_harvest=30, plant_spacing_cm=30, scientific_name='Beta vulgaris subsp. vulgaris' WHERE code='swiss_chard';
UPDATE crops SET days_to_harvest=50, plant_spacing_cm=18, scientific_name='Brassica rapa subsp. chinensis' WHERE code='pac_choi';

-- Herbs
UPDATE crops SET days_to_harvest=40, plant_spacing_cm=20, scientific_name='Ocimum basilicum' WHERE code='basil';
UPDATE crops SET days_to_harvest=40, plant_spacing_cm=12, scientific_name='Coriandrum sativum' WHERE code='cilantro';
UPDATE crops SET days_to_harvest=30, plant_spacing_cm=20, scientific_name='Petroselinum crispum' WHERE code='parsley';
UPDATE crops SET days_to_harvest=50, plant_spacing_cm=20, scientific_name='Mentha spicata' WHERE code='mint';
UPDATE crops SET days_to_harvest=60, plant_spacing_cm=12, scientific_name='Allium schoenoprasum' WHERE code='chives';
UPDATE crops SET days_to_harvest=85, plant_spacing_cm=25, scientific_name='Origanum vulgare' WHERE code='oregano';
UPDATE crops SET days_to_harvest=85, plant_spacing_cm=25, scientific_name='Thymus vulgaris' WHERE code='thyme';
UPDATE crops SET days_to_harvest=30, plant_spacing_cm=15, scientific_name='Various herb species' WHERE code='herbs_mix';

-- Fruiting vegetables
UPDATE crops SET days_to_harvest=70, plant_spacing_cm=50, scientific_name='Solanum lycopersicum' WHERE code='tomatoes';
UPDATE crops SET days_to_harvest=60, plant_spacing_cm=30, scientific_name='Solanum lycopersicum var. cerasiforme' WHERE code='cherry_tomatoes';
UPDATE crops SET days_to_harvest=75, plant_spacing_cm=45, scientific_name='Capsicum annuum' WHERE code='peppers';
UPDATE crops SET days_to_harvest=60, plant_spacing_cm=45, scientific_name='Cucumis sativus' WHERE code='cucumbers';
UPDATE crops SET days_to_harvest=100, plant_spacing_cm=50, scientific_name='Solanum melongena' WHERE code='eggplant';
UPDATE crops SET days_to_harvest=90, plant_spacing_cm=25, scientific_name='Fragaria x ananassa' WHERE code='strawberries';

UPDATE crops SET research_source='FAO Small-scale aquaponic food production (Somerville et al. 2014) + hydroponic horticulture standards'
WHERE research_source IS NULL;
