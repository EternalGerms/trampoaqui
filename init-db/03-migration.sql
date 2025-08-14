-- Migration script to add new pricing and negotiation features

-- 1. Add new columns to service_providers table
ALTER TABLE service_providers 
ADD COLUMN pricing_types JSONB NOT NULL DEFAULT '["fixed"]',
ADD COLUMN min_hourly_rate DECIMAL(10,2),
ADD COLUMN min_daily_rate DECIMAL(10,2),
ADD COLUMN min_fixed_rate DECIMAL(10,2);

-- 2. Migrate existing hourly_rate data
UPDATE service_providers 
SET pricing_types = '["hourly"]',
    min_hourly_rate = hourly_rate
WHERE hourly_rate IS NOT NULL;

-- 3. Drop the old hourly_rate column
ALTER TABLE service_providers DROP COLUMN hourly_rate;

-- 4. Add new columns to service_requests table
ALTER TABLE service_requests 
ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN proposed_hours INTEGER,
ADD COLUMN proposed_days INTEGER,
ADD COLUMN negotiation_history JSONB DEFAULT '[]';

-- 5. Create negotiations table
CREATE TABLE negotiations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR NOT NULL REFERENCES service_requests(id),
    proposer_id VARCHAR NOT NULL REFERENCES users(id),
    pricing_type TEXT NOT NULL,
    proposed_price DECIMAL(10,2),
    proposed_hours INTEGER,
    proposed_days INTEGER,
    proposed_date TIMESTAMP,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. Create indexes for better performance
CREATE INDEX idx_negotiations_request_id ON negotiations(request_id);
CREATE INDEX idx_negotiations_proposer_id ON negotiations(proposer_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);
CREATE INDEX idx_service_requests_pricing_type ON service_requests(pricing_type);
CREATE INDEX idx_service_providers_pricing_types ON service_providers USING GIN(pricing_types); 