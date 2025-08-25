const { Pool } = require('pg');

// Configuração do banco (mesma do docker-compose)
const pool = new Pool({
  connectionString: 'postgresql://trampoaqui:trampoaqui123@localhost:5433/trampoaqui',
  ssl: false,
});

async function clearDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    // Verificar conexão
    await client.query('SELECT 1');
    console.log('✅ Conectado ao banco de dados');
    
    // Iniciar transação
    await client.query('BEGIN');
    console.log('🔄 Iniciando limpeza do banco...');
    
    // Desabilitar verificação de chaves estrangeiras temporariamente
    await client.query('SET session_replication_role = replica');
    
    // Limpar tabelas na ordem correta (respeitando dependências)
    // 1. Tabelas que dependem de outras (filhas)
    console.log('🗑️  Limpando tabela messages...');
    await client.query('DELETE FROM messages');
    
    console.log('🗑️  Limpando tabela reviews...');
    await client.query('DELETE FROM reviews');
    
    console.log('🗑️  Limpando tabela negotiations...');
    await client.query('DELETE FROM negotiations');
    
    console.log('🗑️  Limpando tabela service_requests...');
    await client.query('DELETE FROM service_requests');
    
    console.log('🗑️  Limpando tabela service_providers...');
    await client.query('DELETE FROM service_providers');
    
    // 2. Tabelas independentes
    console.log('🗑️  Limpando tabela service_categories...');
    await client.query('DELETE FROM service_categories');
    
    console.log('🗑️  Limpando tabela users...');
    await client.query('DELETE FROM users');
    
    // Reabilitar verificação de chaves estrangeiras
    await client.query('SET session_replication_role = DEFAULT');
    
    // Commit da transação
    await client.query('COMMIT');
    console.log('✅ Transação commitada com sucesso');
    
    // Verificar se as tabelas estão vazias
    console.log('🔍 Verificando estado das tabelas...');
    const result = await client.query(`
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
      SELECT 'messages', COUNT(*) FROM messages
    `);
    
    console.log('\n📊 Estado das tabelas após limpeza:');
    result.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.row_count} registros`);
    });
    
    console.log('\n🎉 Banco de dados limpo com sucesso! Todas as tabelas estão vazias.');
    
  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK');
    console.error('❌ Erro durante a limpeza:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  clearDatabase()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { clearDatabase };
