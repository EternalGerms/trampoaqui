import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Para PostgreSQL local no Docker
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000, // 30 segundos
});
pool.setMaxListeners(20); // Aumenta o limite de listeners para evitar warnings

export const db = drizzle(pool, { schema });

// Verificar se o banco foi inicializado corretamente
if (!db) {
  throw new Error('Database not initialized');
}

// Função para testar a conexão com o banco de dados
export const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    // Encerrar o processo se a conexão com o banco de dados falhar na inicialização
    process.exit(1);
  }
};