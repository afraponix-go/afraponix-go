-- A cut-and-come-again crop (spinach, herbs, etc.) can be harvested again
-- without removing the plant. This is the default interval (days) suggested
-- when the user logs a 0-plants-removed harvest and chooses to push the
-- batch's "next harvest due" date forward. Optional — NULL means "not a
-- repeat-harvest crop" and the Harvest form won't offer the reset prompt.
ALTER TABLE custom_crops ADD COLUMN IF NOT EXISTS reharvest_days INT NULL;
