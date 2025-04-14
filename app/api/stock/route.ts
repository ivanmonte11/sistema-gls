import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Variable para evitar resets concurrentes
let isResetting = false;

// Función helper para comparar fechas
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Función mejorada para resetear el stock
async function resetStock() {
  if (isResetting) return;
  isResetting = true;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Resetear stock
    await client.query("UPDATE stock SET cantidad = 0 WHERE producto = 'pollo'");
    
    // 2. Registrar reset con hora de Buenos Aires
    await client.query(`
      INSERT INTO reset_logs (fecha) 
      VALUES (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
    `);
    
    await client.query("COMMIT");
    console.log('✅ Stock reseteado a 0 - Hora Buenos Aires:', new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires'
    }));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error('❌ Error al resetear stock:', error);
  } finally {
    client.release();
    isResetting = false;
  }
}

// Verificación optimizada
async function checkDailyReset() {
  const client = await pool.connect();
  try {
    // Obtener fecha actual en hora Argentina
    const nowQuery = await client.query(
      "SELECT NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' as now_arg"
    );
    const now = new Date(nowQuery.rows[0].now_arg);

    // Obtener último reset en hora Argentina
    const lastResetQuery = await client.query(`
      SELECT fecha AT TIME ZONE 'America/Argentina/Buenos_Aires' as fecha_arg
      FROM reset_logs 
      ORDER BY fecha DESC 
      LIMIT 1
    `);

    const lastReset = lastResetQuery.rows[0]?.fecha_arg 
      ? new Date(lastResetQuery.rows[0].fecha_arg) 
      : null;

    // Debug: Mostrar fechas importantes
    console.log('⌚ Hora actual Buenos Aires:', now.toLocaleString('es-AR'));
    console.log('⏱ Último reset:', lastReset?.toLocaleString('es-AR'));

    // Condición para resetear
    if (!lastReset || !isSameDay(now, lastReset)) {
      console.log('🔄 Se requiere reset diario');
      await resetStock();
    } else {
      console.log('⏭ No se requiere reset (mismo día)');
    }
  } catch (error) {
    console.error('❌ Error en checkDailyReset:', error);
  } finally {
    client.release();
  }
}

// Handler GET
export async function GET() {
  try {
    await checkDailyReset();
    
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

// Handler POST
export async function POST(request: Request) {
  try {
    await checkDailyReset();
    
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