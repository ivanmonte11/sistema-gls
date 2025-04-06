import { Pool } from 'pg';

// Conexión directa SIN lógica de entornos (la controlarás desde .env)
const pool = new Pool({
  connectionString: 
    process.env.DATABASE_URL_PRODUCTION ||  // Usa producción si existe
    process.env.DATABASE_URL_PREVIEW ||    // Si no, usa preview
    process.env.DATABASE_URL,              // Si no, usa local (main)
  ssl: { rejectUnauthorized: false }       // Neon requiere SSL
});

export default pool;