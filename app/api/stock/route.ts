import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Obtener el stock actual con precio
export async function GET() {
  try {
    const client = await pool.connect();
    const res = await client.query(
      `SELECT cantidad, 
              COALESCE(NULLIF(precio::text, 'N/A')::numeric, 0) as precio 
       FROM stock WHERE producto = 'pollo'`
    );
    client.release();

    // Convertir explícitamente a número
    const cantidad = Number(res.rows[0]?.cantidad) || 0;
    const precio = parseFloat(res.rows[0]?.precio) || 0;

    console.log("Datos procesados:", { cantidad, precio }); // Verifica aquí

    return NextResponse.json({ cantidad, precio }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error al obtener el stock' 
    }, { status: 500 });
  }
}

// Agregar nuevo stock (mantenemos igual)
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

// Agregar en route.ts
export async function GET_ULTIMO(request: Request) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT numero_pedido FROM pedidos 
       ORDER BY fecha_pedido DESC, numero_pedido DESC 
       LIMIT 1`
    );
    client.release();

    return NextResponse.json({
      success: true,
      numeroPedido: result.rows[0]?.numero_pedido || null
    });
    
  } catch (error) {
    console.error('Error en GET /api/pedidos/ultimo:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener último pedido'
      },
      { status: 500 }
    );
  }
}