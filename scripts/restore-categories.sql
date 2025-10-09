-- Script para restaurar categorias de serviço no banco TrampoAqui
-- Este script verifica se já existem categorias e cria as básicas se necessário

-- Verificar se já existem categorias
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM service_categories;
    
    IF category_count > 0 THEN
        RAISE NOTICE 'Já existem % categorias no banco. Exibindo categorias existentes:', category_count;
        
        -- Exibir categorias existentes
        FOR category_record IN 
            SELECT name, icon, slug FROM service_categories ORDER BY name
        LOOP
            RAISE NOTICE '  - % (%)', category_record.name, category_record.slug;
        END LOOP;
        
        RETURN;
    END IF;
    
    RAISE NOTICE 'Restaurando categorias de serviço...';
    
    -- Inserir categorias básicas
    INSERT INTO service_categories (name, icon, slug) VALUES
    ('Eletricista', 'fas fa-bolt', 'eletricista'),
    ('Encanador', 'fas fa-wrench', 'encanador'),
    ('Faxineira', 'fas fa-broom', 'faxineira'),
    ('Pintor', 'fas fa-paint-roller', 'pintor'),
    ('Jardineiro', 'fas fa-seedling', 'jardineiro'),
    ('Marido de Aluguel', 'fas fa-tools', 'marido-aluguel'),
    ('Pedreiro', 'fas fa-hammer', 'pedreiro'),
    ('Técnico de Informática', 'fas fa-laptop', 'tecnico-informatica'),
    ('Manutenção de Ar Condicionado', 'fas fa-snowflake', 'manutencao-ar-condicionado'),
    ('Limpeza de Piscina', 'fas fa-swimming-pool', 'limpeza-piscina'),
    ('Instalação de Móveis', 'fas fa-couch', 'instalacao-moveis'),
    ('Serviços de Transporte', 'fas fa-truck', 'servicos-transporte');
    
    RAISE NOTICE 'Categorias de serviço restauradas com sucesso!';
END $$;

-- Verificar categorias criadas
SELECT 
    name as "Nome da Categoria",
    slug as "Slug",
    icon as "Ícone"
FROM service_categories 
ORDER BY name;

-- Contar total de categorias
SELECT 
    COUNT(*) as "Total de Categorias"
FROM service_categories;

-- Mensagem de confirmação
SELECT 'Categorias de serviço restauradas com sucesso!' as status;
