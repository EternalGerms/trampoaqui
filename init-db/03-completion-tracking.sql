-- Add completion tracking columns to service_requests table
ALTER TABLE service_requests 
ADD COLUMN client_completed_at TIMESTAMP,
ADD COLUMN provider_completed_at TIMESTAMP;

-- Update existing completed services to have both completion timestamps
-- This is a one-time migration for existing data
UPDATE service_requests 
SET client_completed_at = updated_at,
    provider_completed_at = updated_at
WHERE status = 'completed';
