// app/api/pedidos/estadisticas/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '5';
  const fecha = searchParams.get('fecha') || 'CURRENT_DATE';

  try {
    const client = await pool.connect();
    const pedidosResult = await client.query(
      `SELECT id, numero_pedido, nombre_cliente, precio_total, hora_entrega_real
       FROM pedidos 
       WHERE estado = 'entregado' 
       AND fecha_pedido = ${fecha === 'CURRENT_DATE' ? 'CURRENT_DATE' : '$1'}
       ORDER BY hora_entrega_real DESC
       LIMIT $${fecha === 'CURRENT_DATE' ? '1' : '2'}`,
      fecha === 'CURRENT_DATE' ? [limit] : [fecha, limit]
    );

    const statsResult = await client.query(
      `SELECT COUNT(*) as total, SUM(precio_total) as ventas_totales, AVG(precio_total) as promedio
       FROM pedidos 
       WHERE estado = 'entregado'
       AND fecha_pedido = ${fecha === 'CURRENT_DATE' ? 'CURRENT_DATE' : '$1'}`,
      fecha === 'CURRENT_DATE' ? [] : [fecha]
    );

    client.release();

    return NextResponse.json({
      success: true,
      data: {
        pedidos: pedidosResult.rows,
        estadisticas: {
          total: parseInt(statsResult.rows[0]?.total || 0),
          ventas_totales: parseFloat(statsResult.rows[0]?.ventas_totales || 0),
          promedio: parseFloat(statsResult.rows[0]?.promedio || 0),
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/pedidos/estadisticas:', errorMessage);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estadísticas',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null,
      },
      { status: 500 }
    );
  }
}