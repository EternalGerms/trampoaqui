-- Adicionar campos de endereço na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS number TEXT;

-- Verificar a estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
