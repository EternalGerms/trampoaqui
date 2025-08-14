-- Schema inicial do banco de dados TrampoAqui
-- Este script deve ser executado primeiro para criar a estrutura básica

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (deve corresponder ao schema do Drizzle)
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    is_provider_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    bio TEXT,
    experience TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de categorias de serviços (deve corresponder ao schema do Drizzle)
CREATE TABLE service_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

-- Tabela de prestadores de serviços (deve corresponder ao schema do Drizzle)
CREATE TABLE service_providers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    category_id VARCHAR NOT NULL REFERENCES service_categories(id),
    description TEXT NOT NULL,
    pricing_types JSONB NOT NULL DEFAULT '["fixed"]',
    min_hourly_rate DECIMAL(10,2),
    min_daily_rate DECIMAL(10,2),
    min_fixed_rate DECIMAL(10,2),
    experience TEXT,
    location TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    availability JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de solicitações de serviços (deve corresponder ao schema do Drizzle)
CREATE TABLE service_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR NOT NULL REFERENCES users(id),
    provider_id VARCHAR NOT NULL REFERENCES service_providers(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    pricing_type TEXT NOT NULL,
    proposed_price DECIMAL(10,2),
    proposed_hours INTEGER,
    proposed_days INTEGER,
    scheduled_date TIMESTAMP,
    negotiation_history JSONB DEFAULT '[]',
    client_completed_at TIMESTAMP,
    provider_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de negociações (deve corresponder ao schema do Drizzle)
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

-- Tabela de avaliações (deve corresponder ao schema do Drizzle)
CREATE TABLE reviews (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR NOT NULL REFERENCES service_requests(id),
    reviewer_id VARCHAR NOT NULL REFERENCES users(id),
    reviewee_id VARCHAR NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de mensagens (deve corresponder ao schema do Drizzle)
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    receiver_id VARCHAR NOT NULL REFERENCES users(id),
    request_id VARCHAR REFERENCES service_requests(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Inserir algumas categorias básicas
INSERT INTO service_categories (name, icon, slug) VALUES
('Eletricista', 'fas fa-bolt', 'eletricista'),
('Encanador', 'fas fa-wrench', 'encanador'),
('Faxineira', 'fas fa-broom', 'faxineira'),
('Pintor', 'fas fa-paint-roller', 'pintor'),
('Jardineiro', 'fas fa-seedling', 'jardineiro'),
('Marido de Aluguel', 'fas fa-tools', 'marido-aluguel'),
('Pedreiro', 'fas fa-hammer', 'pedreiro');

-- Criar índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_category_id ON service_providers(category_id);
CREATE INDEX idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX idx_service_requests_provider_id ON service_requests(provider_id);
CREATE INDEX idx_negotiations_request_id ON negotiations(request_id);
CREATE INDEX idx_negotiations_proposer_id ON negotiations(proposer_id);
CREATE INDEX idx_reviews_request_id ON reviews(request_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
