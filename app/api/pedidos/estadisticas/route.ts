import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha') || 'CURRENT_DATE';

  try {
    const client = await pool.connect();
    
    // Obtener estadísticas generales
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total,
        SUM(precio_total) as ventas_totales,
        AVG(precio_total) as promedio
       FROM pedidos 
       WHERE estado = 'entregado'
       AND fecha_pedido = ${fecha === 'CURRENT_DATE' ? 'CURRENT_DATE' : '$1'}`,
      fecha === 'CURRENT_DATE' ? [] : [fecha]
    );

    // Obtener totales por método de pago
    const metodosPagoResult = await client.query(
      `SELECT 
        metodo_pago,
        COUNT(*) as cantidad,
        SUM(precio_total) as total
       FROM pedidos
       WHERE estado = 'entregado'
       AND fecha_pedido = ${fecha === 'CURRENT_DATE' ? 'CURRENT_DATE' : '$1'}
       GROUP BY metodo_pago`,
      fecha === 'CURRENT_DATE' ? [] : [fecha]
    );

    // Obtener últimos pedidos entregados
    const pedidosResult = await client.query(
      `SELECT 
        id, 
        numero_pedido, 
        nombre_cliente, 
        precio_total, 
        metodo_pago,
        hora_entrega_real
       FROM pedidos 
       WHERE estado = 'entregado'
       AND fecha_pedido = ${fecha === 'CURRENT_DATE' ? 'CURRENT_DATE' : '$1'}
       ORDER BY hora_entrega_real DESC
       LIMIT 10`,
      fecha === 'CURRENT_DATE' ? [] : [fecha]
    );

    client.release();

    // Procesar totales por método de pago
    const totalesPorMetodo = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0
    };

    metodosPagoResult.rows.forEach(row => {
      const metodo = row.metodo_pago;
      const total = parseFloat(row.total) || 0;
      
      if (metodo === 'efectivo') totalesPorMetodo.efectivo = total;
      else if (metodo === 'debito') totalesPorMetodo.debito = total;
      else if (metodo === 'credito') totalesPorMetodo.credito = total;
      else if (metodo === 'transferencia') totalesPorMetodo.transferencia = total;
    });

    return NextResponse.json({
      success: true,
      data: {
        estadisticas: {
          total: parseInt(statsResult.rows[0]?.total || 0),
          ventas_totales: parseFloat(statsResult.rows[0]?.ventas_totales || 0),
          promedio: parseFloat(statsResult.rows[0]?.promedio || 0),
          metodos_pago: totalesPorMetodo
        },
        pedidos: pedidosResult.rows
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/pedidos/estadisticas:', errorMessage);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estadísticas',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}