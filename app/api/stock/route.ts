import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Variable en memoria para trackear el último reset (persiste mientras el servidor esté activo)
let lastStockReset: Date | null = null;

// Función para resetear el stock
async function resetStock() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE stock SET cantidad = 0 WHERE producto = 'pollo'");
    console.log('✅ Stock reseteado a 0 automáticamente');
  } finally {
    client.release();
  }
}

// Verifica y resetea si es un nuevo día
function checkDailyReset() {
  const now = new Date();
  
  if (
    !lastStockReset || // Primera ejecución
    now.getDate() !== lastStockReset.getDate() || // Día diferente
    now.getMonth() !== lastStockReset.getMonth() ||
    now.getFullYear() !== lastStockReset.getFullYear()
  ) {
    resetStock();
    lastStockReset = now; // Actualiza la fecha del último reset
  }
}

export async function GET() {
  checkDailyReset(); // Verifica en cada llamada
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

export async function POST(request: Request) {
  checkDailyReset(); // Verifica en cada llamada
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