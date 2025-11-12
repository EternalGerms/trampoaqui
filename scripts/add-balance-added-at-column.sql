-- Add balance_added_at column to service_requests table
-- This column tracks when the balance was added to the provider's account

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS balance_added_at TIMESTAMP;

-- Add comment to column
COMMENT ON COLUMN service_requests.balance_added_at IS 'When the balance was added to the provider account after service completion';

