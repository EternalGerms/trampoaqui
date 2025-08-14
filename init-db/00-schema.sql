-- Schema inicial do banco de dados TrampoAqui
-- Este script deve ser executado primeiro para criar a estrutura básica

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    profile_picture VARCHAR(500),
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de categorias de serviços
CREATE TABLE categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de prestadores de serviços
CREATE TABLE service_providers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    hourly_rate DECIMAL(10,2),
    fixed_rate DECIMAL(10,2),
    daily_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de solicitações de serviços
CREATE TABLE service_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    urgency TEXT DEFAULT 'normal',
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de propostas
CREATE TABLE proposals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    provider_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    message TEXT NOT NULL,
    estimated_hours INTEGER,
    estimated_days INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de avaliações
CREATE TABLE reviews (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id VARCHAR NOT NULL,
    reviewer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Inserir algumas categorias básicas
INSERT INTO categories (name, description, icon, color) VALUES
('Limpeza', 'Serviços de limpeza residencial e comercial', 'broom', '#4CAF50'),
('Manutenção', 'Reparos e manutenção geral', 'wrench', '#FF9800'),
('Tecnologia', 'Serviços de TI e suporte técnico', 'computer', '#2196F3'),
('Design', 'Design gráfico e web design', 'palette', '#9C27B0'),
('Transporte', 'Serviços de transporte e entrega', 'car', '#607D8B'),
('Educação', 'Aulas particulares e tutoria', 'book', '#795548'),
('Saúde', 'Serviços de saúde e bem-estar', 'heart', '#E91E63'),
('Eventos', 'Organização de eventos e festas', 'calendar', '#FF5722');

-- Criar índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_category_id ON service_providers(category_id);
CREATE INDEX idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX idx_service_requests_category_id ON service_requests(category_id);
CREATE INDEX idx_proposals_request_id ON proposals(request_id);
CREATE INDEX idx_proposals_provider_id ON proposals(provider_id);
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
