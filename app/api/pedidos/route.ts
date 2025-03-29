import { NextResponse } from 'next/server';
import pool from '@/lib/db';

async function generarNumeroPedido(client: any) {
  const now = new Date();
  const offset = -3;
  const hoy = new Date(now.getTime() + offset * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const res = await client.query(
    `SELECT numero_pedido FROM pedidos 
     WHERE fecha_pedido = CURRENT_DATE AT TIME ZONE 'America/Argentina/Tucuman'
     ORDER BY numero_pedido DESC LIMIT 1`
  );

  return res.rows.length > 0 
    ? `${hoy}-${(parseInt(res.rows[0].numero_pedido.split('-')[1]) + 1).toString().padStart(3, '0')}`
    : `${hoy}-001`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client = await pool.connect();

    if (searchParams.get('ultimo') === 'true') {
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
    }

    const result = await client.query(
      `SELECT * FROM pedidos 
       ORDER BY fecha_pedido DESC, numero_pedido DESC 
       LIMIT $1`,
      [searchParams.get('limit') || '100']
    );
    client.release();
    return NextResponse.json({ success: true, data: result.rows });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener pedidos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const requiredFields = ['nombre', 'tipoEntrega', 'metodoPago', 'cantidadPollo', 'precioUnitario', 'precioTotal'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos', missingFields },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    await client.query('BEGIN');
    
    const numeroPedido = await generarNumeroPedido(client);
    const result = await client.query(
      `INSERT INTO pedidos (
        numero_pedido, nombre_cliente, telefono_cliente, tipo_entrega,
        tipo_envio, direccion, metodo_pago, con_chimichurri,
        cantidad_pollo, precio_unitario, precio_total,
        fecha, hora_pedido, fecha_pedido
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NOW() AT TIME ZONE 'America/Argentina/Tucuman',
        (NOW() AT TIME ZONE 'America/Argentina/Tucuman')::time,
        CURRENT_DATE AT TIME ZONE 'America/Argentina/Tucuman'
      ) RETURNING id, numero_pedido`,
      [
        numeroPedido,
        data.nombre,
        data.telefono || null,
        data.tipoEntrega,
        data.tipoEntrega === 'envio' ? data.tipoEnvio : null,
        data.tipoEntrega === 'envio' ? data.direccion : null,
        data.metodoPago,
        data.conChimichurri || false,
        data.cantidadPollo,
        Number(data.precioUnitario),
        Number(data.precioTotal)
      ]
    );

    await client.query(
      'UPDATE stock SET cantidad = cantidad - $1 WHERE producto = $2',
      [data.cantidadPollo, 'pollo']
    );

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      message: 'Pedido registrado con éxito',
      pedidoId: result.rows[0].id,
      numeroPedido: result.rows[0].numero_pedido
    });
    
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('Error en POST /api/pedidos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar el pedido',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
