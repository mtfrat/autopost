-- Add image_model column to generation_templates table
ALTER TABLE generation_templates 
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'black-forest-labs/flux-schnell';
