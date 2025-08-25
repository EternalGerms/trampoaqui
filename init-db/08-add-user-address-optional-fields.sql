-- Adicionar campos opcionais de endereço na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_number BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS complement TEXT;

-- Verificar a estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
