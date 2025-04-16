import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Función para resetear el stock (ahora solo se ejecutará manualmente)
async function resetStock() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE stock SET cantidad = 0 WHERE producto = 'pollo'");
    console.log('✅ Stock reseteado manualmente a 0');
    return true;
  } catch (error) {
    console.error('❌ Error al resetear stock:', error);
    return false;
  } finally {
    client.release();
  }
}

// Handler GET (sin verificación automática)
export async function GET() {
  try {
    const client = await pool.connect();
    const res = await client.query(
      `SELECT cantidad, precio FROM stock WHERE producto = 'pollo'`
    );
    client.release();
    
    return NextResponse.json({
      cantidad: parseFloat(res.rows[0]?.cantidad) || 0,
      precio: parseFloat(res.rows[0]?.precio) || 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el stock' },
      { status: 500 }
    );
  }
}

// Handler POST para actualizar stock
export async function POST(request: Request) {
  try {
    const { cantidad } = await request.json();
    const client = await pool.connect();
    await client.query(
      'UPDATE stock SET cantidad = cantidad + $1 WHERE producto = $2', 
      [cantidad, 'pollo']
    );
    client.release();
    
    return NextResponse.json({ message: 'Stock actualizado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el stock' },
      { status: 500 }
    );
  }
}

// Nuevo endpoint para reset manual
export async function DELETE() {
  try {
    const success = await resetStock();
    if (success) {
      return NextResponse.json({ message: 'Stock reseteado exitosamente' });
    } else {
      return NextResponse.json(
        { error: 'Error al resetear el stock' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}