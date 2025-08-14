-- Add unique constraint to prevent multiple services of same category per user
-- This ensures a user can only have one service per category
ALTER TABLE service_providers 
ADD CONSTRAINT unique_user_category UNIQUE (user_id, category_id);
