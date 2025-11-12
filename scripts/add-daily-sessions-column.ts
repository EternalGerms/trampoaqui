import pkg from 'pg';
const { Pool } = pkg;

// Configuração do banco (mesma do docker-compose)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trampoaqui:trampoaqui123@localhost:5433/trampoaqui',
  ssl: false,
});

async function addDailySessionsColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    // Verificar conexão
    await client.query('SELECT 1');
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_requests' 
      AND column_name = 'daily_sessions'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  Coluna daily_sessions já existe, pulando...');
      return;
    }
    
    // Iniciar transação
    await client.query('BEGIN');
    console.log('🔄 Adicionando coluna daily_sessions...');
    
    // Adicionar coluna daily_sessions do tipo JSONB com valor padrão de array vazio
    await client.query(`
      ALTER TABLE service_requests 
      ADD COLUMN daily_sessions JSONB DEFAULT '[]'::jsonb
    `);
    
    // Adicionar comentário na coluna
    await client.query(`
      COMMENT ON COLUMN service_requests.daily_sessions IS 
      'Array de dias para serviços diários, contendo informações sobre cada dia do serviço'
    `);
    
    // Commit da transação
    await client.query('COMMIT');
    console.log('✅ Coluna daily_sessions adicionada com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDailySessionsColumn()
  .then(() => {
    console.log('✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });

