-- Add payment and balance fields
-- Add payment fields to service_requests table
ALTER TABLE service_requests 
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_completed_at TIMESTAMP;

-- Add balance field to users table
ALTER TABLE users 
ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

-- Create withdrawals table
CREATE TABLE withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Update status enum to include payment_pending
-- Note: PostgreSQL doesn't have native enum types in this schema, so we just document the new status
-- The status 'payment_pending' should be used after a proposal is accepted and before payment is completed
