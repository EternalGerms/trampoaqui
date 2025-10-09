const { Pool } = require('pg');

// Configuração do banco (mesma do docker-compose)
const pool = new Pool({
  connectionString: 'postgresql://trampoaqui:trampoaqui123@localhost:5433/trampoaqui',
  ssl: false,
});

async function restoreServiceCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    // Verificar conexão
    await client.query('SELECT 1');
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se já existem categorias
    const existingCategories = await client.query('SELECT COUNT(*) FROM service_categories');
    const count = parseInt(existingCategories.rows[0].count);
    
    if (count > 0) {
      console.log(`ℹ️  Já existem ${count} categorias no banco. Exibindo categorias existentes:`);
      const categories = await client.query('SELECT name, icon, slug FROM service_categories ORDER BY name');
      categories.rows.forEach(cat => {
        console.log(`  - ${cat.name} (${cat.slug})`);
      });
      return;
    }
    
    console.log('🔄 Restaurando categorias de serviço...');
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Inserir categorias básicas
    const categories = [
      { name: 'Eletricista', icon: 'fas fa-bolt', slug: 'eletricista' },
      { name: 'Encanador', icon: 'fas fa-wrench', slug: 'encanador' },
      { name: 'Faxineira', icon: 'fas fa-broom', slug: 'faxineira' },
      { name: 'Pintor', icon: 'fas fa-paint-roller', slug: 'pintor' },
      { name: 'Jardineiro', icon: 'fas fa-seedling', slug: 'jardineiro' },
      { name: 'Marido de Aluguel', icon: 'fas fa-tools', slug: 'marido-aluguel' },
      { name: 'Pedreiro', icon: 'fas fa-hammer', slug: 'pedreiro' },
      { name: 'Técnico de Informática', icon: 'fas fa-laptop', slug: 'tecnico-informatica' },
      { name: 'Manutenção de Ar Condicionado', icon: 'fas fa-snowflake', slug: 'manutencao-ar-condicionado' },
      { name: 'Limpeza de Piscina', icon: 'fas fa-swimming-pool', slug: 'limpeza-piscina' },
      { name: 'Instalação de Móveis', icon: 'fas fa-couch', slug: 'instalacao-moveis' },
      { name: 'Serviços de Transporte', icon: 'fas fa-truck', slug: 'servicos-transporte' }
    ];
    
    for (const category of categories) {
      await client.query(
        'INSERT INTO service_categories (name, icon, slug) VALUES ($1, $2, $3)',
        [category.name, category.icon, category.slug]
      );
      console.log(`✅ Categoria "${category.name}" criada`);
    }
    
    // Commit da transação
    await client.query('COMMIT');
    console.log('✅ Transação commitada com sucesso');
    
    // Verificar se as categorias foram criadas
    console.log('🔍 Verificando categorias criadas...');
    const result = await client.query('SELECT name, icon, slug FROM service_categories ORDER BY name');
    
    console.log('\n📊 Categorias de serviço disponíveis:');
    result.rows.forEach(row => {
      console.log(`  ${row.name} (${row.slug}) - ${row.icon}`);
    });
    
    console.log(`\n🎉 ${result.rows.length} categorias de serviço foram restauradas com sucesso!`);
    
  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a restauração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  restoreServiceCategories()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { restoreServiceCategories };
