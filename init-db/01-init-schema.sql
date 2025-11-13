-- Script de inicialização do banco de dados TrampoAqui
-- Este script cria todas as tabelas necessárias baseado no schema Drizzle

-- Habilitar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    cpf TEXT NOT NULL UNIQUE,
    birth_date TIMESTAMP NOT NULL,
    is_provider_enabled BOOLEAN NOT NULL DEFAULT false,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP,
    bio TEXT,
    experience TEXT,
    location TEXT,
    cep TEXT,
    city TEXT,
    state TEXT,
    street TEXT,
    neighborhood TEXT,
    number TEXT,
    has_number BOOLEAN DEFAULT true,
    complement TEXT,
    balance DECIMAL(10, 2) NOT NULL DEFAULT '0.00',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de categorias de serviço
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

-- Tabela de prestadores de serviço
CREATE TABLE IF NOT EXISTS service_providers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    category_id VARCHAR NOT NULL REFERENCES service_categories(id),
    description TEXT NOT NULL,
    pricing_types JSONB NOT NULL,
    min_hourly_rate DECIMAL(10, 2),
    min_daily_rate DECIMAL(10, 2),
    min_fixed_rate DECIMAL(10, 2),
    experience TEXT,
    location TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    availability JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de solicitações de serviço
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR NOT NULL REFERENCES users(id),
    provider_id VARCHAR NOT NULL REFERENCES service_providers(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    pricing_type TEXT NOT NULL,
    proposed_price DECIMAL(10, 2),
    proposed_hours INTEGER,
    proposed_days INTEGER,
    scheduled_date TIMESTAMP,
    daily_sessions JSONB DEFAULT '[]',
    negotiation_history JSONB DEFAULT '[]',
    client_completed_at TIMESTAMP,
    provider_completed_at TIMESTAMP,
    payment_method TEXT,
    payment_completed_at TIMESTAMP,
    balance_added_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de negociações
CREATE TABLE IF NOT EXISTS negotiations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR NOT NULL REFERENCES service_requests(id),
    proposer_id VARCHAR NOT NULL REFERENCES users(id),
    pricing_type TEXT NOT NULL,
    proposed_price DECIMAL(10, 2),
    proposed_hours INTEGER,
    proposed_days INTEGER,
    proposed_date TIMESTAMP,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR NOT NULL REFERENCES service_requests(id),
    reviewer_id VARCHAR NOT NULL REFERENCES users(id),
    reviewee_id VARCHAR NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    receiver_id VARCHAR NOT NULL REFERENCES users(id),
    request_id VARCHAR REFERENCES service_requests(id),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de saques
CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_category_id ON service_providers(category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider_id ON service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_negotiations_request_id ON negotiations(request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_request_id ON reviews(request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_id ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at na tabela service_requests
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

