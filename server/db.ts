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

export const db = drizzle(pool, { schema });

// Verificar se o banco foi inicializado corretamente
if (!db) {
  throw new Error('Database not initialized');
}

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Teste inicial de conexão
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connection test passed');
}).catch((err) => {
  console.error('❌ Database connection test failed:', err);
});