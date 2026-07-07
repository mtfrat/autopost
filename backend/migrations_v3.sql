-- Add visual_format column to generation_templates if it doesn't exist
ALTER TABLE generation_templates 
ADD COLUMN IF NOT EXISTS visual_format TEXT DEFAULT 'single_image';
