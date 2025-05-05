import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET para listar clientes (con paginación/búsqueda)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const offset = (page - 1) * limit;

  try {
    const query = `
      SELECT id, name, phone, address, created_at 
      FROM clients
      WHERE name ILIKE $1 OR phone ILIKE $1
      ORDER BY name ASC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM clients
      WHERE name ILIKE $1 OR phone ILIKE $1
    `;
    
    const [result, countResult] = await Promise.all([
      pool.query(query, [`%${search}%`, limit, offset]),
      pool.query(countQuery, [`%${search}%`])
    ]);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      total: Number(countResult.rows[0].count),
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

// POST para crear nuevo cliente
export async function POST(request: Request) {
  const { name, phone, address } = await request.json();

  if (!name) {
    return NextResponse.json(
      { success: false, error: 'Nombre es requerido' },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      'INSERT INTO clients (name, phone, address) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, address]
    );
    
    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}