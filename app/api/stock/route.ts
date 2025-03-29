import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    const res = await client.query(
      `SELECT cantidad, 
              COALESCE(NULLIF(precio::text, 'N/A')::numeric, 0) as precio 
       FROM stock WHERE producto = 'pollo'`
    );
    client.release();

    const cantidad = Number(res.rows[0]?.cantidad) || 0;
    const precio = parseFloat(res.rows[0]?.precio) || 0;

    return NextResponse.json({ cantidad, precio }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error al obtener el stock' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { cantidad } = await request.json();

  try {
    const client = await pool.connect();
    await client.query(
      'UPDATE stock SET cantidad = cantidad + $1 WHERE producto = $2', 
      [cantidad, 'pollo']
    );
    client.release();

    return NextResponse.json({ 
      message: 'Stock actualizado' 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error al actualizar el stock' 
    }, { status: 500 });
  }
}