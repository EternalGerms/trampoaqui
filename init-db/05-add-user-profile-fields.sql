-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment to document the new fields
COMMENT ON COLUMN users.bio IS 'About me section for provider profile';
COMMENT ON COLUMN users.experience IS 'Professional experience for provider profile';
COMMENT ON COLUMN users.location IS 'Service location for provider profile';
