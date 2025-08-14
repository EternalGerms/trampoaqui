-- Migration script to add new pricing and negotiation features
-- Este script agora é apenas para compatibilidade, pois as colunas já existem no schema inicial

-- Verificar se as colunas já existem antes de tentar adicionar
DO $$
BEGIN
    -- Verificar se pricing_types já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'pricing_types') THEN
        ALTER TABLE service_providers ADD COLUMN pricing_types JSONB NOT NULL DEFAULT '["fixed"]';
    END IF;
    
    -- Verificar se min_hourly_rate já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'min_hourly_rate') THEN
        ALTER TABLE service_providers ADD COLUMN min_hourly_rate DECIMAL(10,2);
    END IF;
    
    -- Verificar se min_daily_rate já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'min_daily_rate') THEN
        ALTER TABLE service_providers ADD COLUMN min_daily_rate DECIMAL(10,2);
    END IF;
    
    -- Verificar se min_fixed_rate já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'min_fixed_rate') THEN
        ALTER TABLE service_providers ADD COLUMN min_fixed_rate DECIMAL(10,2);
    END IF;
END $$;

-- Verificar se as colunas já existem na tabela service_requests
DO $$
BEGIN
    -- Verificar se pricing_type já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'pricing_type') THEN
        ALTER TABLE service_requests ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'fixed';
    END IF;
    
    -- Verificar se proposed_hours já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'proposed_hours') THEN
        ALTER TABLE service_requests ADD COLUMN proposed_hours INTEGER;
    END IF;
    
    -- Verificar se proposed_days já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'proposed_days') THEN
        ALTER TABLE service_requests ADD COLUMN proposed_days INTEGER;
    END IF;
    
    -- Verificar se negotiation_history já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'negotiation_history') THEN
        ALTER TABLE service_requests ADD COLUMN negotiation_history JSONB DEFAULT '[]';
    END IF;
END $$;

-- Verificar se a tabela negotiations já existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'negotiations') THEN
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
        
        -- Criar índices para melhor performance
        CREATE INDEX idx_negotiations_request_id ON negotiations(request_id);
        CREATE INDEX idx_negotiations_proposer_id ON negotiations(proposer_id);
        CREATE INDEX idx_negotiations_status ON negotiations(status);
    END IF;
END $$;

-- Criar índices adicionais se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_service_requests_pricing_type') THEN
        CREATE INDEX idx_service_requests_pricing_type ON service_requests(pricing_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_service_providers_pricing_types') THEN
        CREATE INDEX idx_service_providers_pricing_types ON service_providers USING GIN(pricing_types);
    END IF;
END $$; 