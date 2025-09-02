-- Add isAdmin field to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster admin queries
CREATE INDEX idx_users_is_admin ON users(is_admin);
