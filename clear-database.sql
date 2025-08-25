-- Script para limpar todos os dados do banco TrampoAqui
-- Mantém a estrutura das tabelas, apenas remove os dados
-- Execute este script com cuidado, pois não pode ser desfeito

-- Desabilitar verificação de chaves estrangeiras temporariamente
SET session_replication_role = replica;

-- Limpar tabelas na ordem correta (respeitando dependências)
-- 1. Tabelas que dependem de outras (filhas)
DELETE FROM messages;
DELETE FROM reviews;
DELETE FROM negotiations;
DELETE FROM service_requests;
DELETE FROM service_providers;

-- 2. Tabelas independentes
DELETE FROM service_categories;
DELETE FROM users;

-- Reabilitar verificação de chaves estrangeiras
SET session_replication_role = DEFAULT;

-- Verificar se as tabelas estão vazias
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'service_categories', COUNT(*) FROM service_categories
UNION ALL
SELECT 'service_providers', COUNT(*) FROM service_providers
UNION ALL
SELECT 'service_requests', COUNT(*) FROM service_requests
UNION ALL
SELECT 'negotiations', COUNT(*) FROM negotiations
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;

-- Mensagem de confirmação
SELECT 'Banco de dados limpo com sucesso! Todas as tabelas estão vazias.' as status;
