import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

async function generarNumeroPedido(client: any): Promise<string> {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' };
  
  const dia = ahora.toLocaleDateString('es-AR', { ...opciones, day: '2-digit' });
  const mes = ahora.toLocaleDateString('es-AR', { ...opciones, month: '2-digit' });
  const año = ahora.toLocaleDateString('es-AR', { ...opciones, year: 'numeric' });
  const hoyFormatoLocal = `${dia}-${mes}-${año}`;
  const hoyStr = `${año}-${mes}-${dia}`;

  await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

  try {
    const res = await client.query(
      `SELECT numero_pedido FROM pedidos 
       WHERE fecha_pedido = $1 
       ORDER BY numero_pedido DESC 
       LIMIT 1
       FOR UPDATE`,
      [hoyStr]
    );

    let siguienteNumero: number;
    if (res.rows.length > 0) {
      const ultimoNumero = res.rows[0].numero_pedido;
      const partes = ultimoNumero.split('-');
      siguienteNumero = parseInt(partes[partes.length - 1]) + 1;
      
      if (isNaN(siguienteNumero)) {
        throw new Error('Formato de número de pedido inválido');
      }
    } else {
      siguienteNumero = 1;
    }

    const numeroPedido = `P-${hoyFormatoLocal}-${siguienteNumero.toString().padStart(3, '0')}`;

    const existe = await client.query(
      `SELECT 1 FROM pedidos WHERE numero_pedido = $1 LIMIT 1`,
      [numeroPedido]
    );

    if (existe.rows.length > 0) {
      throw new Error('Número de pedido duplicado');
    }

    await client.query('COMMIT');
    return numeroPedido;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en generarNumeroPedido:', error);
    throw new Error('Error al generar número de pedido');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client = await pool.connect();

    if (searchParams.get('ultimo') === 'true') {
      const result = await client.query(
        `SELECT 
          id,
          numero_pedido,
          nombre_cliente,
          telefono_cliente,
          tipo_entrega,
          tipo_envio,
          direccion,
          metodo_pago,
          con_chimichurri,
          con_papas,
          cantidad_papas,
          cantidad_pollo,
          precio_unitario,
          precio_total,
          fecha,
          hora_pedido,
          fecha_pedido
         FROM pedidos 
         ORDER BY fecha_pedido DESC, numero_pedido DESC 
         LIMIT 1`
      );
      client.release();
      return NextResponse.json({
        success: true,
        data: result.rows[0] || null
      });
    }

    const result = await client.query(
      `SELECT 
        id,
        numero_pedido,
        nombre_cliente,
        telefono_cliente,
        tipo_entrega,
        tipo_envio,
        direccion,
        metodo_pago,
        con_chimichurri,
        con_papas,
        cantidad_papas,
        cantidad_pollo,
        precio_unitario,
        precio_total,
        fecha,
        hora_pedido,
        fecha_pedido
       FROM pedidos 
       ORDER BY fecha_pedido DESC, numero_pedido DESC 
       LIMIT $1`,
      [searchParams.get('limit') || '100']
    );
    client.release();
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/pedidos:', errorMessage);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener pedidos',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let client;
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser application/json' },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    const requiredFields = [
      'nombre', 'tipoEntrega', 'metodoPago', 
      'cantidadPollo', 'precioUnitario', 'precioTotal'
    ];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan campos requeridos',
          missingFields 
        },
        { status: 400 }
      );
    }

    client = await pool.connect();
    const numeroPedido = await generarNumeroPedido(client);
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO pedidos (
        numero_pedido,
        nombre_cliente,
        telefono_cliente,
        tipo_entrega,
        tipo_envio,
        direccion,
        metodo_pago,
        con_chimichurri,
        con_papas,
        cantidad_papas,
        cantidad_pollo,
        precio_unitario,
        precio_total,
        fecha,
        hora_pedido,
        fecha_pedido
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        NOW() AT TIME ZONE $14,
        (NOW() AT TIME ZONE $14)::time,
        (NOW() AT TIME ZONE $14)::date
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
        data.conPapas || false,
        data.conPapas ? (data.cantidadPapas || 0) : 0,
        data.cantidadPollo,
        Number(data.precioUnitario),
        Number(data.precioTotal),
        TIMEZONE
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
    if (client) {
      await client.query('ROLLBACK').catch(e => console.error('Error en ROLLBACK:', e));
      client.release();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en POST /api/pedidos:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar el pedido',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}