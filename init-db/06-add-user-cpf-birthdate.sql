-- Adicionar campos CPF e data de nascimento à tabela users
-- Execute este script após a limpeza do banco

-- Adicionar coluna CPF
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Adicionar coluna data de nascimento
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TIMESTAMP;

-- Tornar os campos obrigatórios (após adicionar dados de teste)
-- ALTER TABLE users ALTER COLUMN cpf SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN birth_date SET NOT NULL;

-- Adicionar índice único para CPF
CREATE UNIQUE INDEX IF NOT EXISTS users_cpf_unique ON users(cpf);

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
