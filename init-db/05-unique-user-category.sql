-- Add unique constraint to prevent multiple services of same category per user
-- This ensures a user can only have one service per category
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_category') THEN
        ALTER TABLE service_providers 
        ADD CONSTRAINT unique_user_category UNIQUE (user_id, category_id);
    END IF;
END $$;
