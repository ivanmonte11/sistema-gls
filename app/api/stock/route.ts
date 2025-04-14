import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Variable en memoria + última fecha de reset en BD
let lastStockReset: Date | null = null;

// Función mejorada para resetear el stock con persistencia en BD
async function resetStock() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Resetear stock y registrar la fecha en una sola transacción
    await client.query(`
      WITH reset AS (
        UPDATE stock SET cantidad = 0 
        WHERE producto = 'pollo' 
        RETURNING NOW() as reset_time
      )
      INSERT INTO reset_logs (fecha) 
      SELECT reset_time FROM reset
    `);
    await client.query("COMMIT");
    console.log('✅ Stock reseteado a 0');
    lastStockReset = new Date();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error('Error al resetear stock:', error);
  } finally {
    client.release();
  }
}

// Verificación optimizada (solo hace reset si realmente es necesario)
async function checkDailyReset() {
  const now = new Date();
  const client = await pool.connect();

  try {
    // Obtiene la última fecha de reset desde la BD si no está en memoria
    if (!lastStockReset) {
      const res = await client.query(
        "SELECT fecha FROM reset_logs ORDER BY fecha DESC LIMIT 1"
      );
      lastStockReset = res.rows[0]?.fecha || null;
    }

    // Condiciones para resetear
    if (
      !lastStockReset ||
      now.getDate() !== lastStockReset.getDate() ||
      now.getMonth() !== lastStockReset.getMonth() ||
      now.getFullYear() !== lastStockReset.getFullYear()
    ) {
      await resetStock();
    }
  } finally {
    client.release();
  }
}

// Handler GET optimizado
export async function GET() {
  try {
    await checkDailyReset(); // Verificación antes de responder
    
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

// Handler POST optimizado
export async function POST(request: Request) {
  try {
    await checkDailyReset(); // Verificación antes de actualizar
    
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