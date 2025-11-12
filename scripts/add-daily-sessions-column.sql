-- Script para adicionar a coluna daily_sessions na tabela service_requests
-- Execute este script no banco de dados PostgreSQL

-- Adicionar coluna daily_sessions do tipo JSONB com valor padrão de array vazio
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS daily_sessions JSONB DEFAULT '[]'::jsonb;

-- Comentário na coluna para documentação
COMMENT ON COLUMN service_requests.daily_sessions IS 'Array de dias para serviços diários, contendo informações sobre cada dia do serviço';

